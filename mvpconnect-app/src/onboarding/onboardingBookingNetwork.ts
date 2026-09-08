import { validateOnboardingField } from './onboardingValidation';
import {
  emptyOnboardingLocation,
  hydrateOnboardingLocation,
  normalizeLocationForPayload,
  type OnboardingLocationData,
} from './onboardingStepOne';
import type { OnboardingPersona, OnboardingStepData } from './onboardingTypes';
import type {
  ArtistEntityReferenceDto,
  EntityReferenceDto,
  VenueEntityReferenceDto,
} from './stepTwoTypes';
import { ARTIST_DRAW_OPTIONS } from './onboardingStepThree';
import type {
  BookingMethod,
  BookingNetworkFormData,
  BookingNetworkStepRequest,
  PromoterAcceptingStatus,
  PromoterNetworkFormData,
  PromoterNetworkStepRequest,
  RosterSizeRange,
  VenueBookingFormData,
  VenueBookingStatus,
  VenueBookingStepRequest,
} from './bookingNetworkTypes';
import type { PerformanceMediaReferenceDto } from './stepThreeTypes';

export const MAX_NETWORK_REFERENCES = 5;
export const MAX_ADDITIONAL_MARKETS = 5;

export const VENUE_BOOKING_STATUS_OPTIONS = [
  { value: 'ACTIVELY_BOOKING', label: 'Actively Booking' },
  { value: 'SELECTIVELY_BOOKING', label: 'Selectively Booking' },
  { value: 'NOT_BOOKING', label: 'Not Booking' },
] as const;

export const BOOKING_METHOD_OPTIONS = [
  { value: 'DIRECT', label: 'Direct' },
  { value: 'THROUGH_PROMOTERS', label: 'Through Promoters' },
  { value: 'BOTH', label: 'Both' },
] as const;

export const PROMOTER_ACCEPTING_STATUS_OPTIONS = [
  { value: 'ACTIVELY_ACCEPTING', label: 'Actively Accepting' },
  { value: 'SELECTIVELY_ACCEPTING', label: 'Selectively Accepting' },
  { value: 'NOT_ACCEPTING', label: 'Not Accepting' },
] as const;

export const ROSTER_SIZE_OPTIONS = [
  { value: 'NO_FORMAL_ROSTER', label: 'No Formal Roster' },
  { value: 'ONE_TO_FIVE', label: '1–5' },
  { value: 'SIX_TO_TEN', label: '6–10' },
  { value: 'ELEVEN_TO_TWENTY_FIVE', label: '11–25' },
  { value: 'TWENTY_SIX_PLUS', label: '26+' },
] as const;

export const BOOKING_NETWORK_PRESENTATION = {
  venue: {
    headline: 'HOW DO YOU\nBOOK YOUR ROOM?',
    support: 'Tell us about your booking approach so artists and promoters know how to work with you.',
  },
  promoter: {
    headline: 'HOW ARE YOU\nCONNECTED?',
    support: "Tell us about your current roster, the venues you work with, and the markets you're active in so we can help you find the right opportunities.",
  },
} as const;

export interface BookingNetworkErrors {
  bookingStatus?: string;
  bookingMethod?: string;
  desiredArtistDraw?: string;
  bookingEmail?: string;
  acceptingStatus?: string;
  rosterSize?: string;
  rosterArtists?: string;
  venues?: string;
  additionalMarkets?: string;
}

const REAL_STEP_KEY: Partial<Record<OnboardingPersona, string>> = {
  venue: 'booking',
  promoter: 'network',
};

const VENUE_BOOKING_STATUSES = new Set<string>(
  VENUE_BOOKING_STATUS_OPTIONS.map((option) => option.value),
);
const BOOKING_METHODS = new Set<string>(BOOKING_METHOD_OPTIONS.map((option) => option.value));
const DRAW_RANGES = new Set<string>(ARTIST_DRAW_OPTIONS.map((option) => option.value));
const ACCEPTING_STATUSES = new Set<string>(
  PROMOTER_ACCEPTING_STATUS_OPTIONS.map((option) => option.value),
);
const ROSTER_SIZES = new Set<string>(ROSTER_SIZE_OPTIONS.map((option) => option.value));

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const enumValue = <Value extends string>(value: unknown, allowed: Set<string>): Value | null =>
  typeof value === 'string' && allowed.has(value) ? value as Value : null;

const references = <Type extends 'ARTIST' | 'VENUE'>(
  value: unknown,
  entityType: Type,
): Array<Type extends 'ARTIST' ? ArtistEntityReferenceDto : VenueEntityReferenceDto> => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const source = asRecord(candidate);
    if (source.entityType !== entityType || typeof source.displayName !== 'string') return [];
    return [{
      entityType,
      entityId: typeof source.entityId === 'string' ? source.entityId : null,
      displayName: source.displayName,
      external: typeof source.external === 'boolean' ? source.external : true,
    } as Type extends 'ARTIST' ? ArtistEntityReferenceDto : VenueEntityReferenceDto];
  });
};

const normalizedReferences = <Reference extends EntityReferenceDto>(
  values: readonly Reference[],
): Reference[] => values.map((reference) => ({
  ...reference,
  entityId: reference.entityId?.trim() || null,
  displayName: reference.displayName.trim(),
}));

const performanceReferences = (value: unknown): PerformanceMediaReferenceDto[] =>
  Array.isArray(value) ? value.filter((item) => item !== null && typeof item === 'object') as PerformanceMediaReferenceDto[] : [];

export const isRealBookingNetworkStep = (
  persona: OnboardingPersona,
  stepKey: string,
): boolean => REAL_STEP_KEY[persona] === stepKey;

export const emptyVenueBookingData = (): VenueBookingFormData => ({
  bookingStatus: null,
  bookingMethod: null,
  desiredArtistDraw: null,
  bookingEmail: '',
});

export const emptyPromoterNetworkData = (): PromoterNetworkFormData => ({
  acceptingStatus: null,
  rosterSize: null,
  rosterArtists: [],
  venues: [],
  additionalMarkets: [],
  pastShows: [],
});

export const hydrateBookingNetworkData = (
  persona: 'venue' | 'promoter',
  data: OnboardingStepData,
): BookingNetworkFormData => {
  if (persona === 'venue') {
    return {
      bookingStatus: enumValue<VenueBookingStatus>(data.bookingStatus, VENUE_BOOKING_STATUSES),
      bookingMethod: enumValue<BookingMethod>(data.bookingMethod, BOOKING_METHODS),
      desiredArtistDraw: enumValue<NonNullable<VenueBookingFormData['desiredArtistDraw']>>(
        data.desiredArtistDraw,
        DRAW_RANGES,
      ),
      bookingEmail: typeof data.bookingEmail === 'string' ? data.bookingEmail : '',
    };
  }
  return {
    acceptingStatus: enumValue<PromoterAcceptingStatus>(data.acceptingStatus, ACCEPTING_STATUSES),
    rosterSize: enumValue<RosterSizeRange>(data.rosterSize, ROSTER_SIZES),
    rosterArtists: references(data.rosterArtists, 'ARTIST'),
    venues: references(data.venues, 'VENUE'),
    additionalMarkets: Array.isArray(data.additionalMarkets)
      ? data.additionalMarkets.map(hydrateOnboardingLocation)
      : [],
    pastShows: performanceReferences(data.pastShows),
  };
};

export const normalizeVenueBookingForPayload = (
  data: VenueBookingFormData,
): VenueBookingStepRequest => {
  if (!data.bookingStatus || !data.bookingMethod) {
    throw new Error('Venue Booking data is incomplete.');
  }
  return {
    bookingStatus: data.bookingStatus,
    bookingMethod: data.bookingMethod,
    desiredArtistDraw: data.desiredArtistDraw,
    bookingEmail: data.bookingEmail.trim() || null,
  };
};

export const normalizePromoterNetworkForPayload = (
  data: PromoterNetworkFormData,
): PromoterNetworkStepRequest => {
  if (!data.acceptingStatus) throw new Error('Promoter Network data is incomplete.');
  return {
    acceptingStatus: data.acceptingStatus,
    rosterSize: data.rosterSize,
    rosterArtists: normalizedReferences(data.rosterArtists),
    venues: normalizedReferences(data.venues),
    additionalMarkets: data.additionalMarkets.map((location) =>
      normalizeLocationForPayload(location, false)),
    pastShows: [...data.pastShows],
  };
};

export const normalizeBookingNetworkForPayload = (
  persona: 'venue' | 'promoter',
  data: BookingNetworkFormData,
): BookingNetworkStepRequest => persona === 'venue'
  ? normalizeVenueBookingForPayload(data as VenueBookingFormData)
  : normalizePromoterNetworkForPayload(data as PromoterNetworkFormData);

const referenceError = (
  values: readonly EntityReferenceDto[],
  expectedType: 'ARTIST' | 'VENUE',
): string | undefined => {
  if (values.length > MAX_NETWORK_REFERENCES) {
    return `Add no more than ${MAX_NETWORK_REFERENCES} ${expectedType === 'ARTIST' ? 'artists' : 'venues'}.`;
  }
  if (values.some((reference) => reference.entityType !== expectedType
    || !reference.entityId?.trim()
    || !reference.displayName.trim())) {
    return `Every selected ${expectedType === 'ARTIST' ? 'artist' : 'venue'} must have a resolved MVPConnect ID.`;
  }
  const ids = values.map((reference) => reference.entityId?.trim());
  return new Set(ids).size !== ids.length
    ? `Choose each ${expectedType === 'ARTIST' ? 'artist' : 'venue'} only once.`
    : undefined;
};

export const marketIdentity = (location: OnboardingLocationData): string => {
  const normalize = (value: string | null | undefined) =>
    value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
  const placeId = normalize(location.placeId);
  return placeId
    ? `place:${placeId}`
    : `region:${[location.city, location.state, location.country].map(normalize).join('|')}`;
};

export const marketsAreSame = (
  left: OnboardingLocationData,
  right: OnboardingLocationData,
): boolean => {
  const normalize = (value: string | null | undefined) =>
    value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
  const leftPlaceId = normalize(left.placeId);
  const rightPlaceId = normalize(right.placeId);
  const samePlace = Boolean(leftPlaceId && rightPlaceId && leftPlaceId === rightPlaceId);
  const region = (location: OnboardingLocationData) =>
    [location.city, location.state, location.country].map(normalize).join('|');
  return samePlace || region(left) === region(right);
};

export const emptyMarketLocation = (): OnboardingLocationData => emptyOnboardingLocation();

const marketsError = (markets: readonly OnboardingLocationData[]): string | undefined => {
  if (markets.length > MAX_ADDITIONAL_MARKETS) {
    return `Add no more than ${MAX_ADDITIONAL_MARKETS} markets.`;
  }
  if (markets.some((market) => !market.displayName.trim()
    || !market.city.trim()
    || !market.state.trim()
    || !market.country.trim())) {
    return 'Each market must include a city, state, and country.';
  }
  for (let index = 0; index < markets.length; index += 1) {
    for (let comparison = index + 1; comparison < markets.length; comparison += 1) {
      if (marketsAreSame(markets[index], markets[comparison])) {
        return 'Choose each market only once.';
      }
    }
  }
  return undefined;
};

export const validateBookingNetworkData = (
  persona: 'venue' | 'promoter',
  data: BookingNetworkFormData,
): { valid: boolean; errors: BookingNetworkErrors } => {
  const errors: BookingNetworkErrors = {};
  if (persona === 'venue') {
    const venue = data as VenueBookingFormData;
    if (!venue.bookingStatus || !VENUE_BOOKING_STATUSES.has(venue.bookingStatus)) {
      errors.bookingStatus = 'Choose your current booking status.';
    }
    if (!venue.bookingMethod || !BOOKING_METHODS.has(venue.bookingMethod)) {
      errors.bookingMethod = 'Choose how artists and promoters can book your room.';
    }
    if (venue.desiredArtistDraw && !DRAW_RANGES.has(venue.desiredArtistDraw)) {
      errors.desiredArtistDraw = 'Choose a valid draw range.';
    }
    const email = validateOnboardingField(venue.bookingEmail, { required: false, kind: 'email' });
    if (!email.valid) errors.bookingEmail = email.error;
  } else {
    const promoter = data as PromoterNetworkFormData;
    if (!promoter.acceptingStatus || !ACCEPTING_STATUSES.has(promoter.acceptingStatus)) {
      errors.acceptingStatus = 'Choose whether you are accepting new artists.';
    }
    if (promoter.rosterSize && !ROSTER_SIZES.has(promoter.rosterSize)) {
      errors.rosterSize = 'Choose a valid roster size.';
    }
    errors.rosterArtists = referenceError(promoter.rosterArtists, 'ARTIST');
    errors.venues = referenceError(promoter.venues, 'VENUE');
    errors.additionalMarkets = marketsError(promoter.additionalMarkets);
  }
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof BookingNetworkErrors]) delete errors[key as keyof BookingNetworkErrors];
  });
  return { valid: Object.keys(errors).length === 0, errors };
};
