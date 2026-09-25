import type { SessionController } from './sessionController';
import type { StartupLink } from '../navigation/startupLink';
import type { StartupRoute } from './startupEntry';

export type BootstrapState = { status: 'RESTORING' | 'ERROR_RETRYABLE' }
  | { status: 'READY_UNAUTHENTICATED' | 'READY_AUTHENTICATED'; route: StartupRoute };

interface Dependencies {
  session: SessionController;
  captureLink(): Promise<StartupLink>;
  loadEntry(): Promise<StartupRoute>;
}

/** One launch boundary. It stops observing once navigation takes ownership of the active flow. */
export class SessionBootstrap {
  private state: BootstrapState = { status: 'RESTORING' };
  private listeners = new Set<() => void>();
  private intent?: Promise<StartupLink>;
  private operation?: Promise<void>;
  private stopSession?: () => void;
  private attempt = 0;
  private released = false;
  constructor(private readonly deps: Dependencies) {}
  getSnapshot = (): BootstrapState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private emit(state: BootstrapState): void {
    if (this.released) return;
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  private login(link: StartupLink = null): void {
    const reason = this.deps.session.getSnapshot().exitReason;
    this.emit({ status: 'READY_UNAUTHENTICATED', route: reason === 'SESSION_EXPIRED'
      ? { name: 'Login', params: { sessionNotice: 'SESSION_EXPIRED' } }
      : { name: reason === 'EXPLICIT_SIGN_OUT' ? 'Login' : link && 'auth' in link ? link.auth : 'Login' } });
  }
  start = (): Promise<void> => {
    if (this.operation) return this.operation;
    if (this.released || this.state.status.startsWith('READY_')) return Promise.resolve();
    const attempt = ++this.attempt;
    this.emit({ status: 'RESTORING' });
    if (!this.stopSession) this.stopSession = this.deps.session.subscribe(() => {
      const snapshot = this.deps.session.getSnapshot();
      if (snapshot.status === 'anonymous' && snapshot.exitReason) this.login();
    });
    // Capture once, retain only validated non-secret intent across retries.
    if (!this.intent) this.intent = this.deps.captureLink().catch((error) => {
      this.intent = undefined;
      throw error;
    });
    const operation = (async () => {
      try {
        const [link, restored] = await Promise.all([this.intent, this.deps.session.restore()]);
        if (attempt !== this.attempt || this.released) return;
        if (restored.status !== 'authenticated') { this.login(link); return; }
        const route = await this.deps.loadEntry();
        if (attempt !== this.attempt || this.released) return;
        if (!this.deps.session.isCurrent(restored.generation)) { this.login(); return; }
        this.deps.session.assertRestoredSession(restored.generation);
        this.emit({ status: 'READY_AUTHENTICATED', route: link && 'oauth' in link
          ? { name: 'OAuthResult', params: link.oauth } : route });
      } catch {
        if (attempt !== this.attempt || this.released) return;
        const snapshot = this.deps.session.getSnapshot();
        if (snapshot.status === 'anonymous' && snapshot.exitReason) this.login();
        else this.emit({ status: 'ERROR_RETRYABLE' });
      }
    })();
    this.operation = operation;
    void operation.then(() => { if (this.operation === operation) this.operation = undefined; });
    return operation;
  };
  signOut = (): void => {
    this.attempt += 1;
    void this.deps.session.signOut(); // Shared exit clears memory/cache immediately, including offline.
    this.login();
  };
  release = (): void => {
    this.released = true;
    this.stopSession?.();
    this.stopSession = undefined;
  };
}
