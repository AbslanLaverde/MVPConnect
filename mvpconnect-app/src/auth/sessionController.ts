import { AuthRequestError, isTerminalRefreshError, StaleSessionError } from './authErrors';
import type {
  AccessResponse, AuthTransport, CredentialStore, ExitReason, LoginInput, LoginResponse,
  NativeResponse, SessionCoordination, SessionIdentity, SessionSnapshot, SignupPersona, Identity,
} from './authTypes';

interface Dependencies {
  transport: AuthTransport;
  credentials: CredentialStore;
  coordination: SessionCoordination;
  clearLegacy(): Promise<void>;
  resetCache(): void;
  onExit(reason: ExitReason): void;
  now?: () => number;
}

/** Owns credentials in memory; subscribers receive only immutable, non-secret metadata. */
export class SessionController {
  private snapshot: SessionSnapshot = Object.freeze({ status: 'anonymous', generation: 0 });
  private accessToken?: string;
  private tokenVersion = 0;
  private revision: string | null = null;
  private listeners = new Set<() => void>();
  private stopCoordination?: () => void;
  private queue: Promise<unknown> = Promise.resolve();
  private refreshPromise?: Promise<string>;
  private exitPromise?: Promise<void>;
  private restorePromise?: Promise<SessionSnapshot>;
  constructor(private readonly deps: Dependencies) {}

  getSnapshot = (): SessionSnapshot => this.snapshot;
  getGeneration = (): number => this.snapshot.generation;
  getAccessToken = (): string | undefined => this.accessToken;
  getTokenVersion = (): number => this.tokenVersion;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  isCurrent = (generation: number): boolean => this.snapshot.generation === generation && this.snapshot.status === 'authenticated';
  assertGeneration = (generation: number): void => {
    if (this.snapshot.generation !== generation) throw new StaleSessionError();
  };
  private emit(snapshot: SessionSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener());
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }
  private observeTabs(): void {
    if (this.stopCoordination) return;
    this.stopCoordination = this.deps.coordination.subscribe((event) => {
      if (this.snapshot.status === 'anonymous' || event.revision === this.revision) return;
      // Never logout the newly shared cookie when a different tab replaces this session.
      const reason = event.type === 'SESSION_ENDED' ? event.reason ?? 'SESSION_REPLACED' : 'SESSION_REPLACED';
      this.invalidate(reason);
      void this.deps.clearLegacy().catch(() => {});
    });
  }
  private invalidate(reason: ExitReason): number {
    const generation = this.snapshot.generation + 1;
    this.accessToken = undefined;
    this.tokenVersion += 1;
    this.emit({ status: 'anonymous', generation, exitReason: reason });
    this.deps.resetCache();
    this.deps.onExit(reason);
    return generation;
  }
  private ownsCookie(): boolean {
    return this.deps.credentials.kind !== 'web' || this.deps.coordination.revision() === this.revision;
  }
  private async clearCredentials(): Promise<void> {
    // Local auth is already invalidated even when OS storage is temporarily unavailable.
    if (this.deps.credentials.kind === 'native') await this.deps.credentials.clearRefreshCredential().catch(() => {});
    await this.deps.clearLegacy().catch(() => {});
  }
  private async revoke(credential?: string): Promise<boolean> {
    try { await this.deps.transport.logout(credential); return true; } catch { return false; }
  }
  private async persistNative(response: AccessResponse | NativeResponse<AccessResponse>): Promise<void> {
    if (this.deps.credentials.kind !== 'native') return;
    const credential = 'refreshToken' in response ? response.refreshToken : undefined;
    if (!credential) throw new AuthRequestError('AUTH_CONTRACT_INVALID', 'No secure session credential was returned.');
    try { await this.deps.credentials.setRefreshCredential(credential); }
    catch {
      // A is already consumed after rotation. Only B may be used for this best-effort revocation.
      await this.revoke(credential);
      await this.clearCredentials();
      throw new AuthRequestError('SECURE_STORAGE_UNAVAILABLE', 'Secure session storage is unavailable. Sign in again.');
    }
  }

  private async rotateCredential(credential?: string): Promise<AccessResponse | NativeResponse<AccessResponse>> {
    const response = await this.deps.transport.refresh(credential);
    await this.persistNative(response);
    return response;
  }

  private publishAccess(response: AccessResponse, metadata: SessionSnapshot): void {
    this.accessToken = response.accessToken;
    this.tokenVersion += 1;
    this.emit({ ...metadata, status: 'authenticated', sessionId: response.sessionId,
      expiresAt: (this.deps.now?.() ?? Date.now()) + response.expiresIn * 1000 });
  }

  /** Startup only: refresh validates the persisted session; /me supplies identity afterward. */
  restore = (): Promise<SessionSnapshot> => {
    if (this.restorePromise) return this.restorePromise;
    if (this.snapshot.status === 'authenticated') return Promise.resolve(this.snapshot);
    const generation = this.snapshot.generation + 1;
    this.emit({ status: 'authenticating', generation });
    this.deps.resetCache();
    const operation = this.serial(async () => {
      // Capture ownership before any asynchronous work or waiting for another tab's lock.
      try {
        this.revision = this.deps.coordination.revision();
        this.observeTabs();
      } finally { await this.deps.clearLegacy(); }
      const pendingLogout = this.deps.credentials.kind === 'web' && this.deps.coordination.hasPendingLogout();
      const finishPendingLogout = async () => {
        if (await this.revoke()) this.deps.coordination.pendingLogout(false);
        this.revision = this.deps.coordination.publish('SESSION_ENDED', 'EXPLICIT_SIGN_OUT');
        this.assertGeneration(generation);
        this.invalidate('EXPLICIT_SIGN_OUT');
        return this.snapshot;
      };
      try { return await this.deps.coordination.exclusive(async () => {
        this.assertGeneration(generation);
        if (!this.ownsCookie()) { this.invalidate('SESSION_REPLACED'); throw new StaleSessionError(); }
        const web = this.deps.credentials.kind === 'web';
        if (web && this.deps.coordination.hasPendingLogout()) {
          // Offline explicit Sign Out must never turn into a cookie refresh on reload.
          return finishPendingLogout();
        }
        const expected = web && this.deps.coordination.sessionExpected();
        // Storage read failures are retryable at startup: A has not been consumed.
        const credential = this.deps.credentials.kind === 'native'
          ? await this.deps.credentials.getRefreshCredential() : undefined;
        this.assertGeneration(generation);
        if (credential === null) {
          this.emit({ status: 'anonymous', generation });
          return this.snapshot;
        }
        try {
          const response = await this.rotateCredential(credential);
          this.assertGeneration(generation); // B is persisted even if Sign Out cancelled startup.
          if (!this.ownsCookie()) { this.invalidate('SESSION_REPLACED'); throw new StaleSessionError(); }
          // Another tab can record explicit logout while this tab holds the network lock.
          // Never turn that marker into a new established revision and orphan its intent.
          if (web && this.deps.coordination.hasPendingLogout()) return finishPendingLogout();
          // Reuse the browser revision for the same cookie session. Restoring another tab is
          // not an account replacement and must not invalidate already authenticated tabs.
          if (web && !this.deps.coordination.sessionExpected()) {
            this.revision = this.deps.coordination.publish('SESSION_ESTABLISHED');
          }
          this.publishAccess(response, { status: 'authenticated', generation });
          return this.snapshot;
        } catch (error) {
          if (this.snapshot.generation === generation && error instanceof AuthRequestError
            && error.response.data.code === 'AUTH_CONTRACT_INVALID') {
            // The response may have consumed A. Do not retry an untrusted rotation contract.
            const revoked = await this.revoke(credential);
            if (web && !revoked) this.deps.coordination.pendingLogout(true);
            this.invalidate('SESSION_REPLACED');
            await this.clearCredentials();
            this.revision = this.deps.coordination.publish('SESSION_ENDED', 'SESSION_REPLACED');
            return this.snapshot;
          }
          if (this.snapshot.generation === generation && (isTerminalRefreshError(error)
            || error instanceof AuthRequestError && error.response.data.code === 'SECURE_STORAGE_UNAVAILABLE')) {
            const reason = isTerminalRefreshError(error) && (expected || !web) ? 'SESSION_EXPIRED' : 'SESSION_REPLACED';
            if (isTerminalRefreshError(error) && web && !expected) this.emit({ status: 'anonymous', generation });
            else this.invalidate(reason);
            await this.clearCredentials();
            this.revision = this.deps.coordination.publish('SESSION_ENDED', reason);
            return this.snapshot;
          }
          throw error; // Network/service failure retains the credential and expected-session hint.
        }
      }); } catch (error) {
        if (pendingLogout && this.snapshot.generation === generation) {
          // Even unavailable Web Locks must leave an explicitly signed-out browser logged out.
          this.invalidate('EXPLICIT_SIGN_OUT');
          return this.snapshot;
        }
        throw error;
      }
    });
    this.restorePromise = operation;
    void operation.then(() => { if (this.restorePromise === operation) this.restorePromise = undefined; },
      () => { if (this.restorePromise === operation) this.restorePromise = undefined; });
    return operation;
  };

  acceptRestoredIdentity = (generation: number, identity: Identity): void => {
    this.assertRestoredSession(generation);
    this.emit({ ...this.snapshot, ...identity });
  };
  assertRestoredSession = (generation: number): void => {
    if (!this.isCurrent(generation)) throw new StaleSessionError();
    if (!this.ownsCookie()) { this.invalidate('SESSION_REPLACED'); throw new StaleSessionError(); }
    if (this.deps.credentials.kind === 'web' && this.deps.coordination.hasPendingLogout()) {
      this.invalidate('EXPLICIT_SIGN_OUT');
      throw new StaleSessionError();
    }
  };
  rejectRestoredIdentity = (): Promise<void> => this.exit('SESSION_REPLACED');

  login = (input: LoginInput): Promise<SessionIdentity> => this.establish(() => this.deps.transport.login(input));
  signup = (persona: SignupPersona, input: object): Promise<SessionIdentity> =>
    this.establish(() => this.deps.transport.signup(persona, input));

  private establish(authenticate: () => Promise<LoginResponse | NativeResponse<LoginResponse>>): Promise<SessionIdentity> {
    const generation = this.snapshot.generation + 1;
    this.accessToken = undefined;
    this.tokenVersion += 1;
    this.emit({ status: 'authenticating', generation });
    this.deps.resetCache();
    return this.serial(() => {
      this.observeTabs();
      return this.deps.coordination.exclusive(async () => {
        this.assertGeneration(generation);
        if (this.deps.credentials.kind === 'web' && this.deps.coordination.hasPendingLogout()) {
          if (await this.revoke()) this.deps.coordination.pendingLogout(false);
        }
        const response = await authenticate();
        await this.persistNative(response);
        // Cookie replacement is observable even if Sign Out cancelled this local login meanwhile.
        this.revision = this.deps.coordination.publish('SESSION_ESTABLISHED');
        if (this.snapshot.generation !== generation) {
          if (this.deps.credentials.kind === 'web') this.deps.coordination.pendingLogout(true, this.revision);
          throw new StaleSessionError();
        }
        this.deps.coordination.pendingLogout(false);
        await this.deps.clearLegacy();
        this.assertGeneration(generation);
        const identity: SessionIdentity = {
          sessionId: response.sessionId, userId: response.userId, userType: response.userType,
          email: response.email, name: response.name, generation: generation + 1,
        };
        this.deps.resetCache();
        this.publishAccess(response, { ...identity, status: 'authenticated' });
        return identity;
      });
    }).catch((error) => {
      if (this.snapshot.generation === generation) {
        this.accessToken = undefined;
        this.emit({ status: 'anonymous', generation: generation + 1 });
        this.deps.resetCache();
        if (error instanceof AuthRequestError && error.response.data.code === 'SECURE_STORAGE_UNAVAILABLE') {
          this.deps.onExit('SESSION_REPLACED');
        }
      }
      throw error;
    });
  }

  refresh = (generation: number, failedVersion: number): Promise<string> => {
    if (!this.isCurrent(generation)) return Promise.reject(new StaleSessionError());
    // A late 401 for the old token must use the refresh that already completed.
    if (this.tokenVersion !== failedVersion && this.accessToken) return Promise.resolve(this.accessToken);
    if (this.refreshPromise) return this.refreshPromise;
    const operation = this.serial(() => this.deps.coordination.exclusive(async () => {
      if (!this.isCurrent(generation)) throw new StaleSessionError();
      if (!this.ownsCookie()) { this.invalidate('SESSION_REPLACED'); throw new StaleSessionError(); }
      try {
        let credential: string | null | undefined;
        try { credential = this.deps.credentials.kind === 'native' ? await this.deps.credentials.getRefreshCredential() : undefined; }
        catch { throw new AuthRequestError('SECURE_STORAGE_UNAVAILABLE', 'Secure session storage is unavailable. Sign in again.'); }
        if (credential === null) throw new AuthRequestError('SESSION_INVALID', 'Session credential is missing.', 401);
        const response = await this.rotateCredential(credential);
        // Save B before checking cancellation: an already queued logout must revoke B, not retry A.
        if (!this.isCurrent(generation)) throw new StaleSessionError();
        if (response.sessionId !== this.snapshot.sessionId) {
          if (this.deps.credentials.kind === 'native') {
            await this.revoke('refreshToken' in response ? response.refreshToken : undefined);
            await this.clearCredentials();
          }
          this.invalidate('SESSION_REPLACED');
          throw new StaleSessionError();
        }
        this.publishAccess(response, this.snapshot);
        return response.accessToken;
      } catch (error) {
        if (this.isCurrent(generation) && (isTerminalRefreshError(error)
          || error instanceof AuthRequestError && error.response.data.code === 'SECURE_STORAGE_UNAVAILABLE')) {
          const reason = isTerminalRefreshError(error) ? 'SESSION_EXPIRED' : 'SESSION_REPLACED';
          this.invalidate(reason);
          await this.clearCredentials();
          this.revision = this.deps.coordination.publish('SESSION_ENDED', reason);
        }
        throw error;
      }
    }));
    this.refreshPromise = operation;
    // Avoid creating an unhandled rejected promise from finally().
    void operation.then(() => { if (this.refreshPromise === operation) this.refreshPromise = undefined; },
      () => { if (this.refreshPromise === operation) this.refreshPromise = undefined; });
    return operation;
  };

  signOut = (): Promise<void> => this.exit('EXPLICIT_SIGN_OUT');
  expire = (generation: number): Promise<void> => this.isCurrent(generation) ? this.exit('SESSION_EXPIRED') : Promise.resolve();
  private exit(reason: ExitReason): Promise<void> {
    if (this.exitPromise) return this.exitPromise;
    if (this.deps.credentials.kind === 'web') {
      try { if (this.ownsCookie()) this.deps.coordination.pendingLogout(true, this.revision); } catch { /* fail closed below */ }
    }
    this.invalidate(reason); // Immediate stale-response isolation and Login reset, including offline.
    const operation = this.serial(async () => {
      try {
        await this.deps.coordination.exclusive(async () => {
          if (this.ownsCookie()) {
            if (this.deps.credentials.kind === 'web') this.deps.coordination.pendingLogout(true);
            const credential = this.deps.credentials.kind === 'native'
              ? await this.deps.credentials.getRefreshCredential().catch(() => null) : undefined;
            const revoked = await this.revoke(credential ?? undefined);
            if (revoked) this.deps.coordination.pendingLogout(false);
            this.revision = this.deps.coordination.publish('SESSION_ENDED', reason);
          }
        });
      } catch {
        // With unavailable Web coordination, never race the shared cookie. Retain logout intent.
        if (this.deps.credentials.kind === 'web') {
          try { this.deps.coordination.pendingLogout(true); } catch { /* storage is unavailable */ }
        }
      } finally { await this.clearCredentials(); }
    });
    this.exitPromise = operation;
    void operation.then(() => { if (this.exitPromise === operation) this.exitPromise = undefined; });
    return operation;
  }
}
