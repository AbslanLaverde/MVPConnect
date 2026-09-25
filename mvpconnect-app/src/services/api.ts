import type { ExternalArtistResult } from './externalArtistService';
import type { PublicExternalConnection } from './externalConnectionService';
import { createAuthenticatedApi } from '../auth/authenticatedApi';
import { sessionController } from '../auth/session';
import type { SessionIdentity } from '../auth/authTypes';

const api = createAuthenticatedApi(sessionController);

// Auth API calls establish a complete session before returning non-secret identity to screens.
export interface SignupMusicianData {
  name: string;
  email: string;
  password: string;
  bio?: string;
  location?: string;
  genres?: string[];
  vibes?: string[];
  minimumFee?: string;
  willingToTravel?: boolean;
  websiteUrl?: string;
  instagramHandle?: string;
}

export interface SignupVenueData {
  venueName: string;
  email: string;
  password: string;
  description?: string;
  location?: string;
  capacity?: number;
  genrePreferences?: string[];
  ambience?: string[];
  typicalBudget?: string;
  liveMusic?: boolean;
  websiteUrl?: string;
}

export interface SignupPromoterData {
  businessName: string;
  email: string;
  password: string;
  bio?: string;
  location?: string;
  genreSpecialties?: string[];
  eventTypes?: string[];
  acceptingNewArtists?: boolean;
  currentRosterSize?: number;
  websiteUrl?: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export type AuthResponse = SessionIdentity;

export const authAPI = {
  signupMusician: (data: SignupMusicianData): Promise<AuthResponse> => sessionController.signup('musician', data),
  signupVenue: (data: SignupVenueData): Promise<AuthResponse> => sessionController.signup('venue', data),
  signupPromoter: (data: SignupPromoterData): Promise<AuthResponse> => sessionController.signup('promoter', data),
  login: (data: LoginData): Promise<AuthResponse> => sessionController.login(data),
};

export default api;

// ── Musician API ─────────────────────────────────────────────────

export interface MusicianProfile {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  location?: PublicLocation;
  profileImageUrl?: string;
  profileImage?: PublicProfileMedia;
  bannerImage?: PublicProfileMedia;
  galleryImages?: PublicProfileMedia[];
  externalConnections?: PublicExternalConnection[];
  spotifyArtistIdentity?: ExternalArtistResult | null;
  genres?: string[];
  vibes?: string[];
  minimumFee?: string;
  willingToTravel?: boolean;
  websiteUrl?: string;
  instagramHandle?: string;
}

export interface VenueProfile extends VenueSummary {
  description?: string;
  websiteUrl?: string;
  bannerImage?: PublicProfileMedia;
  galleryImages?: PublicProfileMedia[];
  externalConnections?: PublicExternalConnection[];
}

export interface MusicianProfileUpdate {
  bio?: string | null;
  location?: string | null;
  genres?: string[] | null;
  vibes?: string[] | null;
  minimumFee?: string | null;
  willingToTravel?: boolean | null;
  websiteUrl?: string | null;
  instagramHandle?: string | null;
}

export interface PublicProfileMedia {
  mediaId: string;
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface PublicLocation {
  displayName?: string;
  city?: string;
  state?: string;
  country?: string;
  neighborhood?: string;
}

export interface PublicVenueLocation extends PublicLocation {
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface MusicianSearchResult {
  id: string;
  name: string;
  location?: PublicLocation;
  genres?: string[];
  vibes?: string[];
  profileImage?: PublicProfileMedia;
}

export interface VenueSummary {
  id: string;
  venueName: string;
  location?: PublicVenueLocation;
  capacity?: number;
  genrePreferences?: string[];
  ambience?: string[];
  profileImage?: PublicProfileMedia;
}

export const musicianAPI = {
  getProfile: async (id: string): Promise<MusicianProfile> => {
    const response = await api.get(`/musicians/${id}`);
    return response.data;
  },

  updateProfile: async (id: string, data: MusicianProfileUpdate): Promise<void> => {
    await api.put(`/musicians/${id}`, data);
  },

  search: async (params?: { genre?: string; location?: string }): Promise<MusicianSearchResult[]> => {
    const response = await api.get('/musicians/search', { params });
    return response.data;
  },
};

export const venueAPI = {
  search: async (params?: {
    genre?: string;
    location?: string;
    minCapacity?: number;
    liveMusic?: boolean;
  }): Promise<VenueSummary[]> => {
    const response = await api.get('/venues/search', { params });
    return response.data;
  },

  getVenue: async (id: string): Promise<VenueProfile> => {
    const response = await api.get<VenueProfile>(`/venues/${id}`);
    return response.data;
  },
};
