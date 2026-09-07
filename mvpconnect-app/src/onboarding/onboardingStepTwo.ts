import type { OnboardingPersona, OnboardingStepData } from './onboardingTypes';
import type {
  ArtistEntityReferenceDto,
  ArtistSoundStepRequest,
  PromoterSpecialtiesStepRequest,
  StepTwoRequest,
  VenueMusicStepRequest,
} from './stepTwoTypes';
import {
  EVENT_TYPE_OPTIONS,
  EventTypeCode,
  GENRE_OPTIONS,
  GenreCode,
  VIBE_OPTIONS,
  VibeCode,
} from './taxonomy';

export const MAX_STEP_TWO_GENRES = 5;
export const MAX_STEP_TWO_VIBES = 3;
export const MAX_STEP_TWO_EVENT_TYPES = 5;
export const MAX_STEP_TWO_ARTIST_REFERENCES = 5;

export interface StepTwoPresentation {
  headline: string;
  support: string;
  genreHelper: string;
  vibeLabel: string;
  vibeHelper: string;
  eventTypeLabel: string;
  eventTypeHelper: string;
  eventTypesRequired: boolean;
  referenceLabel: string;
  referenceHelper: string;
}

export const STEP_TWO_PRESENTATION: Record<OnboardingPersona, StepTwoPresentation> = {
  artist: {
    headline: 'WHAT DO YOU\nSOUND LIKE?',
    support: 'Help people understand your music. Choose what fits you best.',
    genreHelper: 'Pick up to five that best describe your sound.',
    vibeLabel: "WHAT'S THE VIBE?",
    vibeHelper: 'Choose up to three that best capture the feel of your music.',
    eventTypeLabel: 'WHERE DO YOU PLAY?',
    eventTypeHelper: 'Select the types of events where you typically perform.',
    eventTypesRequired: false,
    referenceLabel: 'SOUNDS LIKE',
    referenceHelper: 'Add a few artists that sound similar to your music.',
  },
  venue: {
    headline: 'WHAT SOUNDS\nRIGHT IN THIS ROOM?',
    support: 'Tell us about the music that fits your space. This helps artists and promoters find you.',
    genreHelper: 'Pick up to five that you typically book.',
    vibeLabel: "WHAT'S THE AMBIENCE?",
    vibeHelper: 'Choose up to three that best capture the feel of your space.',
    eventTypeLabel: 'WHAT HAPPENS HERE?',
    eventTypeHelper: 'Select the types of events you typically host.',
    eventTypesRequired: false,
    referenceLabel: "ARTISTS YOU'VE BOOKED",
    referenceHelper: "Add a few artists you've hosted to help others understand your taste.",
  },
  promoter: {
    headline: 'WHAT KIND OF SHOWS\nDO YOU BUILD?',
    support: 'Tell us about the music you produce and the artists you work with. This helps venues and artists find the right fit.',
    genreHelper: 'Pick up to five that best describe the music you focus on.',
    vibeLabel: "WHAT'S THE ENERGY?",
    vibeHelper: 'Choose up to three that best capture the feel of your events.',
    eventTypeLabel: 'WHAT DO YOU PRODUCE?',
    eventTypeHelper: 'Select the types of shows you typically put together.',
    eventTypesRequired: true,
    referenceLabel: "ARTISTS YOU'VE WORKED WITH",
    referenceHelper: "Add a few artists you've worked with to showcase your experience.",
  },
};

export interface StepTwoErrors {
  genres?: string;
  vibes?: string;
  ambience?: string;
  eventTypes?: string;
  soundsLikeArtists?: string;
  artistsBooked?: string;
  artistsWorkedWith?: string;
}

const STEP_TWO_KEY: Record<OnboardingPersona, string> = {
  artist: 'sound',
  venue: 'music',
  promoter: 'specialties',
};

const GENRE_CODES = new Set<string>(GENRE_OPTIONS.map((option) => option.value));
const VIBE_CODES = new Set<string>(VIBE_OPTIONS.map((option) => option.value));
const EVENT_TYPE_CODES = new Set<string>(EVENT_TYPE_OPTIONS.map((option) => option.value));

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const taxonomyValues = <Value extends string>(value: unknown, allowed: Set<string>): Value[] =>
  Array.isArray(value)
    ? value.filter((candidate): candidate is Value =>
        typeof candidate === 'string' && allowed.has(candidate))
    : [];

const artistReferences = (value: unknown): ArtistEntityReferenceDto[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const source = asRecord(candidate);
    if (source.entityType !== 'ARTIST' || typeof source.displayName !== 'string') return [];
    const entityId = typeof source.entityId === 'string' ? source.entityId : null;
    return [{
      entityType: 'ARTIST' as const,
      entityId,
      displayName: source.displayName,
      external: typeof source.external === 'boolean' ? source.external : true,
    }];
  });
};

export const isRealStepTwo = (persona: OnboardingPersona, stepKey: string): boolean =>
  STEP_TWO_KEY[persona] === stepKey;

export const emptyStepTwoData = (persona: OnboardingPersona): StepTwoRequest => {
  if (persona === 'venue') {
    return { genres: [], ambience: [], eventTypes: [], artistsBooked: [] };
  }
  if (persona === 'promoter') {
    return { genres: [], eventTypes: [], vibes: [], artistsWorkedWith: [] };
  }
  return { genres: [], vibes: [], eventTypes: [], soundsLikeArtists: [] };
};

export const hydrateStepTwoData = (
  persona: OnboardingPersona,
  data: OnboardingStepData,
): StepTwoRequest => {
  const genres = taxonomyValues<GenreCode>(data.genres, GENRE_CODES);
  const eventTypes = taxonomyValues<EventTypeCode>(data.eventTypes, EVENT_TYPE_CODES);
  if (persona === 'venue') {
    return {
      genres,
      ambience: taxonomyValues<VibeCode>(data.ambience, VIBE_CODES),
      eventTypes,
      artistsBooked: artistReferences(data.artistsBooked),
    };
  }
  if (persona === 'promoter') {
    return {
      genres,
      eventTypes,
      vibes: taxonomyValues<VibeCode>(data.vibes, VIBE_CODES),
      artistsWorkedWith: artistReferences(data.artistsWorkedWith),
    };
  }
  return {
    genres,
    vibes: taxonomyValues<VibeCode>(data.vibes, VIBE_CODES),
    eventTypes,
    soundsLikeArtists: artistReferences(data.soundsLikeArtists),
  };
};

const normalizedReferences = (
  references: readonly ArtistEntityReferenceDto[],
): ArtistEntityReferenceDto[] => references.map((reference) => ({
  entityType: 'ARTIST',
  entityId: reference.entityId?.trim() || null,
  displayName: reference.displayName.trim(),
  external: reference.external,
}));

export const normalizeStepTwoDataForPayload = (
  persona: OnboardingPersona,
  data: StepTwoRequest,
): StepTwoRequest => {
  if (persona === 'venue') {
    const venue = data as VenueMusicStepRequest;
    return {
      genres: [...venue.genres],
      ambience: [...venue.ambience],
      eventTypes: [...venue.eventTypes],
      artistsBooked: normalizedReferences(venue.artistsBooked),
    };
  }
  if (persona === 'promoter') {
    const promoter = data as PromoterSpecialtiesStepRequest;
    return {
      genres: [...promoter.genres],
      eventTypes: [...promoter.eventTypes],
      vibes: [...promoter.vibes],
      artistsWorkedWith: normalizedReferences(promoter.artistsWorkedWith),
    };
  }
  const artist = data as ArtistSoundStepRequest;
  return {
    genres: [...artist.genres],
    vibes: [...artist.vibes],
    eventTypes: [...artist.eventTypes],
    soundsLikeArtists: normalizedReferences(artist.soundsLikeArtists),
  };
};

const hasDuplicates = <Value,>(values: readonly Value[]) => new Set(values).size !== values.length;

const selectionError = <Value extends string>(
  values: readonly Value[],
  allowed: Set<string>,
  minimum: number,
  maximum: number,
  requiredMessage: string,
): string | undefined => {
  if (values.length < minimum) return requiredMessage;
  if (values.length > maximum) return `Choose no more than ${maximum}.`;
  if (hasDuplicates(values) || values.some((value) => !allowed.has(value))) {
    return 'Choose each option once from the available list.';
  }
  return undefined;
};

const referenceError = (references: readonly ArtistEntityReferenceDto[]): string | undefined => {
  if (references.length > MAX_STEP_TWO_ARTIST_REFERENCES) {
    return `Add no more than ${MAX_STEP_TWO_ARTIST_REFERENCES} artists.`;
  }
  if (references.some((reference) =>
    reference.entityType !== 'ARTIST'
    || !reference.entityId?.trim()
    || !reference.displayName.trim()
    || typeof reference.external !== 'boolean')) {
    return 'Every selected artist must have a resolved MVPConnect artist ID.';
  }
  const ids = references.map((reference) => reference.entityId?.trim());
  return hasDuplicates(ids) ? 'Choose each artist only once.' : undefined;
};

export const validateStepTwoData = (
  persona: OnboardingPersona,
  data: StepTwoRequest,
): { valid: boolean; errors: StepTwoErrors } => {
  const errors: StepTwoErrors = {};
  errors.genres = selectionError(
    data.genres,
    GENRE_CODES,
    1,
    MAX_STEP_TWO_GENRES,
    'Choose at least one genre.',
  );

  if (persona === 'venue') {
    const venue = data as VenueMusicStepRequest;
    errors.ambience = selectionError(
      venue.ambience,
      VIBE_CODES,
      1,
      MAX_STEP_TWO_VIBES,
      'Choose at least one ambience.',
    );
    errors.eventTypes = selectionError(
      venue.eventTypes,
      EVENT_TYPE_CODES,
      0,
      MAX_STEP_TWO_EVENT_TYPES,
      '',
    );
    errors.artistsBooked = referenceError(venue.artistsBooked);
  } else if (persona === 'promoter') {
    const promoter = data as PromoterSpecialtiesStepRequest;
    errors.eventTypes = selectionError(
      promoter.eventTypes,
      EVENT_TYPE_CODES,
      1,
      MAX_STEP_TWO_EVENT_TYPES,
      'Choose at least one event type.',
    );
    errors.vibes = selectionError(
      promoter.vibes,
      VIBE_CODES,
      0,
      MAX_STEP_TWO_VIBES,
      '',
    );
    errors.artistsWorkedWith = referenceError(promoter.artistsWorkedWith);
  } else {
    const artist = data as ArtistSoundStepRequest;
    errors.vibes = selectionError(
      artist.vibes,
      VIBE_CODES,
      1,
      MAX_STEP_TWO_VIBES,
      'Choose at least one vibe.',
    );
    errors.eventTypes = selectionError(
      artist.eventTypes,
      EVENT_TYPE_CODES,
      0,
      MAX_STEP_TWO_EVENT_TYPES,
      '',
    );
    errors.soundsLikeArtists = referenceError(artist.soundsLikeArtists);
  }

  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof StepTwoErrors]) delete errors[key as keyof StepTwoErrors];
  });
  return { valid: Object.keys(errors).length === 0, errors };
};
