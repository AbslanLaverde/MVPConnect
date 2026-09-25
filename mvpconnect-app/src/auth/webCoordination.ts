import { Platform } from 'react-native';
import { AuthRequestError } from './authErrors';
import type { SessionCoordination, SessionEvent } from './authTypes';

export const AUTH_LOCK = 'mvpconnect.auth-cookie.v1';
export const SESSION_EVENT_KEY = 'mvpconnect.session-event.v1';
export const PENDING_LOGOUT_KEY = 'mvpconnect.pending-logout.v1';
type Channel = Pick<BroadcastChannel, 'postMessage' | 'addEventListener' | 'removeEventListener'>;
export interface BrowserCoordinationHost {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  locks?: Pick<LockManager, 'request'>;
  channel?: Channel;
  listenStorage(listener: (value: string | null) => void): () => void;
}

function parseEvent(value: unknown): SessionEvent | null {
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (!data || !['SESSION_ESTABLISHED', 'SESSION_ENDED'].includes(data.type)
      || typeof data.revision !== 'string' || data.revision.length > 100
      || (data.reason !== undefined && !['EXPLICIT_SIGN_OUT', 'SESSION_EXPIRED', 'SESSION_REPLACED'].includes(data.reason))) return null;
    return { type: data.type, revision: data.revision, reason: data.reason };
  } catch { return null; }
}

/** All cookie-changing HTTP calls share this lock, including login and logout. */
export function createWebCoordination(host: BrowserCoordinationHost): SessionCoordination {
  let seen: string | null = null;
  return {
    exclusive: async (operation) => {
      // Fail closed on unsupported/insecure browsers. A localStorage lease is not an atomic lock.
      if (!host.locks) throw new AuthRequestError('AUTH_COORDINATION_UNAVAILABLE',
        'Sign in requires a browser with Web Locks support on HTTPS or localhost.');
      return host.locks.request(AUTH_LOCK, { mode: 'exclusive' }, async () => {
        host.storage.getItem(SESSION_EVENT_KEY); // Fail before HTTP if coordination storage is blocked.
        return operation();
      });
    },
    revision: () => parseEvent(host.storage.getItem(SESSION_EVENT_KEY))?.revision ?? null,
    sessionExpected: () => parseEvent(host.storage.getItem(SESSION_EVENT_KEY))?.type === 'SESSION_ESTABLISHED'
      && host.storage.getItem(PENDING_LOGOUT_KEY) !== JSON.stringify({
        revision: parseEvent(host.storage.getItem(SESSION_EVENT_KEY))?.revision ?? null,
      }),
    publish: (type, reason) => {
      // This nonce is a non-secret cookie-change revision, never a session ID or credential.
      const revision = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const event: SessionEvent = { type, revision, ...(reason ? { reason } : {}) };
      const pending = host.storage.getItem(PENDING_LOGOUT_KEY);
      const previous = parseEvent(host.storage.getItem(SESSION_EVENT_KEY))?.revision ?? null;
      host.storage.setItem(SESSION_EVENT_KEY, JSON.stringify(event));
      if (type === 'SESSION_ENDED' && pending === JSON.stringify({ revision: previous })) {
        host.storage.setItem(PENDING_LOGOUT_KEY, JSON.stringify({ revision }));
      }
      seen = revision;
      host.channel?.postMessage(event);
      return revision;
    },
    subscribe: (listener) => {
      const receive = (value: unknown) => {
        const event = parseEvent(value);
        if (!event || event.revision === seen
          || event.revision !== parseEvent(host.storage.getItem(SESSION_EVENT_KEY))?.revision) return;
        seen = event.revision;
        listener(event);
      };
      const onMessage = (event: MessageEvent) => receive(event.data);
      host.channel?.addEventListener('message', onMessage);
      const stopStorage = host.listenStorage(receive);
      return () => { stopStorage(); host.channel?.removeEventListener('message', onMessage); };
    },
    hasPendingLogout: () => host.storage.getItem(PENDING_LOGOUT_KEY)
      === JSON.stringify({ revision: parseEvent(host.storage.getItem(SESSION_EVENT_KEY))?.revision ?? null }),
    pendingLogout: (value, revision) => {
      if (value) host.storage.setItem(PENDING_LOGOUT_KEY, JSON.stringify({
        revision: revision === undefined ? parseEvent(host.storage.getItem(SESSION_EVENT_KEY))?.revision ?? null : revision,
      }));
      else host.storage.removeItem(PENDING_LOGOUT_KEY);
    },
  };
}

export const localCoordination: SessionCoordination = {
  exclusive: (operation) => operation(), revision: () => null, publish: () => null,
  sessionExpected: () => false,
  subscribe: () => () => {}, hasPendingLogout: () => false, pendingLogout: () => {},
};

export function runtimeCoordination(): SessionCoordination {
  if (Platform.OS !== 'web') return localCoordination;
  let browser: SessionCoordination | undefined;
  const get = () => {
    if (!browser) {
      if (typeof window === 'undefined') throw new AuthRequestError('AUTH_COORDINATION_UNAVAILABLE', 'A browser is required.');
      const channel = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(AUTH_LOCK);
      browser = createWebCoordination({
        storage: window.localStorage, locks: window.navigator.locks, channel,
        listenStorage: (listener) => {
          const receive = (event: StorageEvent) => { if (event.key === SESSION_EVENT_KEY) listener(event.newValue); };
          window.addEventListener('storage', receive);
          return () => window.removeEventListener('storage', receive);
        },
      });
    }
    return browser;
  };
  return {
    exclusive: (operation) => get().exclusive(operation), revision: () => get().revision(),
    sessionExpected: () => get().sessionExpected(),
    publish: (type, reason) => get().publish(type, reason), subscribe: (listener) => get().subscribe(listener),
    hasPendingLogout: () => get().hasPendingLogout(), pendingLogout: (value, revision) => get().pendingLogout(value, revision),
  };
}
