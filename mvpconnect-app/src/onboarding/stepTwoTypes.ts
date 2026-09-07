import type { OnboardingStepData } from './onboardingTypes';
import type { EventTypeCode, GenreCode, VibeCode } from './taxonomy';

export type EntityType = 'ARTIST' | 'VENUE' | 'PROMOTER';

export interface EntityReferenceDto {
  entityType: EntityType;
  entityId: string | null;
  displayName: string;
  external: boolean;
}

export interface ArtistEntityReferenceDto extends EntityReferenceDto {
  entityType: 'ARTIST';
}

export interface ArtistSoundStepRequest extends OnboardingStepData {
  genres: GenreCode[];
  vibes: VibeCode[];
  eventTypes: EventTypeCode[];
  soundsLikeArtists: ArtistEntityReferenceDto[];
}

export interface VenueMusicStepRequest extends OnboardingStepData {
  genres: GenreCode[];
  ambience: VibeCode[];
  eventTypes: EventTypeCode[];
  artistsBooked: ArtistEntityReferenceDto[];
}

export interface PromoterSpecialtiesStepRequest extends OnboardingStepData {
  genres: GenreCode[];
  eventTypes: EventTypeCode[];
  vibes: VibeCode[];
  artistsWorkedWith: ArtistEntityReferenceDto[];
}

export type StepTwoRequest =
  | ArtistSoundStepRequest
  | VenueMusicStepRequest
  | PromoterSpecialtiesStepRequest;
