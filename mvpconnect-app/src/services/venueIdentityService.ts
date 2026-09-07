import axios from 'axios';
import type { AxiosInstance } from 'axios';

const getApi = (): AxiosInstance => require('./api').default;

export type VenueIdentitySource = 'GOOGLE' | 'FREE_FORM' | 'FREE_FORM_GOOGLE_UNAVAILABLE';
export type VenueIdentityResolutionStatus = 'RESOLVED' | 'UNRESOLVED' | 'RETRY_GOOGLE';
export type GoogleAttemptStatus = 'NO_MATCH' | 'UNAVAILABLE';

export interface VenueIdentityLocation {
  displayName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  neighborhood?: string | null;
}

export interface FreeFormVenueLocation extends VenueIdentityLocation {
  displayName: string;
  city: string;
  state: string;
  country: string;
}

export interface VenuePhotoAuthorAttribution {
  displayName?: string | null;
  uri?: string | null;
  photoUri?: string | null;
}

export interface VenuePhotoPresentation {
  url: string;
  authorAttributions: VenuePhotoAuthorAttribution[];
  googleMapsUri?: string | null;
}

export interface VenueIdentityResult {
  id: string;
  name: string;
  source: VenueIdentitySource;
  resolutionStatus: VenueIdentityResolutionStatus;
  googlePlaceId?: string | null;
  googleMapsUri?: string | null;
  providerWebsiteUrl?: string | null;
  googleBusinessStatus?: string | null;
  location?: VenueIdentityLocation | null;
  photo?: VenuePhotoPresentation | null;
}

export interface GoogleVenueResult {
  providerPlaceId: string;
  name: string;
  googleMapsUri?: string | null;
  providerWebsiteUrl?: string | null;
  googleBusinessStatus?: string | null;
  location?: VenueIdentityLocation | null;
  photo?: VenuePhotoPresentation | null;
}

export interface VenueReferenceProvider {
  searchLocal(query: string): Promise<VenueIdentityResult[]>;
  searchGoogle(query: string): Promise<GoogleVenueResult[]>;
  resolveGoogle(placeId: string): Promise<VenueIdentityResult>;
  createFreeForm(
    displayName: string,
    googleAttemptStatus: GoogleAttemptStatus,
    location?: FreeFormVenueLocation,
  ): Promise<VenueIdentityResult>;
}

export const venueIdentityProvider: VenueReferenceProvider = {
  searchLocal: async (query) => {
    const response = await getApi().get<VenueIdentityResult[]>('/venue-identities/search', {
      params: { q: query },
    });
    return response.data;
  },
  searchGoogle: async (query) => {
    const response = await getApi().get<GoogleVenueResult[]>('/venue-identities/search/google', {
      params: { q: query },
    });
    return response.data;
  },
  resolveGoogle: async (placeId) => {
    const response = await getApi().post<VenueIdentityResult>('/venue-identities/resolve', {
      provider: 'GOOGLE',
      providerPlaceId: placeId,
    });
    return response.data;
  },
  createFreeForm: async (displayName, googleAttemptStatus, location) => {
    const response = await getApi().post<VenueIdentityResult>('/venue-identities/free-form', {
      displayName,
      googleAttemptStatus,
      ...(location ? { location } : {}),
    });
    return response.data;
  },
};

export const isGooglePlacesUnavailableError = (error: unknown): boolean =>
  axios.isAxiosError(error)
  && error.response?.data?.code === 'GOOGLE_PLACES_UNAVAILABLE';
