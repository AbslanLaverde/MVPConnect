import {
  galleryForMediaData,
  hydrateMediaStepData,
  isRealMediaStep,
  normalizeMediaStepForPayload,
  validateMediaStepData,
  withCanonicalMediaConnections,
  withMediaReferences,
} from '../onboardingMediaStep';

describe('real Media step contracts', () => {
  it.each([
    ['artist', 'media', true],
    ['venue', 'media', true],
    ['promoter', 'media', true],
    ['artist', 'goals', false],
  ] as const)('identifies %s/%s as real=%s', (persona, step, expected) => {
    expect(isRealMediaStep(persona, step)).toBe(expected);
  });

  it('hydrates and normalizes the exact Artist Media contract', () => {
    const data = hydrateMediaStepData('artist', {
      bannerImage: { mediaId: 'banner-1' },
      showcaseImages: [{ mediaId: 'gallery-1' }, { mediaId: 'gallery-2' }],
      websiteUrl: ' https://artist.example ',
      instagramConnection: { connectionId: 'instagram-1', provider: 'INSTAGRAM' },
      spotifyArtistIdentity: { externalArtistId: 'artist-1' },
    });

    expect(galleryForMediaData(data)).toEqual([
      { mediaId: 'gallery-1' }, { mediaId: 'gallery-2' },
    ]);
    expect(normalizeMediaStepForPayload('artist', data)).toEqual(expect.objectContaining({
      bannerImage: { mediaId: 'banner-1' },
      showcaseImages: [{ mediaId: 'gallery-1' }, { mediaId: 'gallery-2' }],
      websiteUrl: 'https://artist.example',
      instagramConnection: { connectionId: 'instagram-1', provider: 'INSTAGRAM' },
      spotifyArtistIdentity: { externalArtistId: 'artist-1' },
    }));
  });

  it('uses galleryImages for Venue and Promoter without inventing a Promoter website', () => {
    const venue = hydrateMediaStepData('venue', { galleryImages: [{ mediaId: 'venue-photo' }] });
    const promoter = hydrateMediaStepData('promoter', { galleryImages: [{ mediaId: 'promoter-photo' }] });

    expect(galleryForMediaData(venue)).toEqual([{ mediaId: 'venue-photo' }]);
    expect(galleryForMediaData(promoter)).toEqual([{ mediaId: 'promoter-photo' }]);
    expect(promoter).not.toHaveProperty('websiteUrl');
  });

  it('syncs only canonical account connections for each persona', () => {
    const artist = hydrateMediaStepData('artist', {});
    const connected = withCanonicalMediaConnections('artist', artist, [
      {
        connectionId: 'yt-1', provider: 'YOUTUBE', connectionMethod: 'OAUTH',
        status: 'CONNECTED', displayName: 'Artist Channel',
      },
      {
        connectionId: 'ig-1', provider: 'INSTAGRAM', connectionMethod: 'PROFILE_URL',
        status: 'UNVERIFIED', profileUrl: 'https://instagram.com/artist',
      },
    ], {
      id: 'external-artist-1', name: 'The Artist', source: 'SPOTIFY',
      resolutionStatus: 'RESOLVED', enrichmentStatus: 'PENDING',
    });

    expect(connected).toEqual(expect.objectContaining({
      youtubeConnection: { connectionId: 'yt-1', provider: 'YOUTUBE' },
      instagramConnection: { connectionId: 'ig-1', provider: 'INSTAGRAM' },
      spotifyArtistIdentity: { externalArtistId: 'external-artist-1' },
    }));
  });

  it('preserves ordered media references and enforces persona gallery maximums', () => {
    const artist = hydrateMediaStepData('artist', {});
    const ordered = withMediaReferences('artist', artist, { mediaId: 'banner' }, [
      { mediaId: 'second' }, { mediaId: 'first' },
    ]);
    expect(galleryForMediaData(ordered)).toEqual([{ mediaId: 'second' }, { mediaId: 'first' }]);
    expect(validateMediaStepData('artist', {
      ...ordered,
      showcaseImages: Array.from({ length: 9 }, (_, index) => ({ mediaId: `photo-${index}` })),
    } as any).valid).toBe(false);
  });

  it('accepts an entirely empty optional Media step and rejects invalid websites', () => {
    const venue = hydrateMediaStepData('venue', {});
    expect(validateMediaStepData('venue', venue).valid).toBe(true);
    expect(validateMediaStepData('venue', { ...venue, websiteUrl: 'not a url' }).errors.websiteUrl)
      .toMatch(/valid URL/);
  });
});
