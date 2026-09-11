import { validateUrlValue } from '../components/onboarding/UrlField';
import type {
  ExternalConnectionSummary,
  ExternalProvider,
} from '../services/externalConnectionService';
import type { ExternalArtistResult } from '../services/externalArtistService';
import type { OnboardingPersona, OnboardingStepData } from './onboardingTypes';
import {
  MEDIA_GALLERY_LIMITS,
  type ArtistMediaStepRequest,
  type ExternalConnectionReferenceDto,
  type MediaReferenceDto,
  type PromoterMediaStepRequest,
  type VenueMediaStepRequest,
} from './mediaStepTypes';

export type MediaStepRequest =
  | ArtistMediaStepRequest
  | VenueMediaStepRequest
  | PromoterMediaStepRequest;

export interface MediaStepValidation {
  valid: boolean;
  errors: Record<string, string | undefined>;
}

const reference = (value: unknown): MediaReferenceDto | null => {
  if (!value || typeof value !== 'object') return null;
  const mediaId = (value as Record<string, unknown>).mediaId;
  return typeof mediaId === 'string' && mediaId.trim() ? { mediaId: mediaId.trim() } : null;
};

const references = (value: unknown): MediaReferenceDto[] => Array.isArray(value)
  ? value.map(reference).filter((item): item is MediaReferenceDto => item !== null)
  : [];

const connectionReference = (
  value: unknown,
  provider: ExternalProvider,
): ExternalConnectionReferenceDto | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.connectionId === 'string'
    && candidate.connectionId.trim()
    && candidate.provider === provider
    ? { connectionId: candidate.connectionId.trim(), provider }
    : null;
};

const connectionFor = (
  connections: readonly ExternalConnectionSummary[],
  provider: ExternalProvider,
): ExternalConnectionReferenceDto | null => {
  const oauth = provider === 'YOUTUBE' || provider === 'SOUNDCLOUD';
  const connection = connections.find((candidate) => (
    candidate.provider === provider
    && Boolean(candidate.connectionId)
    && candidate.connectionMethod === (oauth ? 'OAUTH' : 'PROFILE_URL')
    && (oauth ? candidate.status === 'CONNECTED' : ['CONNECTED', 'UNVERIFIED'].includes(candidate.status))
  ));
  return connection?.connectionId
    ? { connectionId: connection.connectionId, provider }
    : null;
};

export const isRealMediaStep = (persona: OnboardingPersona, stepKey: string): boolean =>
  stepKey === 'media' && ['artist', 'venue', 'promoter'].includes(persona);

export const hydrateMediaStepData = (
  persona: OnboardingPersona,
  data: OnboardingStepData,
): MediaStepRequest => {
  const bannerImage = reference(data.bannerImage);
  if (persona === 'artist') {
    const spotifyIdentity = data.spotifyArtistIdentity as Record<string, unknown> | null | undefined;
    return {
      bannerImage,
      showcaseImages: references(data.showcaseImages),
      websiteUrl: typeof data.websiteUrl === 'string' ? data.websiteUrl : null,
      bandcampConnection: connectionReference(data.bandcampConnection, 'BANDCAMP'),
      instagramConnection: connectionReference(data.instagramConnection, 'INSTAGRAM'),
      tiktokConnection: connectionReference(data.tiktokConnection, 'TIKTOK'),
      spotifyArtistIdentity: typeof spotifyIdentity?.externalArtistId === 'string'
        && spotifyIdentity.externalArtistId.trim()
        ? { externalArtistId: spotifyIdentity.externalArtistId.trim() }
        : null,
      youtubeConnection: connectionReference(data.youtubeConnection, 'YOUTUBE'),
      soundCloudConnection: connectionReference(data.soundCloudConnection, 'SOUNDCLOUD'),
    };
  }

  if (persona === 'venue') {
    return {
      bannerImage,
      websiteUrl: typeof data.websiteUrl === 'string' ? data.websiteUrl : null,
      galleryImages: references(data.galleryImages),
      instagramConnection: connectionReference(data.instagramConnection, 'INSTAGRAM'),
      facebookConnection: connectionReference(data.facebookConnection, 'FACEBOOK'),
      tiktokConnection: connectionReference(data.tiktokConnection, 'TIKTOK'),
    };
  }

  return {
    bannerImage,
    galleryImages: references(data.galleryImages),
    instagramConnection: connectionReference(data.instagramConnection, 'INSTAGRAM'),
    facebookConnection: connectionReference(data.facebookConnection, 'FACEBOOK'),
    tiktokConnection: connectionReference(data.tiktokConnection, 'TIKTOK'),
  };
};

export const withCanonicalMediaConnections = (
  persona: OnboardingPersona,
  data: MediaStepRequest,
  connections: readonly ExternalConnectionSummary[],
  spotifyIdentity?: ExternalArtistResult | null,
): MediaStepRequest => {
  if (persona === 'artist') {
    const artist = data as ArtistMediaStepRequest;
    return {
      ...artist,
      bandcampConnection: connectionFor(connections, 'BANDCAMP'),
      instagramConnection: connectionFor(connections, 'INSTAGRAM'),
      tiktokConnection: connectionFor(connections, 'TIKTOK'),
      youtubeConnection: connectionFor(connections, 'YOUTUBE'),
      soundCloudConnection: connectionFor(connections, 'SOUNDCLOUD'),
      spotifyArtistIdentity: spotifyIdentity ? { externalArtistId: spotifyIdentity.id } : null,
    };
  }
  if (persona === 'venue') {
    return {
      ...(data as VenueMediaStepRequest),
      instagramConnection: connectionFor(connections, 'INSTAGRAM'),
      facebookConnection: connectionFor(connections, 'FACEBOOK'),
      tiktokConnection: connectionFor(connections, 'TIKTOK'),
    };
  }
  return {
    ...(data as PromoterMediaStepRequest),
    instagramConnection: connectionFor(connections, 'INSTAGRAM'),
    facebookConnection: connectionFor(connections, 'FACEBOOK'),
    tiktokConnection: connectionFor(connections, 'TIKTOK'),
  };
};

export const galleryForMediaData = (data: MediaStepRequest): MediaReferenceDto[] =>
  'showcaseImages' in data ? data.showcaseImages : data.galleryImages;

export const withMediaReferences = (
  persona: OnboardingPersona,
  data: MediaStepRequest,
  bannerImage: MediaReferenceDto | null,
  galleryImages: MediaReferenceDto[],
): MediaStepRequest => persona === 'artist'
  ? { ...(data as ArtistMediaStepRequest), bannerImage, showcaseImages: galleryImages }
  : { ...(data as VenueMediaStepRequest | PromoterMediaStepRequest), bannerImage, galleryImages };

export const normalizeMediaStepForPayload = (
  persona: OnboardingPersona,
  data: MediaStepRequest,
): OnboardingStepData => {
  const normalized = {
    ...data,
    websiteUrl: 'websiteUrl' in data ? data.websiteUrl?.trim() || null : undefined,
  } as Record<string, unknown>;
  if (!('websiteUrl' in data)) delete normalized.websiteUrl;
  return normalized;
};

export const validateMediaStepData = (
  persona: OnboardingPersona,
  data: MediaStepRequest,
): MediaStepValidation => {
  const errors: Record<string, string | undefined> = {};
  if ('websiteUrl' in data && data.websiteUrl) {
    errors.websiteUrl = validateUrlValue(data.websiteUrl);
  }
  const gallery = galleryForMediaData(data);
  const unique = new Set(gallery.map((item) => item.mediaId));
  if (unique.size !== gallery.length) errors.gallery = 'Each image can appear only once.';
  if (gallery.length > MEDIA_GALLERY_LIMITS[persona]) {
    errors.gallery = `Add no more than ${MEDIA_GALLERY_LIMITS[persona]} images.`;
  }
  return { valid: !Object.values(errors).some(Boolean), errors };
};
