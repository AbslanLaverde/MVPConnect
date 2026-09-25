export type Persona = 'MUSICIAN' | 'VENUE' | 'PROMOTER';
export type SignupPersona = 'musician' | 'venue' | 'promoter';
export type ExitReason = 'EXPLICIT_SIGN_OUT' | 'SESSION_EXPIRED' | 'SESSION_REPLACED';
export type SessionNotice = 'SESSION_EXPIRED';
export interface LoginInput { email: string; password: string }
export interface AccessResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  sessionId: string;
}
export interface Identity {
  userId: string;
  userType: Persona;
  email: string;
  name?: string;
}
export type LoginResponse = AccessResponse & Identity;
export type NativeResponse<T> = T & { refreshToken: string };
export type SessionIdentity = Identity & { sessionId: string; generation: number };
export interface SessionSnapshot extends Partial<Identity> {
  readonly status: 'anonymous' | 'authenticating' | 'authenticated' | 'exiting';
  readonly generation: number;
  readonly sessionId?: string;
  readonly expiresAt?: number;
}
export interface NativeCredentialStore {
  readonly kind: 'native';
  getRefreshCredential(): Promise<string | null>;
  setRefreshCredential(value: string): Promise<void>;
  clearRefreshCredential(): Promise<void>;
}
// Web deliberately has no readable refresh-secret API.
export type CredentialStore = NativeCredentialStore | { readonly kind: 'web' };
export interface AuthTransport {
  login(input: LoginInput): Promise<LoginResponse | NativeResponse<LoginResponse>>;
  signup(persona: SignupPersona, input: object): Promise<LoginResponse | NativeResponse<LoginResponse>>;
  refresh(credential?: string): Promise<AccessResponse | NativeResponse<AccessResponse>>;
  logout(credential?: string): Promise<void>;
}
export interface SessionEvent {
  type: 'SESSION_ESTABLISHED' | 'SESSION_ENDED';
  revision: string;
  reason?: ExitReason;
}
export interface SessionCoordination {
  exclusive<T>(operation: () => Promise<T>): Promise<T>;
  revision(): string | null;
  publish(type: SessionEvent['type'], reason?: ExitReason): string | null;
  subscribe(listener: (event: SessionEvent) => void): () => void;
  hasPendingLogout(): boolean;
  pendingLogout(value: boolean, revision?: string | null): void;
}
