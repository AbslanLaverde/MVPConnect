import { SessionController } from '../sessionController';
import { localCoordination } from '../webCoordination';
import type { AuthTransport, CredentialStore, LoginInput, LoginResponse, SessionCoordination, SignupPersona } from '../authTypes';

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export const response = (id = 'A'): LoginResponse & { refreshToken: string } => ({
  accessToken: `access-${id}`, refreshToken: `refresh-${id}`, tokenType: 'Bearer', expiresIn: 1800,
  sessionId: `session-${id}`, userId: `user-${id}`, userType: 'MUSICIAN', email: `${id}@example.test`, name: id,
});
export const tick = async () => { for (let i = 0; i < 15; i += 1) await Promise.resolve(); };

export function fixture(kind: 'native' | 'web' = 'native', coordination: SessionCoordination = localCoordination) {
  let stored: string | null = null;
  const native = {
    kind: 'native' as const,
    getRefreshCredential: jest.fn(async () => stored),
    setRefreshCredential: jest.fn(async (value: string) => { stored = value; }),
    clearRefreshCredential: jest.fn(async () => { stored = null; }),
  };
  const credentials: CredentialStore = kind === 'native' ? native : { kind: 'web' };
  const wire = (id = 'A') => {
    const { refreshToken, ...web } = response(id);
    return kind === 'web' ? web : { ...web, refreshToken };
  };
  const transport: jest.Mocked<AuthTransport> = {
    login: jest.fn(async (_input: LoginInput) => wire()), signup: jest.fn(async (_persona: SignupPersona, _input: object) => wire()),
    refresh: jest.fn(async (_credential?: string) => ({ ...wire(), accessToken: 'access-B', ...(kind === 'native' ? { refreshToken: 'refresh-B' } : {}) })),
    logout: jest.fn(async (_credential?: string) => {}),
  };
  const resetCache = jest.fn(); const clearLegacy = jest.fn(async () => {}); const onExit = jest.fn();
  const controller = new SessionController({ transport, credentials, coordination, resetCache, clearLegacy, onExit, now: () => 1000 });
  return { controller, transport, native, resetCache, clearLegacy, onExit, wire,
    login: () => controller.login({ email: 'A@example.test', password: 'test-only' }),
    refresh: () => controller.refresh(controller.getGeneration(), controller.getTokenVersion()),
  };
}
