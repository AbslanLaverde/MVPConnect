import axios from 'axios';
import type { AxiosInstance } from 'axios';

const getApi = (): AxiosInstance => require('./api').default;

export type ExternalArtistSource =
  | 'SPOTIFY'
  | 'FREE_FORM'
  | 'FREE_FORM_SPOTIFY_UNAVAILABLE';
export type ExternalArtistResolutionStatus = 'RESOLVED' | 'UNRESOLVED' | 'RETRY_SPOTIFY';
export type ExternalArtistEnrichmentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
export type SpotifyAttemptStatus = 'NO_MATCH' | 'UNAVAILABLE';

export interface ExternalArtistResult {
  id: string;
  name: string;
  spotifyId?: string | null;
  spotifyUrl?: string | null;
  spotifyImageUrl?: string | null;
  source: ExternalArtistSource;
  resolutionStatus: ExternalArtistResolutionStatus;
  enrichmentStatus: ExternalArtistEnrichmentStatus;
}

export interface SpotifyArtistResult {
  spotifyId: string;
  name: string;
  spotifyUrl?: string | null;
  spotifyImageUrl?: string | null;
}

export interface ArtistReferenceProvider {
  searchLocal(query: string): Promise<ExternalArtistResult[]>;
  searchSpotify(query: string): Promise<SpotifyArtistResult[]>;
  resolveSpotify(spotifyId: string): Promise<ExternalArtistResult>;
  createFreeForm(
    displayName: string,
    spotifyAttemptStatus: SpotifyAttemptStatus,
  ): Promise<ExternalArtistResult>;
}

export const externalArtistProvider: ArtistReferenceProvider = {
  searchLocal: async (query) => {
    const response = await getApi().get<ExternalArtistResult[]>('/external-artists/search', {
      params: { q: query },
    });
    return response.data;
  },
  searchSpotify: async (query) => {
    const response = await getApi().get<SpotifyArtistResult[]>('/external-artists/search/spotify', {
      params: { q: query },
    });
    return response.data;
  },
  resolveSpotify: async (spotifyId) => {
    const response = await getApi().post<ExternalArtistResult>('/external-artists/resolve', {
      provider: 'SPOTIFY',
      providerArtistId: spotifyId,
    });
    return response.data;
  },
  createFreeForm: async (displayName, spotifyAttemptStatus) => {
    const response = await getApi().post<ExternalArtistResult>('/external-artists/free-form', {
      displayName,
      spotifyAttemptStatus,
    });
    return response.data;
  },
};

export const isSpotifyUnavailableError = (error: unknown): boolean =>
  axios.isAxiosError(error)
  && error.response?.data?.code === 'SPOTIFY_UNAVAILABLE';
