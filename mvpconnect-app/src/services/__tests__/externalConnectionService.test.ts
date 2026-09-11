import { Linking } from 'react-native';
import api from '../api';
import {
  OAUTH_PROVIDERS_BY_PERSONA,
  URL_PROVIDERS_BY_PERSONA,
  externalConnectionService,
  parseOAuthReturn,
  startExternalOAuth,
} from '../externalConnectionService';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('external connection frontend foundation', () => {
  afterEach(() => jest.clearAllMocks());

  it('locks URL and OAuth providers to the approved personas', () => {
    expect(URL_PROVIDERS_BY_PERSONA).toEqual({
      MUSICIAN: ['INSTAGRAM', 'TIKTOK', 'BANDCAMP'],
      VENUE: ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'],
      PROMOTER: ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'],
    });
    expect(OAUTH_PROVIDERS_BY_PERSONA).toEqual({
      MUSICIAN: ['YOUTUBE', 'SOUNDCLOUD'], VENUE: [], PROMOTER: [],
    });
  });

  it('creates, lists, and removes URL-first connections through authenticated API calls', async () => {
    const connection = {
      connectionId: 'connection-1', provider: 'INSTAGRAM' as const,
      connectionMethod: 'PROFILE_URL' as const, status: 'UNVERIFIED' as const,
      profileUrl: 'https://www.instagram.com/glasshouses/',
    };
    mockedApi.put.mockResolvedValueOnce({ data: connection } as any);
    mockedApi.get.mockResolvedValueOnce({ data: [connection] } as any);
    mockedApi.delete.mockResolvedValueOnce({ data: undefined } as any);

    await expect(externalConnectionService.upsertUrl('INSTAGRAM', '@glasshouses'))
      .resolves.toEqual(connection);
    await expect(externalConnectionService.list()).resolves.toEqual([connection]);
    await externalConnectionService.remove('INSTAGRAM');

    expect(mockedApi.put).toHaveBeenCalledWith('/external-connections/url', {
      provider: 'INSTAGRAM', profile: '@glasshouses', displayName: null,
    });
    expect(mockedApi.delete).toHaveBeenCalledWith('/external-connections/INSTAGRAM');
  });

  it('starts OAuth externally and retains only opaque attempt state', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {
      attemptId: 'attempt-1', provider: 'YOUTUBE',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?safe=1',
      expiresAt: '2026-09-08T23:00:00',
    } } as any);
    jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(true);

    const result = await startExternalOAuth('YOUTUBE');

    expect(result.attemptId).toBe('attempt-1');
    expect(Linking.openURL).toHaveBeenCalledWith(result.authorizationUrl);
    expect(JSON.stringify(result)).not.toContain('accessToken');
  });

  it('parses only allowlisted native/web return routes and rejects secret-bearing URLs', () => {
    expect(parseOAuthReturn(
      'mvpconnect://oauth/result?attemptId=attempt-1&provider=SOUNDCLOUD&status=SUCCEEDED',
    )).toEqual({ attemptId: 'attempt-1', provider: 'SOUNDCLOUD', status: 'SUCCEEDED' });
    expect(parseOAuthReturn(
      'http://localhost:19006/oauth/result?attemptId=attempt-2&provider=YOUTUBE&status=FAILED',
    )).toEqual({ attemptId: 'attempt-2', provider: 'YOUTUBE', status: 'FAILED' });
    expect(parseOAuthReturn(
      'https://evil.example/oauth/result?attemptId=attempt-1&provider=YOUTUBE&status=SUCCEEDED',
    )).toBeNull();
    expect(parseOAuthReturn(
      'mvpconnect://oauth/result?attemptId=attempt-1&provider=YOUTUBE&status=SUCCEEDED&code=secret',
    )).toBeNull();
    expect(parseOAuthReturn(
      'mvpconnect://oauth/result?attemptId=attempt-1&provider=YOUTUBE&status=SUCCEEDED&unexpected=value',
    )).toBeNull();
  });
});
