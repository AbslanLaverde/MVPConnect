import type { ExternalProvider } from '../services/externalConnectionService';

export interface MediaReferenceDto {
  mediaId: string;
}

export interface ExternalConnectionReferenceDto {
  connectionId: string;
  provider: ExternalProvider;
}

export interface ArtistIdentityReferenceDto {
  externalArtistId: string;
}

export interface ArtistMediaStepRequest {
  bannerImage: MediaReferenceDto | null;
  showcaseImages: MediaReferenceDto[];
  websiteUrl: string | null;
  bandcampConnection: ExternalConnectionReferenceDto | null;
  instagramConnection: ExternalConnectionReferenceDto | null;
  tiktokConnection: ExternalConnectionReferenceDto | null;
  spotifyArtistIdentity: ArtistIdentityReferenceDto | null;
  youtubeConnection: ExternalConnectionReferenceDto | null;
  soundCloudConnection: ExternalConnectionReferenceDto | null;
}

export interface VenueMediaStepRequest {
  bannerImage: MediaReferenceDto | null;
  websiteUrl: string | null;
  galleryImages: MediaReferenceDto[];
  instagramConnection: ExternalConnectionReferenceDto | null;
  facebookConnection: ExternalConnectionReferenceDto | null;
  tiktokConnection: ExternalConnectionReferenceDto | null;
}

export interface PromoterMediaStepRequest {
  bannerImage: MediaReferenceDto | null;
  galleryImages: MediaReferenceDto[];
  instagramConnection: ExternalConnectionReferenceDto | null;
  facebookConnection: ExternalConnectionReferenceDto | null;
  tiktokConnection: ExternalConnectionReferenceDto | null;
}

export const MEDIA_GALLERY_LIMITS = {
  artist: 8,
  venue: 10,
  promoter: 10,
} as const;

export const MEDIA_GALLERY_TIPS = {
  artist: {
    title: 'Tips for a great Artist gallery',
    items: [
      'Mix live shots with portraits or band photos',
      'Show the energy of an actual performance',
      'Include a few wider shots that give stage and crowd context',
      'Choose sharp, well-lit images where people can clearly see you',
      'Use different moments and perspectives instead of near-duplicates',
      'Pick photos that feel like you, not just the most polished ones',
    ],
  },
  venue: {
    title: 'Tips for showing your space',
    items: [
      'Show the stage both empty and during a real show',
      'Include a wide view that makes the room’s size and layout clear',
      'Show the crowd so artists can understand the room’s atmosphere',
      'Include useful spaces like backstage, green room, bar, or load-in areas when relevant',
      'Include an exterior/entrance shot so people recognize the venue',
      'Choose different perspectives instead of ten versions of the same angle',
    ],
  },
  promoter: {
    title: 'Tips for showing your work',
    items: [
      'Show real events with real crowds and energy',
      'Mix event photography with a few strong flyers or posters',
      'Include different rooms, markets, or event sizes if they represent your work',
      'Show both the audience experience and what happens around the stage',
      'Choose visuals that make your event identity and style recognizable',
      'Prioritize your strongest work over uploading ten similar images',
    ],
  },
} as const;
