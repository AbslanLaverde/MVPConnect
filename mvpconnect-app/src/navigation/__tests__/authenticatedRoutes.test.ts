import { resolveAuthenticatedHomeRoute } from '../authenticatedRoutes';

describe('resolveAuthenticatedHomeRoute', () => {
  it('routes a completed Musician account to Artist Home without identity params', () => {
    expect(resolveAuthenticatedHomeRoute({
      id: 'artist-1',
      displayName: 'Glass Houses',
      persona: 'MUSICIAN',
    })).toEqual({ name: 'ArtistHome' });
  });

  it.each([
    ['VENUE', 'venue-1', 'The Marlowe Room'],
    ['PROMOTER', 'promoter-1', 'Night Signal Presents'],
  ] as const)('keeps %s on the temporary legacy destination', (persona, id, displayName) => {
    expect(resolveAuthenticatedHomeRoute({ id, displayName, persona })).toEqual({
      name: 'MusicianHome',
      params: { userId: id, userName: displayName, userType: persona },
    });
  });
});
