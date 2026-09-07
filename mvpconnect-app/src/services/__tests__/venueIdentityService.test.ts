import api from '../api';
import { venueIdentityProvider } from '../venueIdentityService';

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('venue identity service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses separate authenticated local and Google search endpoints', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: [] } as any)
      .mockResolvedValueOnce({ data: [] } as any);

    await venueIdentityProvider.searchLocal('Marlowe');
    await venueIdentityProvider.searchGoogle('Marlowe');

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/venue-identities/search', {
      params: { q: 'Marlowe' },
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/venue-identities/search/google', {
      params: { q: 'Marlowe' },
    });
  });

  it('resolves Google selections without exposing or sending provider credentials', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 'venue-identity-1' } } as any);

    await venueIdentityProvider.resolveGoogle('place-1');

    expect(mockedApi.post).toHaveBeenCalledWith('/venue-identities/resolve', {
      provider: 'GOOGLE',
      providerPlaceId: 'place-1',
    });
  });

  it('sends only the safe attempt reason and optional location for free-form venues', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 'manual-1' } } as any);

    await venueIdentityProvider.createFreeForm('Tiny Local Room', 'NO_MATCH', {
      displayName: 'Brooklyn, NY',
      city: 'Brooklyn',
      state: 'NY',
      country: 'United States',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/venue-identities/free-form', {
      displayName: 'Tiny Local Room',
      googleAttemptStatus: 'NO_MATCH',
      location: {
        displayName: 'Brooklyn, NY',
        city: 'Brooklyn',
        state: 'NY',
        country: 'United States',
      },
    });
  });
});
