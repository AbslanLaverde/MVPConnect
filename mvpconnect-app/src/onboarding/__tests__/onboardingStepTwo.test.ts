import {
  hydrateStepTwoData,
  isRealStepTwo,
  normalizeStepTwoDataForPayload,
  validateStepTwoData,
} from '../onboardingStepTwo';
import type {
  ArtistSoundStepRequest,
  PromoterSpecialtiesStepRequest,
  VenueMusicStepRequest,
} from '../stepTwoTypes';

const reference = {
  entityType: 'ARTIST' as const,
  entityId: 'external-interpol',
  displayName: 'Interpol',
  external: true,
};

describe('onboarding Step 2 contracts', () => {
  it('recognizes only the three real Step 2 routes', () => {
    expect(isRealStepTwo('artist', 'sound')).toBe(true);
    expect(isRealStepTwo('venue', 'music')).toBe(true);
    expect(isRealStepTwo('promoter', 'specialties')).toBe(true);
    expect(isRealStepTwo('artist', 'live')).toBe(false);
  });

  it('hydrates Artist selections and references in persisted order', () => {
    expect(hydrateStepTwoData('artist', {
      genres: ['ROCK', 'INDIE'],
      vibes: ['DREAMY'],
      eventTypes: ['CLUB_NIGHT'],
      soundsLikeArtists: [reference],
    })).toEqual({
      genres: ['ROCK', 'INDIE'],
      vibes: ['DREAMY'],
      eventTypes: ['CLUB_NIGHT'],
      soundsLikeArtists: [reference],
    });
  });

  it('enforces Artist and Venue required selections while allowing optional event types', () => {
    const artist: ArtistSoundStepRequest = {
      genres: [], vibes: [], eventTypes: [], soundsLikeArtists: [],
    };
    expect(validateStepTwoData('artist', artist)).toEqual({
      valid: false,
      errors: {
        genres: 'Choose at least one genre.',
        vibes: 'Choose at least one vibe.',
      },
    });
    expect(validateStepTwoData('artist', {
      ...artist, genres: ['ROCK'], vibes: ['ENERGETIC'],
    }).valid).toBe(true);

    const venue: VenueMusicStepRequest = {
      genres: ['INDIE'], ambience: [], eventTypes: [], artistsBooked: [],
    };
    expect(validateStepTwoData('venue', venue).errors.ambience)
      .toBe('Choose at least one ambience.');
    expect(validateStepTwoData('venue', { ...venue, ambience: ['INTIMATE'] }).valid).toBe(true);
  });

  it('requires Promoter genres and event types while allowing empty vibes', () => {
    const promoter: PromoterSpecialtiesStepRequest = {
      genres: ['ELECTRONIC'], eventTypes: [], vibes: [], artistsWorkedWith: [],
    };
    expect(validateStepTwoData('promoter', promoter).errors.eventTypes)
      .toBe('Choose at least one event type.');
    expect(validateStepTwoData('promoter', {
      ...promoter, eventTypes: ['CLUB_NIGHT'],
    }).valid).toBe(true);
  });

  it('rejects unresolved and duplicate artist references', () => {
    const artist: ArtistSoundStepRequest = {
      genres: ['ROCK'],
      vibes: ['RAW'],
      eventTypes: [],
      soundsLikeArtists: [{ ...reference, entityId: null }],
    };
    expect(validateStepTwoData('artist', artist).errors.soundsLikeArtists)
      .toBe('Every selected artist must have a resolved MVPConnect artist ID.');
    expect(validateStepTwoData('artist', {
      ...artist,
      soundsLikeArtists: [reference, reference],
    }).errors.soundsLikeArtists).toBe('Choose each artist only once.');
  });

  it('normalizes only the exact persona DTO fields', () => {
    const promoter: PromoterSpecialtiesStepRequest = {
      genres: ['ROCK'],
      eventTypes: ['CONCERT'],
      vibes: [],
      artistsWorkedWith: [{ ...reference, entityId: ' external-interpol ', displayName: ' Interpol ' }],
      ignored: 'not sent',
    };
    expect(normalizeStepTwoDataForPayload('promoter', promoter)).toEqual({
      genres: ['ROCK'],
      eventTypes: ['CONCERT'],
      vibes: [],
      artistsWorkedWith: [reference],
    });
  });
});
