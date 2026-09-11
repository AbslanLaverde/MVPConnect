import api from '../api';
import { artistIdentityService } from '../externalArtistService';

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('Artist own Spotify identity frontend foundation', () => {
  afterEach(() => jest.clearAllMocks());

  it('reads, attaches, replaces through the same endpoint, and disconnects identity', async () => {
    const identity = {
      id: 'external-artist-1', name: 'Interpol', spotifyId: 'spotify-1',
      source: 'SPOTIFY' as const, resolutionStatus: 'RESOLVED' as const,
      enrichmentStatus: 'PENDING' as const,
    };
    mockedApi.get.mockResolvedValueOnce({ status: 200, data: identity } as any);
    mockedApi.put.mockResolvedValueOnce({ data: identity } as any);
    mockedApi.delete.mockResolvedValueOnce({ data: undefined } as any);

    await expect(artistIdentityService.current()).resolves.toEqual(identity);
    await expect(artistIdentityService.attach(identity.id)).resolves.toEqual(identity);
    await artistIdentityService.disconnect();

    expect(mockedApi.put).toHaveBeenCalledWith('/me/artist-identity', {
      externalArtistId: identity.id,
    });
    expect(mockedApi.delete).toHaveBeenCalledWith('/me/artist-identity');
  });

  it('maps a no-content response to no current identity', async () => {
    mockedApi.get.mockResolvedValueOnce({ status: 204, data: undefined } as any);

    await expect(artistIdentityService.current()).resolves.toBeNull();
  });
});
