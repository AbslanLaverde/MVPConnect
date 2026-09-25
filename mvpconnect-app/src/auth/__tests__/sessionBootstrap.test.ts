import { SessionBootstrap } from '../sessionBootstrap';
import { AuthRequestError } from '../authErrors';
import { fixture, deferred, tick } from '../__testUtils__/sessionTestSupport';
import { browserFixture } from '../__testUtils__/browserTestSupport';
import type { StartupLink } from '../../navigation/startupLink';

const oauth: StartupLink = { oauth: { attemptId: 'safe-attempt', provider: 'YOUTUBE', status: 'SUCCEEDED' } };
function setup(link: StartupLink = null) {
  const browser = browserFixture(); const coordination = browser.coordinator(); const f = fixture('web', coordination);
  const loadEntry = jest.fn(async () => ({ name: 'AuthenticatedApp' as const, params: { screen: 'ArtistHome' as const } }));
  const captureLink = jest.fn(async () => link);
  const bootstrap = new SessionBootstrap({ session: f.controller, captureLink, loadEntry });
  return { ...f, bootstrap, coordination, captureLink, loadEntry };
}

it('keeps startup pending until both the initial link and fresh state resolve', async () => {
  const f = setup(); const link = deferred<StartupLink>(); f.captureLink.mockReturnValueOnce(link.promise);
  const loading = f.bootstrap.start(); await tick();
  expect(f.controller.getSnapshot().status).toBe('authenticated');
  expect(f.bootstrap.getSnapshot().status).toBe('RESTORING'); expect(f.loadEntry).not.toHaveBeenCalled();
  link.resolve(oauth); await loading;
  expect(f.bootstrap.getSnapshot()).toMatchObject({ route: { name: 'OAuthResult', params: (oauth as { oauth: object }).oauth } });
  f.bootstrap.release();
});

it('does not poll or enter OAuthResult when cold return has no valid application session', async () => {
  const f = setup(oauth); f.transport.refresh.mockRejectedValueOnce(new AuthRequestError('SESSION_INVALID', 'Invalid', 401));
  await f.bootstrap.start();
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_UNAUTHENTICATED', route: { name: 'Login' } });
  expect(f.loadEntry).not.toHaveBeenCalled(); f.bootstrap.release();
});

it('retains validated cold OAuth intent across temporary failure and Retry', async () => {
  const f = setup(oauth); f.transport.refresh.mockRejectedValueOnce(new AuthRequestError('AUTH_SERVICE_UNAVAILABLE', 'Offline', 503));
  await f.bootstrap.start(); expect(f.bootstrap.getSnapshot().status).toBe('ERROR_RETRYABLE');
  expect(f.onExit).not.toHaveBeenCalled(); await f.bootstrap.start();
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_AUTHENTICATED', route: { name: 'OAuthResult', params: (oauth as { oauth: object }).oauth } });
  expect(f.captureLink).toHaveBeenCalledTimes(1); expect(f.transport.refresh).toHaveBeenCalledTimes(2); f.bootstrap.release();
});

it('shows expected Web expiry once without a startup refresh loop', async () => {
  const f = setup(); f.coordination.publish('SESSION_ESTABLISHED');
  f.transport.refresh.mockRejectedValueOnce(new AuthRequestError('SESSION_INVALID', 'Invalid', 401));
  await f.bootstrap.start(); await f.bootstrap.start();
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_UNAUTHENTICATED', route: { name: 'Login', params: { sessionNotice: 'SESSION_EXPIRED' } } });
  expect(f.transport.refresh).toHaveBeenCalledTimes(1); expect(f.onExit).toHaveBeenCalledTimes(1); f.bootstrap.release();
});

it('Sign Out from retryable startup uses shared exit and never shows expiry', async () => {
  const f = setup(); f.coordination.publish('SESSION_ESTABLISHED');
  f.transport.refresh.mockRejectedValueOnce(new AuthRequestError('AUTH_SERVICE_UNAVAILABLE', 'Offline', 503));
  f.transport.logout.mockRejectedValueOnce(new Error('offline'));
  await f.bootstrap.start(); f.bootstrap.signOut();
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_UNAUTHENTICATED', route: { name: 'Login' } });
  await f.controller.signOut(); expect(f.coordination.hasPendingLogout()).toBe(true);
  expect(f.onExit).toHaveBeenCalledWith('EXPLICIT_SIGN_OUT'); f.bootstrap.release();
});

it('never releases stale entry after Sign Out during authoritative lookup', async () => {
  const f = setup(); const entry = deferred<any>(); f.loadEntry.mockReturnValueOnce(entry.promise);
  const loading = f.bootstrap.start(); await tick(); f.bootstrap.signOut();
  entry.resolve({ name: 'AuthenticatedApp', params: { screen: 'ArtistHome' } }); await loading;
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_UNAUTHENTICATED', route: { name: 'Login' } }); f.bootstrap.release();
});

it('stops bootstrap routing after initial entry so completion can retain Welcome', async () => {
  const f = setup(); await f.bootstrap.start(); f.bootstrap.release();
  const state = f.bootstrap.getSnapshot(); await f.controller.signOut(); await f.bootstrap.start();
  expect(f.bootstrap.getSnapshot()).toBe(state); expect(f.loadEntry).toHaveBeenCalledTimes(1);
});

it.each(['replacement', 'logout'])('checks delayed cross-tab %s after authoritative lookup before entry', async (change) => {
  const f = setup(); const entry = deferred<any>(); f.loadEntry.mockReturnValueOnce(entry.promise);
  const loading = f.bootstrap.start(); await tick();
  if (change === 'replacement') f.coordination.publish('SESSION_ESTABLISHED');
  else f.coordination.pendingLogout(true);
  // No event is delivered. The synchronous revision/intent check must still prevent old entry.
  entry.resolve({ name: 'AuthenticatedApp', params: { screen: 'ArtistHome' } }); await loading;
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_UNAUTHENTICATED', route: { name: 'Login' } });
  expect(f.controller.getAccessToken()).toBeUndefined(); expect(f.transport.logout).not.toHaveBeenCalled();
  f.bootstrap.release();
});

it('preserves a cold signup link for a first visit without auth', async () => {
  const f = setup({ auth: 'SignupVenue' }); f.transport.refresh.mockRejectedValueOnce(new AuthRequestError('SESSION_INVALID', 'Invalid', 401));
  await f.bootstrap.start(); expect(f.bootstrap.getSnapshot()).toMatchObject({ route: { name: 'SignupVenue' } }); f.bootstrap.release();
});
