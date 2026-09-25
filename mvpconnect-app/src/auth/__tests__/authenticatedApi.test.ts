import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { createAuthenticatedApi } from '../authenticatedApi';
import { AuthRequestError, StaleSessionError } from '../authErrors';
import { fixture, deferred, tick } from '../__testUtils__/sessionTestSupport';

const success = (config: InternalAxiosRequestConfig, data: unknown = {}) => ({ status: 200, statusText: 'OK', headers: {}, config, data });
const reject = (config: InternalAxiosRequestConfig, status: number) => Promise.reject(new AxiosError('Rejected', undefined, config, undefined,
  { ...success(config), status }));

it.each(['web', 'native'] as const)('coordinates eight %s API 401s and attaches the new memory bearer on one retry', async (platform) => {
  const f = fixture(platform); await f.login(); const api = createAuthenticatedApi(f.controller);
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) =>
    config.headers.get('Authorization') === 'Bearer access-A' ? reject(config, 401) : success(config));
  api.defaults.adapter = adapter;
  await Promise.all(Array.from({ length: 8 }, () => api.get('/me')));
  expect(adapter).toHaveBeenCalledTimes(16); expect(f.transport.refresh).toHaveBeenCalledTimes(1);
  expect(f.controller.getAccessToken()).toBe('access-B');
});

it('never refreshes a 403 and never loops after a retried 401', async () => {
  const f = fixture(); await f.login(); const api = createAuthenticatedApi(f.controller);
  api.defaults.adapter = (config) => reject(config, 403);
  await expect(api.get('/me')).rejects.toBeInstanceOf(AxiosError);
  expect(f.transport.refresh).not.toHaveBeenCalled(); expect(f.onExit).not.toHaveBeenCalled();
  const adapter = jest.fn((config) => reject(config, 401)); api.defaults.adapter = adapter;
  await expect(api.get('/me')).rejects.toBeInstanceOf(AxiosError);
  expect(adapter).toHaveBeenCalledTimes(2); expect(f.transport.refresh).toHaveBeenCalledTimes(1);
  expect(f.onExit).toHaveBeenCalledTimes(1); expect(f.onExit).toHaveBeenCalledWith('SESSION_EXPIRED');
});

it('terminal refresh failure causes only one global exit for eight API callers', async () => {
  const f = fixture(); await f.login(); const api = createAuthenticatedApi(f.controller);
  api.defaults.adapter = (config) => reject(config, 401);
  f.transport.refresh.mockRejectedValue(new AuthRequestError('SESSION_INVALID', 'Invalid', 401));
  await Promise.allSettled(Array.from({ length: 8 }, () => api.get('/me')));
  expect(f.transport.refresh).toHaveBeenCalledTimes(1); expect(f.onExit).toHaveBeenCalledTimes(1);
});

it('rejects old successes and failures after account replacement without affecting the new session', async () => {
  const f = fixture(); await f.login(); const api = createAuthenticatedApi(f.controller);
  const old = deferred<any>(); const oldFailure = deferred<any>();
  api.defaults.adapter = (config) => config.url === '/me' ? old.promise : oldFailure.promise;
  const request = api.get('/me').catch((error) => error);
  const failing = api.get('/onboarding').catch((error) => error);
  await tick(); await f.controller.signOut();
  f.transport.login.mockResolvedValueOnce(f.wire('B')); await f.login();
  old.resolve({ config: { _session: { generation: 1 } }, data: { userId: 'user-A' } });
  oldFailure.reject({ config: { _session: { generation: 1 } }, response: { status: 401 } });
  expect(await request).toBeInstanceOf(StaleSessionError);
  expect(await failing).toBeInstanceOf(StaleSessionError);
  expect(f.controller.getSnapshot().userId).toBe('user-B');
  expect(f.transport.refresh).not.toHaveBeenCalled();
});

it('does not refresh anonymous/auth-route requests or send credentials to object storage', async () => {
  const f = fixture(); const api = createAuthenticatedApi(f.controller);
  const adapter = jest.fn((config) => reject(config, 401)); api.defaults.adapter = adapter;
  await expect(api.get('/me')).rejects.toBeInstanceOf(AxiosError);
  await f.login();
  await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError);
  await expect(api.put('https://storage.example.test/signed', 'body')).rejects.toThrow('External requests');
  expect(adapter).toHaveBeenCalledTimes(2); expect(f.transport.refresh).not.toHaveBeenCalled();
});

it('OAuth launch and status calls use the same transparent refresh boundary', async () => {
  const f = fixture(); await f.login(); const api = createAuthenticatedApi(f.controller);
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) =>
    config.headers.get('Authorization') === 'Bearer access-A' ? reject(config, 401) : success(config, { status: 'PENDING' }));
  api.defaults.adapter = adapter;
  const results = await Promise.all([api.post('/external-connections/oauth/YOUTUBE/start', {}), api.get('/external-connections/oauth/attempts/opaque')]);
  expect(results.every((result) => result.data.status === 'PENDING')).toBe(true);
  expect(f.transport.refresh).toHaveBeenCalledTimes(1);
});
