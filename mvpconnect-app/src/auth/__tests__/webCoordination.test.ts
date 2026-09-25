import { createWebCoordination, AUTH_LOCK, PENDING_LOGOUT_KEY, SESSION_EVENT_KEY, type BrowserCoordinationHost } from '../webCoordination';
import { deferred, fixture, tick } from '../__testUtils__/sessionTestSupport';

function browser() {
  const values = new Map<string, string>();
  let queue = Promise.resolve<unknown>(undefined);
  const listeners: Array<(value: string | null) => void> = [];
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const request = jest.fn((_name, _options, action) => {
    const run = queue.then(action); queue = run.catch(() => {}); return run;
  });
  const host: BrowserCoordinationHost = {
    storage, locks: { request } as any,
    listenStorage: (listener) => { listeners.push(listener); return () => {}; },
  };
  return { host, values, request, listeners };
}

it('serializes two tabs so rotating A -> B completes before B -> C begins', async () => {
  const shared = browser();
  const a = createWebCoordination(shared.host); const b = createWebCoordination(shared.host);
  const network = deferred<void>(); const submitted: string[] = []; let cookie = 'A';
  const first = a.exclusive(async () => { submitted.push(cookie); await network.promise; cookie = 'B'; });
  const second = b.exclusive(async () => { submitted.push(cookie); cookie = 'C'; });
  await tick(); expect(submitted).toEqual(['A']);
  network.resolve(); await Promise.all([first, second]);
  expect(submitted).toEqual(['A', 'B']); expect(cookie).toBe('C');
  expect(shared.request.mock.calls.every(([name, options]) => name === AUTH_LOCK && options.mode === 'exclusive')).toBe(true);
  expect([...shared.values.values()].join('')).not.toMatch(/accessToken|refreshToken/);
});

it('fails closed without Web Locks and never calls authentication transport', async () => {
  const shared = browser(); shared.host.locks = undefined;
  const f = fixture('web', createWebCoordination(shared.host));
  await expect(f.login()).rejects.toThrow('Web Locks'); expect(f.transport.login).not.toHaveBeenCalled();
  expect(f.controller.getAccessToken()).toBeUndefined();
});

it('supports non-secret storage events when BroadcastChannel is unavailable and deduplicates revisions', () => {
  const shared = browser(); const a = createWebCoordination(shared.host); const b = createWebCoordination(shared.host);
  const listener = jest.fn(); b.subscribe(listener);
  a.publish('SESSION_ESTABLISHED'); const event = shared.values.get(SESSION_EVENT_KEY)!;
  shared.listeners[0](event); shared.listeners[0](event);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(Object.keys(JSON.parse(event)).sort()).toEqual(['revision', 'type']);
});

it('records offline logout immediately, preserves it across reload, and cleans it before a new login', async () => {
  const shared = browser(); const coordination = createWebCoordination(shared.host);
  const f = fixture('web', coordination); await f.login();
  f.transport.logout.mockRejectedValueOnce(new Error('offline'));
  const exiting = f.controller.signOut();
  expect(shared.values.has(PENDING_LOGOUT_KEY)).toBe(true);
  await exiting;
  const reloaded = createWebCoordination(shared.host);
  expect(reloaded.hasPendingLogout()).toBe(true);
  const next = fixture('web', reloaded); await next.login();
  expect(next.transport.logout).toHaveBeenCalledTimes(1);
  expect(next.transport.logout.mock.invocationCallOrder[0]).toBeLessThan(next.transport.login.mock.invocationCallOrder[0]);
  expect(reloaded.hasPendingLogout()).toBe(false);
  expect([...shared.values.values()].join('')).not.toMatch(/access-A|refresh-A|session-A|user-A/);
});

it('clears pending logout after safe replacement even if its preliminary remote logout fails', async () => {
  const shared = browser(); const coordination = createWebCoordination(shared.host); coordination.pendingLogout(true);
  const f = fixture('web', coordination); f.transport.logout.mockRejectedValueOnce(new Error('offline'));
  await f.login(); expect(coordination.hasPendingLogout()).toBe(false);
  expect(f.controller.getAccessToken()).toBe('access-A');
});

it('checks the browser revision under lock before an old tab can refresh or revoke the new cookie', async () => {
  const shared = browser(); const a = createWebCoordination(shared.host); const b = createWebCoordination(shared.host);
  const f = fixture('web', a); await f.login();
  b.publish('SESSION_ESTABLISHED'); // Simulates delayed BroadcastChannel/storage event delivery.
  await expect(f.refresh()).rejects.toThrow('previous session');
  expect(f.transport.refresh).not.toHaveBeenCalled();
  await f.controller.signOut(); expect(f.transport.logout).not.toHaveBeenCalled();
});

it('retains logout intent when Sign Out cancels an in-flight Web login', async () => {
  const shared = browser(); const coordination = createWebCoordination(shared.host);
  const marker = jest.spyOn(coordination, 'pendingLogout');
  const f = fixture('web', coordination); const signingIn = deferred<any>(); const remoteLogout = deferred<void>();
  f.transport.login.mockReturnValueOnce(signingIn.promise); f.transport.logout.mockReturnValueOnce(remoteLogout.promise);
  const login = f.login().catch((error) => error); await tick();
  const logout = f.controller.signOut(); signingIn.resolve(f.wire()); await tick();
  expect(f.controller.getAccessToken()).toBeUndefined();
  expect(coordination.hasPendingLogout()).toBe(true);
  expect(marker).not.toHaveBeenCalledWith(false);
  remoteLogout.resolve(); await logout; await login;
  expect(coordination.hasPendingLogout()).toBe(false);
});
