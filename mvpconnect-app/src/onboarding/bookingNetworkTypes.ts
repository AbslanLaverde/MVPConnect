import type { OnboardingLocationData } from './onboardingStepOne';
import type {
  ArtistEntityReferenceDto,
  VenueEntityReferenceDto,
} from './stepTwoTypes';
import type { DrawRangeCode, PerformanceMediaReferenceDto } from './stepThreeTypes';

export type VenueBookingStatus =
  | 'ACTIVELY_BOOKING'
  | 'SELECTIVELY_BOOKING'
  | 'NOT_BOOKING';

export type BookingMethod = 'DIRECT' | 'THROUGH_PROMOTERS' | 'BOTH';

export interface VenueBookingFormData {
  bookingStatus: VenueBookingStatus | null;
  bookingMethod: BookingMethod | null;
  desiredArtistDraw: DrawRangeCode | null;
  bookingEmail: string;
}

export interface VenueBookingStepRequest {
  bookingStatus: VenueBookingStatus;
  bookingMethod: BookingMethod;
  desiredArtistDraw: DrawRangeCode | null;
  bookingEmail: string | null;
}

export type PromoterAcceptingStatus =
  | 'ACTIVELY_ACCEPTING'
  | 'SELECTIVELY_ACCEPTING'
  | 'NOT_ACCEPTING';

export type RosterSizeRange =
  | 'NO_FORMAL_ROSTER'
  | 'ONE_TO_FIVE'
  | 'SIX_TO_TEN'
  | 'ELEVEN_TO_TWENTY_FIVE'
  | 'TWENTY_SIX_PLUS';

export interface PromoterNetworkFormData {
  acceptingStatus: PromoterAcceptingStatus | null;
  rosterSize: RosterSizeRange | null;
  rosterArtists: ArtistEntityReferenceDto[];
  venues: VenueEntityReferenceDto[];
  additionalMarkets: OnboardingLocationData[];
  pastShows?: PerformanceMediaReferenceDto[];
}

export interface PromoterNetworkStepRequest {
  acceptingStatus: PromoterAcceptingStatus;
  rosterSize: RosterSizeRange | null;
  rosterArtists: ArtistEntityReferenceDto[];
  venues: VenueEntityReferenceDto[];
  additionalMarkets: OnboardingLocationData[];
  pastShows?: PerformanceMediaReferenceDto[];
}

export type BookingNetworkFormData = VenueBookingFormData | PromoterNetworkFormData;
export type BookingNetworkStepRequest = VenueBookingStepRequest | PromoterNetworkStepRequest;
