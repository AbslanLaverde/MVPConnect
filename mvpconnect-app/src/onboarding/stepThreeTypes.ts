import type { OnboardingLocationData } from './onboardingStepOne';
import type { EntityReferenceDto, VenueEntityReferenceDto } from './stepTwoTypes';
import type {
  EquipmentCode,
  PaAvailability,
  ProductionAmenityCode,
  SoundEngineerAvailability,
  SoundcheckAvailability,
} from './taxonomy';

export type ArtistBookingStatus =
  | 'ACTIVELY_BOOKING'
  | 'OPEN_TO_OFFERS'
  | 'NOT_AVAILABLE';

export type DrawRangeCode =
  | 'UNDER_50'
  | 'FROM_50_TO_100'
  | 'FROM_101_TO_250'
  | 'FROM_251_TO_500'
  | 'FROM_501_TO_1000'
  | 'OVER_1000';

export type ArtistSetLengthMinutes = 30 | 45 | 60 | 90 | 120;

export type ArtistTravelSelection =
  | 'UP_TO_25'
  | 'UP_TO_50'
  | 'UP_TO_100'
  | 'UP_TO_250'
  | 'UP_TO_500'
  | 'UP_TO_1000'
  | 'TOURING_ANYWHERE';

export interface EquipmentItemDto {
  code: EquipmentCode;
  quantity: number | null;
}

export interface PerformanceMediaReferenceDto {
  mediaId: string;
  date: string | null;
  venue: VenueEntityReferenceDto | null;
  location: OnboardingLocationData | null;
  artists: EntityReferenceDto[];
}

export interface ArtistLiveStepRequest {
  bookingStatus: ArtistBookingStatus;
  typicalDraw: DrawRangeCode;
  travelRadiusMiles: number | null;
  touring: boolean | null;
  setLengthMinutes: number | null;
  equipmentBrought: EquipmentItemDto[];
  venuesPlayed: VenueEntityReferenceDto[];
  performanceImages?: PerformanceMediaReferenceDto[];
}

export interface VenueStageStepRequest {
  stageWidthFeet: number | null;
  stageDepthFeet: number | null;
  soundEngineerAvailability: SoundEngineerAvailability;
  soundcheckAvailability: SoundcheckAvailability;
  paAvailability: PaAvailability;
  equipmentAvailable: EquipmentItemDto[];
  productionAmenities: ProductionAmenityCode[];
}

export interface ArtistLiveFormData {
  bookingStatus: ArtistBookingStatus | null;
  typicalDraw: DrawRangeCode | null;
  travelSelection: ArtistTravelSelection | null;
  setLengthMinutes: ArtistSetLengthMinutes | null;
  equipmentBrought: EquipmentItemDto[];
  venuesPlayed: VenueEntityReferenceDto[];
  /** Deprecated compatibility state; the real Playing Live UI does not edit this field. */
  performanceImages?: PerformanceMediaReferenceDto[];
}

export interface VenueStageFormData {
  stageWidthFeet: number | null;
  stageDepthFeet: number | null;
  soundEngineerAvailability: SoundEngineerAvailability | null;
  soundcheckAvailability: SoundcheckAvailability | null;
  paAvailability: PaAvailability | null;
  equipmentAvailable: EquipmentItemDto[];
  productionAmenities: ProductionAmenityCode[];
}

export type StepThreeFormData = ArtistLiveFormData | VenueStageFormData;
export type StepThreeRequest = ArtistLiveStepRequest | VenueStageStepRequest;
