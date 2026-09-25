import { AuthRequestError, StaleSessionError } from '../authErrors';
import { localCoordination } from '../webCoordination';
import { deferred, fixture, response, tick } from '../__testUtils__/sessionTestSupport';
import type { SessionEvent } from '../authTypes';

describe.each(['web', 'native'] as const)('%s session controller', (platform) => {
  it('establishes memory-only access and exposes only immutable identity metadata', async () => {
    const f = fixture(platform); const notices = jest.fn(); f.controller.subscribe(notices);
    const identity = await f.login();
    expect(identity.generation).toBeGreaterThan(0);
    expect(f.controller.getAccessToken()).toBe('access-A');
    expect(JSON.stringify(f.controller.getSnapshot())).not.toMatch(/access-A|refresh-A/);
    expect(Object.isFrozen(f.controller.getSnapshot())).toBe(true);
    expect(identity).not.toHaveProperty('accessToken');
    expect(identity).not.toHaveProperty('refreshToken');
    expect(f.controller.getSnapshot().expiresAt).toBe(1801000);
    expect(f.clearLegacy).toHaveBeenCalled();
    expect(f.resetCache).toHaveBeenCalled();
    expect(notices).toHaveBeenCalled();
    expect(f.native.setRefreshCredential).toHaveBeenCalledTimes(platform === 'native' ? 1 : 0);
  });

  it('shares one refresh across eight requests and reuses it for a late old-token 401', async () => {
    const f = fixture(platform); await f.login();
    const pending = deferred<any>(); f.transport.refresh.mockReturnValueOnce(pending.promise);
    const version = f.controller.getTokenVersion(); const generation = f.controller.getGeneration();
    const waiting = Array.from({ length: 8 }, () => f.controller.refresh(generation, version));
    await tick(); expect(f.transport.refresh).toHaveBeenCalledTimes(1);
    pending.resolve({ ...f.wire(), accessToken: 'access-B', ...(platform === 'native' ? { refreshToken: 'refresh-B' } : {}) });
    expect(await Promise.all(waiting)).toEqual(Array(8).fill('access-B'));
    expect(await f.controller.refresh(generation, version)).toBe('access-B');
    expect(f.transport.refresh).toHaveBeenCalledTimes(1);
    expect(f.controller.getGeneration()).toBe(generation);
  });

  it('clears the flight after temporary failure without falsely reporting session expiry', async () => {
    const f = fixture(platform); await f.login();
    f.transport.refresh.mockRejectedValueOnce(new AuthRequestError('AUTH_SERVICE_UNAVAILABLE', 'Unavailable', 503));
    await expect(f.refresh()).rejects.toBeInstanceOf(AuthRequestError);
    expect(f.onExit).not.toHaveBeenCalled();
    expect(f.controller.getAccessToken()).toBe('access-A');
    await expect(f.refresh()).resolves.toBe('access-B');
    expect(f.transport.refresh).toHaveBeenCalledTimes(2);
  });

  it('exits once on terminal refresh failure and isolates stale requests', async () => {
    const f = fixture(platform); await f.login();
    const generation = f.controller.getGeneration(); const version = f.controller.getTokenVersion();
    f.transport.refresh.mockRejectedValue(new AuthRequestError('SESSION_INVALID', 'Invalid session', 401));
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => f.controller.refresh(generation, version)));
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(f.onExit).toHaveBeenCalledTimes(1);
    expect(f.onExit).toHaveBeenCalledWith('SESSION_EXPIRED');
    expect(f.controller.getAccessToken()).toBeUndefined();
    expect(() => f.controller.assertGeneration(generation)).toThrow(StaleSessionError);
    expect(f.native.clearRefreshCredential).toHaveBeenCalledTimes(platform === 'native' ? 1 : 0);
    await f.controller.expire(generation);
    expect(f.onExit).toHaveBeenCalledTimes(1);
  });

  it('explicit Sign Out clears state immediately even when remote logout fails', async () => {
    const f = fixture(platform); await f.login();
    f.transport.logout.mockRejectedValueOnce(new Error('offline'));
    const old = f.controller.getGeneration(); const exiting = f.controller.signOut();
    expect(f.controller.getAccessToken()).toBeUndefined();
    expect(f.controller.getGeneration()).toBeGreaterThan(old);
    expect(f.onExit).toHaveBeenCalledWith('EXPLICIT_SIGN_OUT');
    expect(f.controller.signOut()).toBe(exiting);
    await exiting;
    expect(f.transport.logout).toHaveBeenCalledTimes(1);
    expect(f.onExit).not.toHaveBeenCalledWith('SESSION_EXPIRED');
  });

  it('invalidates old account responses and resets cache before publishing replacement identity', async () => {
    const f = fixture(platform); const a = await f.login();
    const checkPublish = jest.fn(() => {
      if (f.controller.getSnapshot().userId === 'user-B') expect(f.resetCache).toHaveBeenCalled();
    });
    f.controller.subscribe(checkPublish); f.resetCache.mockClear();
    f.transport.login.mockResolvedValueOnce(f.wire('B'));
    const b = await f.login();
    expect(b.generation).toBeGreaterThan(a.generation);
    expect(() => f.controller.assertGeneration(a.generation)).toThrow(StaleSessionError);
    expect(f.controller.isCurrent(b.generation)).toBe(true);
    expect(f.controller.getAccessToken()).toBe('access-B');
  });
});

describe('Native rotation ordering', () => {
  it.each(['login', 'signup'] as const)('%s does not authenticate until SecureStore succeeds', async (action) => {
    const f = fixture(); const write = deferred<void>(); f.native.setRefreshCredential.mockReturnValueOnce(write.promise);
    const pending = action === 'login' ? f.login() : f.controller.signup('venue', {});
    await tick(); expect(f.controller.getAccessToken()).toBeUndefined();
    expect(f.controller.getSnapshot().status).toBe('authenticating');
    write.resolve(); await pending;
    expect(f.controller.getAccessToken()).toBe('access-A');
  });
  it('persists B before publishing new access or releasing waiters', async () => {
    const f = fixture(); await f.login();
    const write = deferred<void>(); f.native.setRefreshCredential.mockReturnValueOnce(write.promise);
    const result = f.refresh(); await tick();
    expect(f.native.getRefreshCredential).toHaveBeenCalled();
    expect(f.transport.refresh).toHaveBeenCalledWith('refresh-A');
    expect(f.native.setRefreshCredential).toHaveBeenLastCalledWith('refresh-B');
    expect(f.controller.getAccessToken()).toBe('access-A');
    write.resolve(); await result;
    expect(f.controller.getAccessToken()).toBe('access-B');
  });
  it('revokes B and exits on SecureStore failure without ever retrying consumed A', async () => {
    const f = fixture(); await f.login();
    f.native.setRefreshCredential.mockRejectedValueOnce(new Error('device storage failure'));
    await expect(f.refresh()).rejects.toBeInstanceOf(AuthRequestError);
    expect(f.transport.logout).toHaveBeenCalledWith('refresh-B');
    expect(f.transport.refresh).toHaveBeenCalledTimes(1);
    expect(f.native.clearRefreshCredential).toHaveBeenCalled();
    expect(f.controller.getAccessToken()).toBeUndefined();
    expect(f.onExit).toHaveBeenCalledWith('SESSION_REPLACED');
  });
  it('serializes logout behind an in-flight rotation and revokes B while discarding its access token', async () => {
    const f = fixture(); await f.login();
    const rotating = deferred<any>(); f.transport.refresh.mockReturnValueOnce(rotating.promise);
    const refresh = f.refresh(); const caught = refresh.catch((error) => error);
    await tick(); const logout = f.controller.signOut();
    expect(f.controller.getAccessToken()).toBeUndefined();
    rotating.resolve({ ...response(), accessToken: 'access-B', refreshToken: 'refresh-B' });
    await logout;
    expect(await caught).toBeInstanceOf(StaleSessionError);
    expect(f.transport.logout).toHaveBeenCalledWith('refresh-B');
    expect(f.native.clearRefreshCredential).toHaveBeenCalled();
    expect(f.controller.getAccessToken()).toBeUndefined();
  });
  it('handles a missing native refresh credential as terminal', async () => {
    const f = fixture(); await f.login(); f.native.getRefreshCredential.mockResolvedValueOnce(null);
    await expect(f.refresh()).rejects.toBeInstanceOf(AuthRequestError);
    expect(f.transport.refresh).not.toHaveBeenCalled();
    expect(f.onExit).toHaveBeenCalledWith('SESSION_EXPIRED');
  });
  it('fails closed when OS secure storage cannot be read', async () => {
    const f = fixture(); await f.login(); f.native.getRefreshCredential.mockRejectedValueOnce(new Error('OS unavailable'));
    await expect(f.refresh()).rejects.toBeInstanceOf(AuthRequestError);
    expect(f.transport.refresh).not.toHaveBeenCalled();
    expect(f.controller.getAccessToken()).toBeUndefined();
    expect(f.onExit).toHaveBeenCalledWith('SESSION_REPLACED');
  });
  it('cannot resurrect a login that was cancelled by Sign Out', async () => {
    const f = fixture(); const pending = deferred<any>(); f.transport.login.mockReturnValueOnce(pending.promise);
    const login = f.login().catch((error) => error); await tick();
    const logout = f.controller.signOut(); pending.resolve(response());
    await logout;
    expect(await login).toBeInstanceOf(StaleSessionError);
    expect(f.transport.logout).toHaveBeenCalledWith('refresh-A');
    expect(f.controller.getAccessToken()).toBeUndefined();
    expect(await f.native.getRefreshCredential()).toBeNull();
  });
});

it('invalidates a tab on replacement without revoking another account cookie', async () => {
  let listener!: (event: SessionEvent) => void;
  const coordination = { ...localCoordination, subscribe: (next: typeof listener) => { listener = next; return () => {}; } };
  const f = fixture('web', coordination); await f.login();
  listener({ type: 'SESSION_ESTABLISHED', revision: 'different-browser-session' });
  expect(f.controller.getAccessToken()).toBeUndefined();
  expect(f.onExit).toHaveBeenCalledWith('SESSION_REPLACED');
  expect(f.transport.logout).not.toHaveBeenCalled();
});
