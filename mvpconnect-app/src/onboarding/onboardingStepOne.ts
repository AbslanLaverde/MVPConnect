import { validateNumberFieldValue } from '../components/onboarding/NumberField';
import { validateUrlValue } from '../components/onboarding/UrlField';
import type { LocationValue } from '../components/onboarding/LocationField';
import type { OnboardingPersona, OnboardingStepData } from './onboardingTypes';

export interface MediaReferenceData {
  mediaId: string;
}

export interface OnboardingLocationData extends LocationValue {
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;
  placeId: string | null;
}

export interface ArtistBasicsData extends OnboardingStepData {
  profileImage?: MediaReferenceData;
  bio: string | null;
  location: OnboardingLocationData;
}

export interface VenueRoomData extends OnboardingStepData {
  profileImage?: MediaReferenceData;
  description: string | null;
  location: OnboardingLocationData;
  capacity?: number;
}

export interface PromoterBusinessData extends OnboardingStepData {
  profileImage?: MediaReferenceData;
  bio: string | null;
  location: OnboardingLocationData;
  websiteUrl: string | null;
  phone: string | null;
}

export type StepOneData = ArtistBasicsData | VenueRoomData | PromoterBusinessData;

export interface StepOneErrors {
  profileImage?: string;
  bio?: string;
  description?: string;
  location?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  neighborhood?: string;
  capacity?: string;
  websiteUrl?: string;
  phone?: string;
}

const STEP_ONE_KEY: Record<OnboardingPersona, string> = {
  artist: 'basics',
  venue: 'room',
  promoter: 'business',
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const stringValue = (value: unknown) => typeof value === 'string' ? value : '';
const nullableString = (value: unknown) => {
  const result = stringValue(value);
  return result || null;
};
const normalizedNullableString = (value: unknown) => {
  const result = stringValue(value).trim();
  return result || null;
};

const numberValue = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const mediaReference = (value: unknown): MediaReferenceData | undefined => {
  const mediaId = stringValue(asRecord(value).mediaId).trim();
  return mediaId ? { mediaId } : undefined;
};

export const emptyOnboardingLocation = (): OnboardingLocationData => ({
  displayName: '',
  addressLine1: null,
  addressLine2: null,
  city: '',
  state: '',
  postalCode: null,
  country: '',
  latitude: null,
  longitude: null,
  neighborhood: null,
  placeId: null,
});

export const hydrateOnboardingLocation = (value: unknown): OnboardingLocationData => {
  const source = asRecord(value);
  return {
    displayName: stringValue(source.displayName),
    addressLine1: nullableString(source.addressLine1),
    addressLine2: nullableString(source.addressLine2),
    city: stringValue(source.city),
    state: stringValue(source.state),
    postalCode: nullableString(source.postalCode),
    country: stringValue(source.country),
    latitude: numberValue(source.latitude) ?? null,
    longitude: numberValue(source.longitude) ?? null,
    neighborhood: nullableString(source.neighborhood),
    placeId: nullableString(source.placeId),
  };
};

export const buildLocationDisplayName = (
  location: LocationValue,
  includeAddress = false,
): string => {
  const address = includeAddress ? location.addressLine1?.trim() : '';
  const locality = [location.city.trim(), location.state.trim()]
    .filter(Boolean)
    .join(', ');
  const postal = includeAddress ? location.postalCode?.trim() : '';
  const country = location.country.trim();
  return [address, [locality, postal].filter(Boolean).join(' '), country]
    .filter(Boolean)
    .join(', ');
};

export const normalizeLocationForPayload = (
  location: LocationValue,
  includeAddress = false,
): OnboardingLocationData => ({
  displayName: buildLocationDisplayName(location, includeAddress),
  addressLine1: includeAddress ? normalizedNullableString(location.addressLine1) : null,
  addressLine2: includeAddress ? normalizedNullableString(location.addressLine2) : null,
  city: location.city.trim(),
  state: location.state.trim(),
  postalCode: includeAddress ? normalizedNullableString(location.postalCode) : null,
  country: location.country.trim(),
  latitude: location.latitude ?? null,
  longitude: location.longitude ?? null,
  neighborhood: normalizedNullableString(location.neighborhood),
  placeId: normalizedNullableString(location.placeId),
});

export const updateLocationForEditing = (
  location: LocationValue,
  includeAddress = false,
): OnboardingLocationData => ({
  displayName: buildLocationDisplayName(location, includeAddress),
  addressLine1: includeAddress ? location.addressLine1 ?? null : null,
  addressLine2: includeAddress ? location.addressLine2 ?? null : null,
  city: location.city,
  state: location.state,
  postalCode: includeAddress ? location.postalCode ?? null : null,
  country: location.country,
  latitude: location.latitude ?? null,
  longitude: location.longitude ?? null,
  neighborhood: location.neighborhood ?? null,
  placeId: location.placeId ?? null,
});

export const normalizeStepOneDataForPayload = (
  persona: OnboardingPersona,
  data: StepOneData,
): StepOneData => {
  const location = normalizeLocationForPayload(data.location, persona === 'venue');
  if (persona === 'venue') {
    const venue = data as VenueRoomData;
    return {
      ...venue,
      description: normalizedNullableString(venue.description),
      location,
    };
  }
  if (persona === 'promoter') {
    const promoter = data as PromoterBusinessData;
    return {
      ...promoter,
      bio: normalizedNullableString(promoter.bio),
      websiteUrl: normalizedNullableString(promoter.websiteUrl),
      phone: normalizedNullableString(promoter.phone),
      location,
    };
  }
  const artist = data as ArtistBasicsData;
  return {
    ...artist,
    bio: normalizedNullableString(artist.bio),
    location,
  };
};

export const isRealStepOne = (persona: OnboardingPersona, stepKey: string) =>
  STEP_ONE_KEY[persona] === stepKey;

export const hydrateStepOneData = (
  persona: OnboardingPersona,
  data: OnboardingStepData,
): StepOneData => {
  const profileImage = mediaReference(data.profileImage);
  const location = hydrateOnboardingLocation(data.location);
  if (persona === 'venue') {
    return {
      profileImage,
      description: nullableString(data.description),
      location,
      capacity: numberValue(data.capacity),
    };
  }
  if (persona === 'promoter') {
    return {
      profileImage,
      bio: nullableString(data.bio),
      location,
      websiteUrl: nullableString(data.websiteUrl),
      phone: nullableString(data.phone),
    };
  }
  return {
    profileImage,
    bio: nullableString(data.bio),
    location,
  };
};

const exceeds = (value: string | null | undefined, maximum: number) =>
  Boolean(value && value.length > maximum);

export const validateStepOneData = (
  persona: OnboardingPersona,
  data: StepOneData,
  mediaReady: boolean,
): { valid: boolean; errors: StepOneErrors } => {
  const errors: StepOneErrors = {};
  const location = data.location;

  if (!data.profileImage?.mediaId || !mediaReady) {
    errors.profileImage = 'Add and finish uploading a profile image.';
  }
  if (!location.city.trim()) errors.city = 'City is required.';
  if (!location.state.trim()) errors.state = 'State is required.';
  if (!location.country.trim()) errors.country = 'Country is required.';
  if (exceeds(location.displayName, 250)) {
    errors.location = 'Location must be 250 characters or fewer.';
  }
  if (exceeds(location.city, 120)) errors.city = 'City must be 120 characters or fewer.';
  if (exceeds(location.state, 120)) errors.state = 'State must be 120 characters or fewer.';
  if (exceeds(location.country, 120)) errors.country = 'Country must be 120 characters or fewer.';
  if (exceeds(location.neighborhood, 100)) {
    errors.neighborhood = 'Neighborhood must be 100 characters or fewer.';
  }

  if (persona === 'venue') {
    const venue = data as VenueRoomData;
    if (!location.addressLine1?.trim()) errors.addressLine1 = 'Street address is required.';
    if (exceeds(location.addressLine1, 200)) {
      errors.addressLine1 = 'Street address must be 200 characters or fewer.';
    }
    if (exceeds(location.addressLine2, 200)) {
      errors.addressLine2 = 'Address line 2 must be 200 characters or fewer.';
    }
    if (exceeds(location.postalCode, 32)) {
      errors.postalCode = 'Postal code must be 32 characters or fewer.';
    }
    const capacityError = validateNumberFieldValue(
      venue.capacity === undefined ? '' : String(venue.capacity),
      { required: true, min: 1, max: 100000, integerOnly: true },
    );
    if (capacityError) errors.capacity = capacityError;
    if (exceeds(venue.description, 500)) {
      errors.description = 'Description must be 500 characters or fewer.';
    }
  } else {
    const profile = data as ArtistBasicsData | PromoterBusinessData;
    if (exceeds(profile.bio, 500)) errors.bio = 'Bio must be 500 characters or fewer.';
  }

  if (persona === 'promoter') {
    const promoter = data as PromoterBusinessData;
    const websiteError = validateUrlValue(promoter.websiteUrl ?? '', false);
    if (websiteError) errors.websiteUrl = websiteError;
    if (exceeds(promoter.websiteUrl, 2048)) {
      errors.websiteUrl = 'Website must be 2048 characters or fewer.';
    }
    if (exceeds(promoter.phone, 50)) errors.phone = 'Phone must be 50 characters or fewer.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

export const stepOneMediaId = (data: OnboardingStepData | StepOneData): string | undefined =>
  mediaReference(data.profileImage)?.mediaId;
