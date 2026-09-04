import api from '../api';
import { createLocationSuggestionProvider } from '../locationService';

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('location service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the authenticated backend proxy for suggestions and details', async () => {
    mockedApi.get
      .mockResolvedValueOnce({
        data: [{ placeId: 'place-1', displayName: 'Mount Vernon, NY, USA' }],
      } as any)
      .mockResolvedValueOnce({
        data: {
          displayName: 'Mount Vernon, NY, USA',
          city: 'Mount Vernon',
          state: 'NY',
          country: 'United States',
          placeId: 'place-1',
        },
      } as any);
    const provider = createLocationSuggestionProvider('city');

    const suggestions = await provider.search('Mount Ver');
    const resolved = await provider.resolve!(suggestions[0]);

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/locations/suggestions', {
      params: { query: 'Mount Ver', mode: 'CITY' },
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/locations/place', {
      params: { placeId: 'place-1' },
    });
    expect(resolved.city).toBe('Mount Vernon');
  });
});
