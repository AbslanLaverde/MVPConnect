import { resolveAuthenticatedHomeRoute } from '../authenticatedRoutes';

describe('resolveAuthenticatedHomeRoute', () => {
  it('routes a completed Musician account to Artist Home without identity params', () => {
    expect(resolveAuthenticatedHomeRoute({
      id: 'artist-1',
      displayName: 'Glass Houses',
      persona: 'MUSICIAN',
    })).toEqual({ name: 'ArtistHome' });
  });

  it('routes a completed Venue account to Venue Home without identity params', () => {
    expect(resolveAuthenticatedHomeRoute({
      id: 'venue-1',
      displayName: 'The Marlowe Room',
      persona: 'VENUE',
    })).toEqual({ name: 'VenueHome' });
  });

  it('routes a completed Promoter account to Promoter Home without identity params', () => {
    expect(resolveAuthenticatedHomeRoute({
      id: 'promoter-1',
      displayName: 'Night Signal Presents',
      persona: 'PROMOTER',
    })).toEqual({ name: 'PromoterHome' });
  });

  it('only returns the three persona-specific Home routes', () => {
    const destinations = (['MUSICIAN', 'VENUE', 'PROMOTER'] as const).map((persona) => (
      resolveAuthenticatedHomeRoute({ id: 'account-1', displayName: 'Account', persona }).name
    ));

    expect(destinations).toEqual(['ArtistHome', 'VenueHome', 'PromoterHome']);
  });
});
