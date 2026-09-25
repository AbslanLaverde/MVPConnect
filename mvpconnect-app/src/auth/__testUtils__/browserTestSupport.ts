import { createWebCoordination, type BrowserCoordinationHost } from '../webCoordination';

export function browserFixture() {
  const values = new Map<string, string>();
  const listeners = new Set<(value: string | null) => void>();
  let queue = Promise.resolve<unknown>(undefined);
  const request = jest.fn((_name, _options, action) => {
    const run = queue.then(action); queue = run.catch(() => {}); return run;
  });
  const host: BrowserCoordinationHost = {
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    },
    locks: { request } as unknown as LockManager,
    listenStorage: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  return { values, host, request, coordinator: () => createWebCoordination(host),
    deliver: (value: string | null) => listeners.forEach((listener) => listener(value)) };
}
