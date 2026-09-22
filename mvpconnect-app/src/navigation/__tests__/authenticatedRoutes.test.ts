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

  it('keeps Promoter on the temporary legacy destination', () => {
    expect(resolveAuthenticatedHomeRoute({
      id: 'promoter-1',
      displayName: 'Night Signal Presents',
      persona: 'PROMOTER',
    })).toEqual({
      name: 'MusicianHome',
      params: {
        userId: 'promoter-1',
        userName: 'Night Signal Presents',
        userType: 'PROMOTER',
      },
    });
  });
});
