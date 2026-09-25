import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { credentialStore } from '../credentialStore.native';
import { credentialStore as webStore } from '../credentialStore.web';
import { clearLegacyAuth } from '../legacyStorage';
import { response } from '../__testUtils__/sessionTestSupport';

const mockPlatform = { OS: 'ios' };
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatform.OS; } } }));
const mockPost = jest.fn(); const mockCreate = jest.fn((_config: unknown) => ({ post: mockPost }));
jest.mock('axios', () => ({ __esModule: true, default: { create: (config: unknown) => mockCreate(config), isAxiosError: (error: any) => error?.isAxiosError } }));
afterEach(() => { mockPlatform.OS = 'ios'; });

describe.each(['web', 'ios', 'android'] as const)('%s auth transport', (platform) => {
  it('centralizes platform headers and routes login, all signup personas, refresh and logout outside API retry', async () => {
    mockPlatform.OS = platform;
    jest.clearAllMocks();
    const { refreshToken, ...web } = response();
    mockPost.mockResolvedValue({ data: platform === 'web' ? web : response() });
    let transport!: typeof import('../authTransport')['authTransport'];
    jest.isolateModules(() => { transport = require('../authTransport').authTransport; });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      withCredentials: platform === 'web', headers: { 'Content-Type': 'application/json', 'X-MVP-Client': platform === 'web' ? 'web' : 'native' },
    }));
    await transport.login({ email: 'a@example.test', password: 'test-only' });
    for (const persona of ['musician', 'venue', 'promoter'] as const) await transport.signup(persona, {});
    await transport.refresh(platform === 'web' ? undefined : refreshToken);
    await transport.logout(platform === 'web' ? undefined : refreshToken);
    expect(mockPost.mock.calls.map(([path]) => path)).toEqual([
      '/auth/login', '/auth/signup/musician', '/auth/signup/venue', '/auth/signup/promoter', '/auth/refresh', '/auth/logout',
    ]);
    expect(mockPost.mock.calls[4][1]).toEqual(platform === 'web' ? {} : { refreshToken });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    if (platform === 'web') await expect(transport.refresh('forbidden')).rejects.toThrow('unavailable');
  });
});

it('rejects any Web response refresh field and returns sanitized errors without Axios configs', async () => {
  mockPlatform.OS = 'web';
  let transport!: typeof import('../authTransport')['authTransport'];
  jest.isolateModules(() => { transport = require('../authTransport').authTransport; });
  mockPost.mockResolvedValueOnce({ data: { ...response(), refreshToken: null } });
  await expect(transport.login({ email: 'a', password: 'secret-password' })).rejects.toThrow('invalid session');
  mockPost.mockRejectedValueOnce({ isAxiosError: true, config: { data: 'secret-password', headers: { Authorization: 'secret-token' } },
    response: { status: 401, data: { code: 'INVALID_CREDENTIALS', message: 'secret-password' } } });
  const error = await transport.login({ email: 'a', password: 'secret-password' }).catch((failure) => failure);
  expect(JSON.stringify(error)).not.toMatch(/secret-password|secret-token|config/);
  expect(error.response.data.code).toBe('INVALID_CREDENTIALS');
});

it('uses only OS secure storage for the native refresh credential and propagates storage failures', async () => {
  jest.clearAllMocks();
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('opaque');
  await credentialStore.setRefreshCredential('opaque'); expect(await credentialStore.getRefreshCredential()).toBe('opaque');
  await credentialStore.clearRefreshCredential();
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('mvpconnect.refresh-credential.v1', 'opaque', { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('mvpconnect.refresh-credential.v1', expect.any(Object));
  (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('OS error'));
  await expect(credentialStore.setRefreshCredential('next')).rejects.toThrow('OS error');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(Object.keys(webStore)).toEqual(['kind']);
});

it('only deletes obsolete legacy keys, with no bearer storage read or write', async () => {
  jest.clearAllMocks(); await clearLegacyAuth();
  expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['authToken', 'userType']);
  expect(AsyncStorage.getItem).not.toHaveBeenCalled(); expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
