import { configureStore } from '@reduxjs/toolkit';
import { onboardingApi } from '../../onboarding/onboardingApi';
import { createAuthenticatedApi } from '../authenticatedApi';
import { fixture, deferred, tick } from '../__testUtils__/sessionTestSupport';
import type { SessionController } from '../sessionController';
import api from '../../services/api';

let mockController: SessionController;
jest.mock('../session', () => ({ sessionController: {
  getGeneration: () => mockController.getGeneration(), assertGeneration: (generation: number) => mockController.assertGeneration(generation),
} }));
jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

it('cannot repopulate /me or onboarding cache with User A after logout and User B login', async () => {
  const f = fixture(); mockController = f.controller;
  const store = configureStore({ reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
    middleware: (defaults) => defaults().concat(onboardingApi.middleware) });
  f.resetCache.mockImplementation(() => store.dispatch(onboardingApi.util.resetApiState()));
  const client = createAuthenticatedApi(f.controller);
  (api.get as jest.Mock).mockImplementation((...args) => (client.get as any)(...args));
  await f.login();
  client.defaults.adapter = async (config) => ({ status: 200, statusText: 'OK', headers: {}, config,
    data: { id: 'user-A', displayName: 'Account A', persona: 'MUSICIAN' } });
  const first = store.dispatch(onboardingApi.endpoints.getSelfAccount.initiate()); await first;
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).data?.id).toBe('user-A');
  const late = deferred<any>(); let oldConfig: any;
  client.defaults.adapter = (config) => { oldConfig = config; return late.promise; };
  const old = store.dispatch(onboardingApi.endpoints.getSelfAccount.initiate(undefined, { forceRefetch: true }));
  await tick(); await f.controller.signOut();
  f.transport.login.mockResolvedValueOnce(f.wire('B')); await f.login();
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).data).toBeUndefined();
  client.defaults.adapter = async (config) => ({ status: 200, statusText: 'OK', headers: {}, config,
    data: { id: 'user-B', displayName: 'Account B', persona: 'MUSICIAN' } });
  const second = store.dispatch(onboardingApi.endpoints.getSelfAccount.initiate()); await second;
  late.resolve({ config: oldConfig, data: { id: 'user-A' }, status: 200, headers: {}, statusText: 'OK' });
  await old;
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).data?.id).toBe('user-B');
  first.unsubscribe(); old.unsubscribe(); second.unsubscribe(); store.dispatch(onboardingApi.util.resetApiState());
});

it('cannot upsert a completed old-account onboarding mutation into the replacement cache', async () => {
  const f = fixture(); mockController = f.controller;
  const store = configureStore({ reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
    middleware: (defaults) => defaults().concat(onboardingApi.middleware) });
  f.resetCache.mockImplementation(() => store.dispatch(onboardingApi.util.resetApiState()));
  const client = createAuthenticatedApi(f.controller);
  (api.post as jest.Mock).mockImplementation((...args) => (client.post as any)(...args));
  await f.login(); const late = deferred<any>(); let oldConfig: any;
  client.defaults.adapter = (config) => { oldConfig = config; return late.promise; };
  const old = store.dispatch(onboardingApi.endpoints.completeOnboardingStep.initiate({ stepKey: 'basics', data: {} }));
  await tick(); await f.controller.signOut(); f.transport.login.mockResolvedValueOnce(f.wire('B')); await f.login();
  const newState = { persona: 'PROMOTER' as const, status: 'IN_PROGRESS' as const, currentStep: 'business', onboardingVersion: 2, steps: [] };
  await store.dispatch(onboardingApi.util.upsertQueryData('getOnboarding', undefined, newState));
  late.resolve({ config: oldConfig, data: { ...newState, persona: 'MUSICIAN', currentStep: 'sound' }, status: 200, headers: {}, statusText: 'OK' });
  await old;
  expect(onboardingApi.endpoints.getOnboarding.select()(store.getState()).data).toEqual(newState);
  old.reset(); store.dispatch(onboardingApi.util.resetApiState());
});
