import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRequestError, StaleSessionError } from '../authErrors';
import { clearLegacyAuth } from '../legacyStorage';
import { AUTH_LOCK, SESSION_EVENT_KEY } from '../webCoordination';
import { browserFixture } from '../__testUtils__/browserTestSupport';
import { deferred, fixture, tick } from '../__testUtils__/sessionTestSupport';

const invalid = () => new AuthRequestError('SESSION_INVALID', 'Invalid', 401);
const unavailable = () => new AuthRequestError('AUTH_SERVICE_UNAVAILABLE', 'Unavailable', 503);

it('deletes legacy keys without reading/exchanging the old bearer when Native has no new credential', async () => {
  await AsyncStorage.multiSet([['authToken', 'legacy-bearer'], ['userType', 'MUSICIAN']]);
  const f = fixture(); f.clearLegacy.mockImplementation(clearLegacyAuth);
  const get = jest.spyOn(AsyncStorage, 'getItem'); get.mockClear();
  expect((await f.controller.restore()).status).toBe('anonymous');
  expect(get).not.toHaveBeenCalled();
  expect(await AsyncStorage.multiGet(['authToken', 'userType'])).toEqual([['authToken', null], ['userType', null]]);
  expect(f.transport.refresh).not.toHaveBeenCalled(); expect(f.transport.login).not.toHaveBeenCalled();
  expect(f.onExit).not.toHaveBeenCalled();
});

it('shares startup restoration and persists Native B before publishing memory access', async () => {
  const f = fixture(); await f.native.setRefreshCredential('refresh-A');
  const write = deferred<void>(); f.native.setRefreshCredential.mockReturnValueOnce(write.promise);
  const first = f.controller.restore(); expect(f.controller.restore()).toBe(first);
  await tick();
  expect(f.transport.refresh).toHaveBeenCalledWith('refresh-A');
  expect(f.native.setRefreshCredential).toHaveBeenLastCalledWith('refresh-B');
  expect(f.controller.getAccessToken()).toBeUndefined();
  write.resolve(); const restored = await first;
  expect(restored).toMatchObject({ status: 'authenticated', sessionId: 'session-A' });
  expect(f.controller.getAccessToken()).toBe('access-B');
  expect(JSON.stringify(restored)).not.toMatch(/access-B|refresh-B/);
  await f.controller.restore(); expect(f.transport.refresh).toHaveBeenCalledTimes(1);
});

it('clears invalid Native credentials/cache and emits expiry once', async () => {
  const f = fixture(); await f.native.setRefreshCredential('refresh-A');
  f.transport.refresh.mockRejectedValueOnce(invalid());
  const restored = await f.controller.restore();
  expect(restored.exitReason).toBe('SESSION_EXPIRED');
  expect(await f.native.getRefreshCredential()).toBeNull();
  expect(f.resetCache).toHaveBeenCalled(); expect(f.onExit).toHaveBeenCalledTimes(1);
  expect(f.controller.getAccessToken()).toBeUndefined();
});

it.each(['network', 'storage'] as const)('retains Native A on temporary %s failure, then retries successfully', async (failure) => {
  const f = fixture(); await f.native.setRefreshCredential('refresh-A');
  if (failure === 'network') f.transport.refresh.mockRejectedValueOnce(unavailable());
  else f.native.getRefreshCredential.mockRejectedValueOnce(new Error('device locked'));
  await expect(f.controller.restore()).rejects.toBeInstanceOf(Error);
  expect(await f.native.getRefreshCredential()).toBe('refresh-A');
  expect(f.native.clearRefreshCredential).not.toHaveBeenCalled(); expect(f.onExit).not.toHaveBeenCalled();
  expect((await f.controller.restore()).status).toBe('authenticated');
});

it('fails closed on Native B write failure and revokes B instead of retrying A', async () => {
  const f = fixture(); await f.native.setRefreshCredential('refresh-A');
  f.native.setRefreshCredential.mockRejectedValueOnce(new Error('storage unavailable'));
  expect((await f.controller.restore()).exitReason).toBe('SESSION_REPLACED');
  expect(f.transport.logout).toHaveBeenCalledWith('refresh-B');
  expect(f.controller.getAccessToken()).toBeUndefined();
  expect(await f.native.getRefreshCredential()).toBeNull();
});

it('Sign Out during Native startup revokes persisted B and cannot resurrect access', async () => {
  const f = fixture(); await f.native.setRefreshCredential('refresh-A');
  const remote = deferred<any>(); f.transport.refresh.mockReturnValueOnce(remote.promise);
  const restoring = f.controller.restore().catch((error) => error); await tick();
  const exiting = f.controller.signOut(); remote.resolve({ ...f.wire(), refreshToken: 'refresh-B' });
  await exiting;
  expect(await restoring).toBeInstanceOf(StaleSessionError);
  expect(f.transport.logout).toHaveBeenCalledWith('refresh-B');
  expect(f.controller.getAccessToken()).toBeUndefined();
});

it.each([false, true])('Web invalid session has expiry only when expected=%s, and clears the hint', async (expected) => {
  const browser = browserFixture(); const coordination = browser.coordinator();
  if (expected) coordination.publish('SESSION_ESTABLISHED');
  const f = fixture('web', coordination); f.transport.refresh.mockRejectedValueOnce(invalid());
  const restored = await f.controller.restore();
  expect(restored.status).toBe('anonymous');
  expect(restored.exitReason).toBe(expected ? 'SESSION_EXPIRED' : undefined);
  expect(coordination.sessionExpected()).toBe(false);
  expect(f.transport.refresh).toHaveBeenCalledTimes(1);
  expect(f.transport.refresh).toHaveBeenCalledWith(undefined);
  expect(f.native.getRefreshCredential).not.toHaveBeenCalled();
});

it.each([false, true])('pending Web logout wins over restoration when logout fails=%s', async (fails) => {
  const browser = browserFixture(); const coordination = browser.coordinator();
  coordination.publish('SESSION_ESTABLISHED'); coordination.pendingLogout(true);
  const f = fixture('web', coordination);
  if (fails) f.transport.logout.mockRejectedValueOnce(unavailable());
  expect((await f.controller.restore()).exitReason).toBe('EXPLICIT_SIGN_OUT');
  expect(f.transport.refresh).not.toHaveBeenCalled(); expect(f.transport.logout).toHaveBeenCalledTimes(1);
  expect(coordination.hasPendingLogout()).toBe(fails); expect(coordination.sessionExpected()).toBe(false);
  expect(browser.request).toHaveBeenCalledWith(AUTH_LOCK, { mode: 'exclusive' }, expect.any(Function));
  expect(f.controller.getAccessToken()).toBeUndefined();
});

it('temporary Web failure preserves the hint and retries under the same auth lock', async () => {
  const browser = browserFixture(); const coordination = browser.coordinator();
  const revision = coordination.publish('SESSION_ESTABLISHED'); const f = fixture('web', coordination);
  f.transport.refresh.mockRejectedValueOnce(unavailable());
  await expect(f.controller.restore()).rejects.toBeInstanceOf(AuthRequestError);
  expect(coordination.revision()).toBe(revision); expect(coordination.sessionExpected()).toBe(true);
  expect(f.onExit).not.toHaveBeenCalled(); expect(f.transport.logout).not.toHaveBeenCalled();
  await f.controller.restore(); expect(f.controller.getAccessToken()).toBe('access-B');
  expect(coordination.revision()).toBe(revision); expect(browser.request).toHaveBeenCalledTimes(2);
  expect([...browser.values.values()].join('')).not.toMatch(/access-B|refresh-B|session-A|user-A/);
});

it('stays locally signed out when pending Web logout cannot acquire a supported lock', async () => {
  const browser = browserFixture(); const coordination = browser.coordinator(); coordination.pendingLogout(true);
  browser.host.locks = undefined;
  const f = fixture('web', coordination);
  expect((await f.controller.restore()).exitReason).toBe('EXPLICIT_SIGN_OUT');
  expect(coordination.hasPendingLogout()).toBe(true);
  expect(f.transport.refresh).not.toHaveBeenCalled(); expect(f.transport.logout).not.toHaveBeenCalled();
});

it('honors another tab recording Sign Out while startup refresh is in flight', async () => {
  const browser = browserFixture(); const coordination = browser.coordinator(); coordination.publish('SESSION_ESTABLISHED');
  const f = fixture('web', coordination); const remote = deferred<any>();
  f.transport.refresh.mockReturnValueOnce(remote.promise); f.transport.logout.mockRejectedValueOnce(unavailable());
  const restoring = f.controller.restore(); await tick();
  browser.coordinator().pendingLogout(true); remote.resolve(f.wire());
  expect((await restoring).exitReason).toBe('EXPLICIT_SIGN_OUT');
  expect(f.controller.getAccessToken()).toBeUndefined(); expect(coordination.hasPendingLogout()).toBe(true);
  expect(coordination.sessionExpected()).toBe(false); expect(f.transport.logout).toHaveBeenCalledTimes(1);
});

it('successful Web restoration establishes a non-secret expected-session hint if absent', async () => {
  const browser = browserFixture(); const coordination = browser.coordinator(); const f = fixture('web', coordination);
  await f.controller.restore(); expect(coordination.sessionExpected()).toBe(true);
  expect(Object.keys(JSON.parse(browser.values.get(SESSION_EVENT_KEY)!)).sort()).toEqual(['revision', 'type']);
});

it('two restoring Web tabs serialize refresh and reuse the browser revision without replacement', async () => {
  const browser = browserFixture(); const a = browser.coordinator(); const b = browser.coordinator();
  const revision = a.publish('SESSION_ESTABLISHED'); const first = fixture('web', a); const second = fixture('web', b);
  const remote = deferred<any>(); first.transport.refresh.mockReturnValueOnce(remote.promise);
  const one = first.controller.restore(); const two = second.controller.restore(); await tick();
  expect(first.transport.refresh).toHaveBeenCalledTimes(1); expect(second.transport.refresh).not.toHaveBeenCalled();
  remote.resolve(first.wire()); await Promise.all([one, two]);
  browser.deliver(browser.values.get(SESSION_EVENT_KEY)!);
  expect(a.revision()).toBe(revision); expect(first.onExit).not.toHaveBeenCalled(); expect(second.onExit).not.toHaveBeenCalled();
  expect(first.controller.getSnapshot().status).toBe('authenticated'); expect(second.controller.getSnapshot().status).toBe('authenticated');
});

it('rejects a replacement that happened while startup waited for the lock, even with delayed events', async () => {
  const browser = browserFixture(); const a = browser.coordinator(); const b = browser.coordinator();
  a.publish('SESSION_ESTABLISHED'); const f = fixture('web', a); const gate = deferred<void>();
  const replacing = b.exclusive(async () => { await gate.promise; b.publish('SESSION_ESTABLISHED'); });
  const restoring = f.controller.restore().catch((error) => error); await tick(); gate.resolve(); await replacing;
  expect(await restoring).toBeInstanceOf(StaleSessionError); expect(f.transport.refresh).not.toHaveBeenCalled();
  expect(f.controller.getAccessToken()).toBeUndefined(); expect(f.onExit).toHaveBeenCalledWith('SESSION_REPLACED');
});

it('cannot publish restored access after receiving a cross-tab replacement event', async () => {
  const browser = browserFixture(); const a = browser.coordinator(); const b = browser.coordinator();
  a.publish('SESSION_ESTABLISHED'); const f = fixture('web', a); const remote = deferred<any>();
  f.transport.refresh.mockReturnValueOnce(remote.promise);
  const restoring = f.controller.restore().catch((error) => error); await tick();
  b.publish('SESSION_ESTABLISHED'); browser.deliver(browser.values.get(SESSION_EVENT_KEY)!);
  remote.resolve(f.wire()); expect(await restoring).toBeInstanceOf(StaleSessionError);
  expect(f.controller.getAccessToken()).toBeUndefined(); expect(f.transport.logout).not.toHaveBeenCalled();
});

it('does not retry a malformed rotation response as though the consumed credential were valid', async () => {
  const f = fixture(); await f.native.setRefreshCredential('refresh-A');
  f.transport.refresh.mockRejectedValueOnce(new AuthRequestError('AUTH_CONTRACT_INVALID', 'Invalid response'));
  expect((await f.controller.restore()).exitReason).toBe('SESSION_REPLACED');
  expect(await f.native.getRefreshCredential()).toBeNull();
  expect(f.controller.getAccessToken()).toBeUndefined(); expect(f.transport.refresh).toHaveBeenCalledTimes(1);
});
