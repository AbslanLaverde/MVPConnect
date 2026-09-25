import { configureStore } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { onboardingApi } from '../../onboarding/onboardingApi';
import type { OnboardingState } from '../../onboarding/onboardingTypes';
import api from '../../services/api';
import { loadStartupEntry } from '../startupEntry';
import { SessionBootstrap } from '../sessionBootstrap';
import { createAuthenticatedApi } from '../authenticatedApi';
import { fixture, deferred, tick } from '../__testUtils__/sessionTestSupport';
import { browserFixture } from '../__testUtils__/browserTestSupport';
import { AuthRequestError } from '../authErrors';

jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../session', () => ({ sessionController: {} }));

beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

function setup(persona: 'MUSICIAN' | 'VENUE' | 'PROMOTER' = 'MUSICIAN', platform: 'web' | 'native' = 'web') {
  const browser = browserFixture(); const coordination = browser.coordinator();
  const f = fixture(platform, coordination);
  const store = configureStore({ reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
    middleware: (defaults) => defaults().concat(onboardingApi.middleware) });
  f.resetCache.mockImplementation(() => store.dispatch(onboardingApi.util.resetApiState()));
  const client = createAuthenticatedApi(f.controller);
  (api.get as jest.Mock).mockImplementation((...args) => (client.get as any)(...args));
  const identity = { id: 'restored-account', displayName: 'Restored Account', persona, email: 'restored@example.test' };
  const workflow: OnboardingState = { persona, status: 'COMPLETED', currentStep: 'goals', onboardingVersion: 2, steps: [] };
  const requests: string[] = [];
  client.defaults.adapter = async (config) => {
    requests.push(config.url!);
    expect(config.headers.Authorization).toBe('Bearer access-B');
    return { status: 200, statusText: 'OK', headers: {}, config, data: config.url === '/me' ? identity : workflow };
  };
  const bootstrap = new SessionBootstrap({ session: f.controller, captureLink: async () => null,
    loadEntry: () => loadStartupEntry(f.controller, store.dispatch) });
  return { ...f, store, client, bootstrap, identity, workflow, requests };
}

it.each([
  ['MUSICIAN', 'ArtistHome'], ['VENUE', 'VenueHome'], ['PROMOTER', 'PromoterHome'],
] as const)('restores Web %s to %s using fresh shared /me and onboarding cache', async (persona, home) => {
  const f = setup(persona);
  await f.store.dispatch(onboardingApi.util.upsertQueryData('getSelfAccount', undefined,
    { id: 'old-account', displayName: 'Old Account', email: 'old@example.test', persona: 'MUSICIAN' }));
  await f.store.dispatch(onboardingApi.util.upsertQueryData('getOnboarding', undefined,
    { ...f.workflow, persona: 'MUSICIAN', status: 'IN_PROGRESS', currentStep: 'basics' }));
  await f.bootstrap.start();
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_AUTHENTICATED', route: { name: 'AuthenticatedApp', params: { screen: home } } });
  expect(f.requests.sort()).toEqual(['/me', '/onboarding']);
  expect(f.controller.getSnapshot()).toMatchObject({ userId: 'restored-account', userType: persona, name: 'Restored Account' });
  expect(onboardingApi.endpoints.getSelfAccount.select()(f.store.getState()).data).toEqual(f.identity);
  expect(onboardingApi.endpoints.getOnboarding.select()(f.store.getState()).data).toEqual(f.workflow);
  expect(f.transport.refresh).toHaveBeenCalledWith(undefined);
  expect(f.native.getRefreshCredential).not.toHaveBeenCalled();
  f.bootstrap.release(); f.store.dispatch(onboardingApi.util.resetApiState());
});

it.each([
  ['MUSICIAN', 'artist', 'sound', 'IN_PROGRESS'], ['VENUE', 'venue', 'booking', 'IN_PROGRESS'],
  ['PROMOTER', 'promoter', 'goals', 'READY'],
] as const)('resumes %s at exact %s/%s with status %s', async (persona, routePersona, step, status) => {
  const f = setup(persona); f.workflow.status = status; f.workflow.currentStep = step;
  f.workflow.steps = [{ key: step, status: status === 'READY' ? 'COMPLETE' : 'IN_PROGRESS', position: 3, required: true, data: {} }];
  await f.bootstrap.start();
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_AUTHENTICATED', route: {
    name: 'Onboarding', params: { persona: routePersona, step },
  } });
  f.bootstrap.release(); f.store.dispatch(onboardingApi.util.resetApiState());
});

it('Native startup writes B before resolving authoritative state and enters Home', async () => {
  const f = setup('PROMOTER', 'native'); await f.native.setRefreshCredential('refresh-A');
  const write = deferred<void>(); f.native.setRefreshCredential.mockReturnValueOnce(write.promise);
  const starting = f.bootstrap.start(); await tick(); expect(f.requests).toEqual([]);
  write.resolve(); await starting;
  expect(f.bootstrap.getSnapshot()).toMatchObject({ route: { name: 'AuthenticatedApp', params: { screen: 'PromoterHome' } } });
  expect(f.requests.sort()).toEqual(['/me', '/onboarding']);
  f.bootstrap.release(); f.store.dispatch(onboardingApi.util.resetApiState());
});

it.each(['/me', '/onboarding'])('retries temporary %s errors without rotating or discarding valid memory auth', async (path) => {
  const f = setup(); const adapter = f.client.defaults.adapter as Function; let fail = true;
  f.client.defaults.adapter = async (config) => {
    if (config.url === path && fail) throw new AxiosError('unavailable', undefined, config, undefined,
      { status: 503, statusText: 'Unavailable', headers: {}, config, data: {} });
    return adapter(config);
  };
  await f.bootstrap.start(); expect(f.bootstrap.getSnapshot().status).toBe('ERROR_RETRYABLE');
  expect(f.controller.getAccessToken()).toBe('access-B'); expect(f.onExit).not.toHaveBeenCalled();
  fail = false; await f.bootstrap.start();
  expect(f.bootstrap.getSnapshot()).toMatchObject({ route: { name: 'AuthenticatedApp', params: { screen: 'ArtistHome' } } });
  expect(f.transport.refresh).toHaveBeenCalledTimes(1);
  f.bootstrap.release(); f.store.dispatch(onboardingApi.util.resetApiState());
});

it('uses Phase 3 expiry when auth fails while resolving server state', async () => {
  const f = setup(); f.transport.refresh.mockResolvedValueOnce(f.wire()).mockRejectedValueOnce(
    new AuthRequestError('SESSION_INVALID', 'Invalid', 401));
  f.client.defaults.adapter = async (config) => { throw new AxiosError('unauthorized', undefined, config, undefined,
    { status: 401, statusText: 'Unauthorized', headers: {}, config, data: {} }); };
  await f.bootstrap.start();
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_UNAUTHENTICATED',
    route: { name: 'Login', params: { sessionNotice: 'SESSION_EXPIRED' } } });
  expect(f.onExit).toHaveBeenCalledTimes(1); expect(f.onExit).toHaveBeenCalledWith('SESSION_EXPIRED');
  expect(f.controller.getAccessToken()).toBeUndefined();
  expect(onboardingApi.endpoints.getSelfAccount.select()(f.store.getState()).data).toBeUndefined();
  f.bootstrap.release(); f.store.dispatch(onboardingApi.util.resetApiState());
});

it.each(['owner', 'persona', 'mismatch'])('exits safely for invalid %s identity without guessing Home', async (problem) => {
  const f = setup();
  if (problem === 'owner') f.identity.id = '';
  if (problem === 'persona') (f.identity as any).persona = 'UNKNOWN';
  if (problem === 'mismatch') f.workflow.persona = 'VENUE';
  await f.bootstrap.start();
  expect(f.bootstrap.getSnapshot()).toEqual({ status: 'READY_UNAUTHENTICATED', route: { name: 'Login' } });
  expect(f.onExit).toHaveBeenCalledWith('SESSION_REPLACED'); expect(f.transport.logout).toHaveBeenCalledTimes(1);
  f.bootstrap.release(); f.store.dispatch(onboardingApi.util.resetApiState());
});

it.each(['missing', 'unsupported', 'malformed'])('keeps recoverable %s workflow errors retryable', async (problem) => {
  const f = setup(); f.workflow.status = 'IN_PROGRESS';
  if (problem === 'unsupported') f.workflow.steps = [{ key: 'future-step', position: 1, required: true, status: 'IN_PROGRESS', data: {} }];
  if (problem === 'malformed') (f.workflow as any).steps = null;
  await f.bootstrap.start(); expect(f.bootstrap.getSnapshot().status).toBe('ERROR_RETRYABLE');
  expect(f.controller.getAccessToken()).toBe('access-B'); expect(f.transport.logout).not.toHaveBeenCalled();
  f.bootstrap.release(); f.store.dispatch(onboardingApi.util.resetApiState());
});
