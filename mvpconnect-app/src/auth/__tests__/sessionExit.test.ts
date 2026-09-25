import { rootNavigation, flushSessionNavigation, finishStartupNavigation } from '../../navigation/rootNavigation';
import { registerSessionCacheReset, resetSessionCache, navigateAfterSessionExit } from '../sessionExit';
import { SessionController } from '../sessionController';
import { fixture } from '../__testUtils__/sessionTestSupport';
import { localCoordination } from '../webCoordination';

beforeEach(() => { jest.restoreAllMocks(); });

it.each(['EXPLICIT_SIGN_OUT', 'SESSION_EXPIRED'] as const)('resets API state and the root stack with the correct %s notice', async (reason) => {
  const f = fixture(); const cache = jest.fn(); registerSessionCacheReset(cache);
  jest.spyOn(rootNavigation, 'isReady').mockReturnValue(true);
  const reset = jest.spyOn(rootNavigation, 'resetRoot').mockImplementation(() => {});
  const controller = new SessionController({ transport: f.transport, credentials: f.native,
    coordination: localCoordination, clearLegacy: f.clearLegacy, resetCache: resetSessionCache, onExit: navigateAfterSessionExit });
  await controller.login({ email: 'A@example.test', password: 'test-only' }); cache.mockClear();
  if (reason === 'EXPLICIT_SIGN_OUT') await controller.signOut(); else await controller.expire(controller.getGeneration());
  expect(cache).toHaveBeenCalledTimes(1);
  expect(reset).toHaveBeenCalledTimes(1);
  expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login',
    ...(reason === 'SESSION_EXPIRED' ? { params: { sessionNotice: 'SESSION_EXPIRED' } } : {}),
  }] });
});

it('retains a pending root reset until the navigator is ready and then consumes it once', () => {
  const ready = jest.spyOn(rootNavigation, 'isReady').mockReturnValue(false);
  const reset = jest.spyOn(rootNavigation, 'resetRoot').mockImplementation(() => {});
  navigateAfterSessionExit('SESSION_EXPIRED'); expect(reset).not.toHaveBeenCalled();
  ready.mockReturnValue(true); flushSessionNavigation(); flushSessionNavigation();
  expect(reset).toHaveBeenCalledTimes(1);
});

it('acknowledges an expired initial Login without resetting it and replaying the notice', () => {
  const ready = jest.spyOn(rootNavigation, 'isReady').mockReturnValue(false);
  const reset = jest.spyOn(rootNavigation, 'resetRoot').mockImplementation(() => {});
  navigateAfterSessionExit('SESSION_EXPIRED'); ready.mockReturnValue(true);
  finishStartupNavigation({ name: 'Login', params: { sessionNotice: 'SESSION_EXPIRED' } });
  flushSessionNavigation(); expect(reset).not.toHaveBeenCalled();
});

it('honors a late session exit even if startup had already selected Home', () => {
  const ready = jest.spyOn(rootNavigation, 'isReady').mockReturnValue(false);
  const reset = jest.spyOn(rootNavigation, 'resetRoot').mockImplementation(() => {});
  navigateAfterSessionExit('SESSION_EXPIRED'); ready.mockReturnValue(true);
  finishStartupNavigation({ name: 'AuthenticatedApp', params: { screen: 'ArtistHome' } });
  expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login', params: { sessionNotice: 'SESSION_EXPIRED' } }] });
});
