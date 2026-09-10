import type { OnboardingPersona, OnboardingStepData } from './onboardingTypes';
import type {
  ArtistBookingStatus,
  ArtistLiveFormData,
  ArtistLiveStepRequest,
  ArtistSetLengthMinutes,
  ArtistTravelSelection,
  DrawRangeCode,
  EquipmentItemDto,
  PerformanceMediaReferenceDto,
  StepThreeFormData,
  StepThreeRequest,
  VenueStageFormData,
  VenueStageStepRequest,
} from './stepThreeTypes';
import type { VenueEntityReferenceDto } from './stepTwoTypes';
import {
  EQUIPMENT_OPTIONS,
  PA_AVAILABILITY_OPTIONS,
  PRODUCTION_AMENITY_OPTIONS,
  SOUND_ENGINEER_AVAILABILITY_OPTIONS,
  SOUNDCHECK_AVAILABILITY_OPTIONS,
  type EquipmentCode,
  type PaAvailability,
  type ProductionAmenityCode,
  type SoundEngineerAvailability,
  type SoundcheckAvailability,
} from './taxonomy';

export const MAX_VENUES_PLAYED = 5;

export const ARTIST_BOOKING_STATUS_OPTIONS = [
  { value: 'ACTIVELY_BOOKING', label: 'Actively Booking' },
  { value: 'OPEN_TO_OFFERS', label: 'Open to Offers' },
  { value: 'NOT_AVAILABLE', label: 'Not Available' },
] as const;

export const ARTIST_DRAW_OPTIONS = [
  { value: 'UNDER_50', label: 'Under 50' },
  { value: 'FROM_50_TO_100', label: '50–100' },
  { value: 'FROM_101_TO_250', label: '101–250' },
  { value: 'FROM_251_TO_500', label: '251–500' },
  { value: 'FROM_501_TO_1000', label: '501–1,000' },
  { value: 'OVER_1000', label: '1,000+' },
] as const;

export const ARTIST_TRAVEL_OPTIONS = [
  { value: 'UP_TO_25', label: 'Up to 25 Miles', radiusMiles: 25, touring: false },
  { value: 'UP_TO_50', label: 'Up to 50 Miles', radiusMiles: 50, touring: false },
  { value: 'UP_TO_100', label: 'Up to 100 Miles', radiusMiles: 100, touring: false },
  { value: 'UP_TO_250', label: 'Up to 250 Miles', radiusMiles: 250, touring: false },
  { value: 'UP_TO_500', label: 'Up to 500 Miles', radiusMiles: 500, touring: false },
  { value: 'UP_TO_1000', label: 'Up to 1,000 Miles', radiusMiles: 1000, touring: false },
  { value: 'TOURING_ANYWHERE', label: 'Touring / Anywhere', radiusMiles: null, touring: true },
] as const;

export const ARTIST_SET_LENGTH_OPTIONS = [
  { value: '30', label: '30 Min' },
  { value: '45', label: '45 Min' },
  { value: '60', label: '60 Min' },
  { value: '90', label: '90 Min' },
  { value: '120', label: '120 Min' },
] as const;

export interface StepThreePresentation {
  headline: string;
  support: string;
}

export const STEP_THREE_PRESENTATION = {
  artist: {
    headline: 'HOW DO YOU\nSHOW UP LIVE?',
    support: 'Tell venues and promoters what booking you looks like.',
  },
  venue: {
    headline: 'WHAT CAN ARTISTS\nEXPECT ON STAGE?',
    support: 'Help artists and promoters know what you provide, so the right talent can show up ready to play.',
  },
} as const satisfies Record<'artist' | 'venue', StepThreePresentation>;

export type StepThreeErrors = Partial<Record<
  | 'bookingStatus'
  | 'typicalDraw'
  | 'travelSelection'
  | 'setLengthMinutes'
  | 'equipmentBrought'
  | 'venuesPlayed'
  | 'stageWidthFeet'
  | 'stageDepthFeet'
  | 'soundEngineerAvailability'
  | 'soundcheckAvailability'
  | 'paAvailability'
  | 'equipmentAvailable'
  | 'productionAmenities',
  string
>>;

const STEP_THREE_KEY: Partial<Record<OnboardingPersona, string>> = {
  artist: 'live',
  venue: 'stage',
};

const BOOKING_STATUSES = new Set<string>(ARTIST_BOOKING_STATUS_OPTIONS.map((option) => option.value));
const DRAW_RANGES = new Set<string>(ARTIST_DRAW_OPTIONS.map((option) => option.value));
const TRAVEL_SELECTIONS = new Set<string>(ARTIST_TRAVEL_OPTIONS.map((option) => option.value));
const SET_LENGTHS = new Set<number>(ARTIST_SET_LENGTH_OPTIONS.map((option) => Number(option.value)));
const EQUIPMENT_CODES = new Set<string>(EQUIPMENT_OPTIONS.map((option) => option.value));
const ENGINEER_OPTIONS = new Set<string>(SOUND_ENGINEER_AVAILABILITY_OPTIONS.map((option) => option.value));
const SOUNDCHECK_OPTIONS = new Set<string>(SOUNDCHECK_AVAILABILITY_OPTIONS.map((option) => option.value));
const PA_OPTIONS = new Set<string>(PA_AVAILABILITY_OPTIONS.map((option) => option.value));
const AMENITY_CODES = new Set<string>(PRODUCTION_AMENITY_OPTIONS.map((option) => option.value));

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const enumValue = <Value extends string>(value: unknown, allowed: Set<string>): Value | null =>
  typeof value === 'string' && allowed.has(value) ? value as Value : null;

const nullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const hasDuplicates = <Value,>(values: readonly Value[]) => new Set(values).size !== values.length;

const equipmentItems = (value: unknown): EquipmentItemDto[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate) => {
    const item = asRecord(candidate);
    if (typeof item.code !== 'string' || !EQUIPMENT_CODES.has(item.code) || seen.has(item.code)) return [];
    const quantity = item.quantity === null || item.quantity === undefined
      ? null
      : typeof item.quantity === 'number'
        && Number.isInteger(item.quantity)
        && item.quantity >= 1
        && item.quantity <= 99
        ? item.quantity
        : null;
    seen.add(item.code);
    return [{ code: item.code as EquipmentCode, quantity }];
  });
};

const venueReferences = (value: unknown): VenueEntityReferenceDto[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const reference = asRecord(candidate);
    if (reference.entityType !== 'VENUE' || typeof reference.displayName !== 'string') return [];
    return [{
      entityType: 'VENUE' as const,
      entityId: typeof reference.entityId === 'string' ? reference.entityId : null,
      displayName: reference.displayName,
      external: typeof reference.external === 'boolean' ? reference.external : true,
    }];
  });
};

const amenities = (value: unknown): ProductionAmenityCode[] =>
  Array.isArray(value)
    ? value.filter((candidate): candidate is ProductionAmenityCode =>
        typeof candidate === 'string' && AMENITY_CODES.has(candidate))
    : [];

export const isRealStepThree = (persona: OnboardingPersona, stepKey: string): boolean =>
  STEP_THREE_KEY[persona] === stepKey;

export const emptyArtistLiveData = (): ArtistLiveFormData => ({
  bookingStatus: null,
  typicalDraw: null,
  travelSelection: null,
  setLengthMinutes: null,
  equipmentBrought: [],
  venuesPlayed: [],
});

export const emptyVenueStageData = (): VenueStageFormData => ({
  stageWidthFeet: null,
  stageDepthFeet: null,
  soundEngineerAvailability: null,
  soundcheckAvailability: null,
  paAvailability: null,
  equipmentAvailable: [],
  productionAmenities: [],
});

export const travelSelectionFromContract = (
  touring: unknown,
  travelRadiusMiles: unknown,
): ArtistTravelSelection | null => {
  if (touring === true) return 'TOURING_ANYWHERE';
  if (touring !== false && touring !== null && touring !== undefined) return null;
  const radius = nullableNumber(travelRadiusMiles);
  const match = ARTIST_TRAVEL_OPTIONS.find((option) =>
    option.touring === false && option.radiusMiles === radius);
  return match?.value ?? null;
};

export const travelContractFromSelection = (
  selection: ArtistTravelSelection,
): Pick<ArtistLiveStepRequest, 'touring' | 'travelRadiusMiles'> => {
  const option = ARTIST_TRAVEL_OPTIONS.find((candidate) => candidate.value === selection);
  if (!option) throw new Error(`Unsupported artist travel selection: ${selection}`);
  return {
    touring: option.touring,
    travelRadiusMiles: option.radiusMiles,
  };
};

export const hydrateArtistLiveData = (data: OnboardingStepData): ArtistLiveFormData => ({
  bookingStatus: enumValue<ArtistBookingStatus>(data.bookingStatus, BOOKING_STATUSES),
  typicalDraw: enumValue<DrawRangeCode>(data.typicalDraw, DRAW_RANGES),
  travelSelection: travelSelectionFromContract(data.touring, data.travelRadiusMiles),
  setLengthMinutes: typeof data.setLengthMinutes === 'number' && SET_LENGTHS.has(data.setLengthMinutes)
    ? data.setLengthMinutes as ArtistSetLengthMinutes
    : null,
  equipmentBrought: equipmentItems(data.equipmentBrought),
  venuesPlayed: venueReferences(data.venuesPlayed),
  ...(Array.isArray(data.performanceImages)
    ? { performanceImages: data.performanceImages as PerformanceMediaReferenceDto[] }
    : {}),
});

export const hydrateVenueStageData = (data: OnboardingStepData): VenueStageFormData => ({
  stageWidthFeet: nullableNumber(data.stageWidthFeet),
  stageDepthFeet: nullableNumber(data.stageDepthFeet),
  soundEngineerAvailability: enumValue<SoundEngineerAvailability>(
    data.soundEngineerAvailability,
    ENGINEER_OPTIONS,
  ),
  soundcheckAvailability: enumValue<SoundcheckAvailability>(
    data.soundcheckAvailability,
    SOUNDCHECK_OPTIONS,
  ),
  paAvailability: enumValue<PaAvailability>(data.paAvailability, PA_OPTIONS),
  equipmentAvailable: equipmentItems(data.equipmentAvailable),
  productionAmenities: amenities(data.productionAmenities),
});

export const hydrateStepThreeData = (
  persona: 'artist' | 'venue',
  data: OnboardingStepData,
): StepThreeFormData => persona === 'artist'
  ? hydrateArtistLiveData(data)
  : hydrateVenueStageData(data);

const normalizedVenueReferences = (
  references: readonly VenueEntityReferenceDto[],
): VenueEntityReferenceDto[] => references.map((reference) => ({
  entityType: 'VENUE',
  entityId: reference.entityId?.trim() || null,
  displayName: reference.displayName.trim(),
  external: reference.external,
}));

export const normalizeArtistLiveDataForPayload = (
  data: ArtistLiveFormData,
): ArtistLiveStepRequest => {
  if (!data.bookingStatus || !data.typicalDraw || !data.travelSelection) {
    throw new Error('Artist Playing Live data is incomplete.');
  }
  return {
    bookingStatus: data.bookingStatus,
    typicalDraw: data.typicalDraw,
    ...travelContractFromSelection(data.travelSelection),
    setLengthMinutes: data.setLengthMinutes,
    equipmentBrought: data.equipmentBrought.map((item) => ({ ...item })),
    venuesPlayed: normalizedVenueReferences(data.venuesPlayed),
    ...(data.performanceImages !== undefined
      ? { performanceImages: data.performanceImages.map((item) => ({ ...item })) }
      : {}),
  };
};

export const normalizeVenueStageDataForPayload = (
  data: VenueStageFormData,
): VenueStageStepRequest => {
  if (!data.soundEngineerAvailability || !data.soundcheckAvailability || !data.paAvailability) {
    throw new Error('Venue The Stage data is incomplete.');
  }
  return {
    stageWidthFeet: data.stageWidthFeet,
    stageDepthFeet: data.stageDepthFeet,
    soundEngineerAvailability: data.soundEngineerAvailability,
    soundcheckAvailability: data.soundcheckAvailability,
    paAvailability: data.paAvailability,
    equipmentAvailable: data.equipmentAvailable.map((item) => ({ ...item })),
    productionAmenities: [...data.productionAmenities],
  };
};

export const normalizeStepThreeDataForPayload = (
  persona: 'artist' | 'venue',
  data: StepThreeFormData,
): StepThreeRequest => persona === 'artist'
  ? normalizeArtistLiveDataForPayload(data as ArtistLiveFormData)
  : normalizeVenueStageDataForPayload(data as VenueStageFormData);

const equipmentError = (items: readonly EquipmentItemDto[]): string | undefined => {
  if (hasDuplicates(items.map((item) => item.code))) return 'Choose each equipment type only once.';
  if (items.some((item) => !EQUIPMENT_CODES.has(item.code)
    || (item.quantity !== null
      && (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)))) {
    return 'Equipment quantities must be blank or whole numbers from 1 to 99.';
  }
  return undefined;
};

const venueReferenceError = (references: readonly VenueEntityReferenceDto[]): string | undefined => {
  if (references.length > MAX_VENUES_PLAYED) return `Add no more than ${MAX_VENUES_PLAYED} venues.`;
  if (references.some((reference) => reference.entityType !== 'VENUE'
    || !reference.entityId?.trim()
    || !reference.displayName.trim()
    || typeof reference.external !== 'boolean')) {
    return 'Every selected venue must have a resolved MVPConnect venue ID.';
  }
  return hasDuplicates(references.map((reference) => reference.entityId?.trim()))
    ? 'Choose each venue only once.'
    : undefined;
};

const positiveDimensionError = (value: number | null): string | undefined =>
  value !== null && (!Number.isFinite(value) || value <= 0)
    ? 'Enter a value greater than 0.'
    : undefined;

export const validateArtistLiveData = (
  data: ArtistLiveFormData,
): { valid: boolean; errors: StepThreeErrors } => {
  const errors: StepThreeErrors = {};
  if (!data.bookingStatus || !BOOKING_STATUSES.has(data.bookingStatus)) {
    errors.bookingStatus = 'Choose your current booking status.';
  }
  if (!data.typicalDraw || !DRAW_RANGES.has(data.typicalDraw)) {
    errors.typicalDraw = 'Choose your typical draw.';
  }
  if (!data.travelSelection || !TRAVEL_SELECTIONS.has(data.travelSelection)) {
    errors.travelSelection = 'Choose how far you play.';
  }
  if (data.setLengthMinutes !== null && !SET_LENGTHS.has(data.setLengthMinutes)) {
    errors.setLengthMinutes = 'Choose one available set length.';
  }
  errors.equipmentBrought = equipmentError(data.equipmentBrought);
  errors.venuesPlayed = venueReferenceError(data.venuesPlayed);
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof StepThreeErrors]) delete errors[key as keyof StepThreeErrors];
  });
  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateVenueStageData = (
  data: VenueStageFormData,
): { valid: boolean; errors: StepThreeErrors } => {
  const errors: StepThreeErrors = {};
  if (!data.soundEngineerAvailability || !ENGINEER_OPTIONS.has(data.soundEngineerAvailability)) {
    errors.soundEngineerAvailability = 'Choose sound engineer availability.';
  }
  if (!data.soundcheckAvailability || !SOUNDCHECK_OPTIONS.has(data.soundcheckAvailability)) {
    errors.soundcheckAvailability = 'Choose soundcheck availability.';
  }
  if (!data.paAvailability || !PA_OPTIONS.has(data.paAvailability)) {
    errors.paAvailability = 'Choose PA system availability.';
  }
  errors.stageWidthFeet = positiveDimensionError(data.stageWidthFeet);
  errors.stageDepthFeet = positiveDimensionError(data.stageDepthFeet);
  errors.equipmentAvailable = equipmentError(data.equipmentAvailable);
  if (hasDuplicates(data.productionAmenities)
    || data.productionAmenities.some((value) => !AMENITY_CODES.has(value))) {
    errors.productionAmenities = 'Choose each available amenity only once.';
  }
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof StepThreeErrors]) delete errors[key as keyof StepThreeErrors];
  });
  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateStepThreeData = (
  persona: 'artist' | 'venue',
  data: StepThreeFormData,
) => persona === 'artist'
  ? validateArtistLiveData(data as ArtistLiveFormData)
  : validateVenueStageData(data as VenueStageFormData);
