import { Linking, Platform } from 'react-native';
import api from './api';

export type ExternalProvider =
  | 'SPOTIFY'
  | 'YOUTUBE'
  | 'SOUNDCLOUD'
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'BANDCAMP'
  | 'FACEBOOK';

export type ExternalConnectionMethod = 'OAUTH' | 'PROFILE_URL' | 'PROVIDER_SEARCH';
export type ExternalConnectionStatus = 'CONNECTED' | 'UNVERIFIED' | 'ERROR';
export type OAuthAttemptStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';
export type ConnectionPersona = 'MUSICIAN' | 'VENUE' | 'PROMOTER';

export interface ExternalConnectionSummary {
  connectionId: string | null;
  provider: ExternalProvider;
  connectionMethod: ExternalConnectionMethod;
  status: ExternalConnectionStatus;
  displayName?: string | null;
  profileUrl?: string | null;
  providerImageUrl?: string | null;
  connectedAt?: string | null;
  updatedAt?: string | null;
  actionCode?: string | null;
}

export interface PublicExternalConnection {
  provider: ExternalProvider;
  displayName?: string | null;
  profileUrl?: string | null;
  providerImageUrl?: string | null;
}

export interface OAuthConnectionStart {
  attemptId: string;
  provider: 'YOUTUBE' | 'SOUNDCLOUD';
  authorizationUrl: string;
  expiresAt: string;
}

export interface OAuthConnectionResult {
  attemptId: string;
  provider: 'YOUTUBE' | 'SOUNDCLOUD';
  status: OAuthAttemptStatus;
  connection?: ExternalConnectionSummary | null;
  errorCode?: string | null;
  expiresAt: string;
  updatedAt: string;
}

export interface ParsedOAuthReturn {
  attemptId: string;
  provider: 'YOUTUBE' | 'SOUNDCLOUD';
  status: 'SUCCEEDED' | 'FAILED';
}

export const URL_PROVIDERS_BY_PERSONA: Record<ConnectionPersona, readonly ExternalProvider[]> = {
  MUSICIAN: ['INSTAGRAM', 'TIKTOK', 'BANDCAMP'],
  VENUE: ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'],
  PROMOTER: ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'],
};

export const OAUTH_PROVIDERS_BY_PERSONA: Record<ConnectionPersona, readonly ExternalProvider[]> = {
  MUSICIAN: ['YOUTUBE', 'SOUNDCLOUD'],
  VENUE: [],
  PROMOTER: [],
};

export const externalConnectionService = {
  list: async (): Promise<ExternalConnectionSummary[]> => {
    const response = await api.get<ExternalConnectionSummary[]>('/external-connections');
    return response.data;
  },

  upsertUrl: async (
    provider: ExternalProvider,
    profile: string,
    displayName?: string,
  ): Promise<ExternalConnectionSummary> => {
    const response = await api.put<ExternalConnectionSummary>('/external-connections/url', {
      provider,
      profile,
      displayName: displayName?.trim() || null,
    });
    return response.data;
  },

  remove: async (provider: ExternalProvider): Promise<void> => {
    await api.delete(`/external-connections/${provider}`);
  },

  startOAuth: async (
    provider: 'YOUTUBE' | 'SOUNDCLOUD',
    returnTarget: string,
  ): Promise<OAuthConnectionStart> => {
    const response = await api.post<OAuthConnectionStart>(
      `/external-connections/oauth/${provider}/start`,
      { returnTarget },
    );
    return response.data;
  },

  status: async (attemptId: string): Promise<OAuthConnectionResult> => {
    const response = await api.get<OAuthConnectionResult>(
      `/external-connections/oauth/attempts/${encodeURIComponent(attemptId)}`,
    );
    return response.data;
  },
};

export const startExternalOAuth = async (
  provider: 'YOUTUBE' | 'SOUNDCLOUD',
  returnTarget = oauthReturnTarget(),
): Promise<OAuthConnectionStart> => {
  const attempt = await externalConnectionService.startOAuth(provider, returnTarget);
  await Linking.openURL(attempt.authorizationUrl);
  return attempt;
};

export const oauthReturnTarget = (): string => {
  const configured = process.env.EXPO_PUBLIC_OAUTH_RETURN_TARGET?.trim();
  if (configured) return configured;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/oauth/result`;
  }
  return 'mvpconnect://oauth/result';
};

const OAUTH_PROVIDERS = new Set(['YOUTUBE', 'SOUNDCLOUD']);
const OAUTH_RESULTS = new Set(['SUCCEEDED', 'FAILED']);
const SECRET_QUERY_PARAMETERS = ['access_token', 'refresh_token', 'code', 'token'];
const SAFE_RETURN_PARAMETERS = new Set(['attemptId', 'provider', 'status']);

export const parseOAuthReturnParameters = (
  parameters: Record<string, unknown>,
): ParsedOAuthReturn | null => {
  const keys = Object.keys(parameters);
  if (keys.some((key) => SECRET_QUERY_PARAMETERS.includes(key) || !SAFE_RETURN_PARAMETERS.has(key))) {
    return null;
  }
  const attemptId = typeof parameters.attemptId === 'string' ? parameters.attemptId.trim() : '';
  const provider = parameters.provider;
  const status = parameters.status;
  if (!attemptId || !/^[A-Za-z0-9._~-]{1,255}$/.test(attemptId)
    || typeof provider !== 'string' || !OAUTH_PROVIDERS.has(provider)
    || typeof status !== 'string' || !OAUTH_RESULTS.has(status)) return null;
  return {
    attemptId,
    provider: provider as ParsedOAuthReturn['provider'],
    status: status as ParsedOAuthReturn['status'],
  };
};

export const parseOAuthReturn = (
  value: string,
  allowedWebOrigins: readonly string[] = [
    'http://localhost:19006',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8097',
  ],
): ParsedOAuthReturn | null => {
  try {
    const url = new URL(value);
    const nativeTarget = url.protocol === 'mvpconnect:'
      && url.hostname === 'oauth'
      && url.pathname === '/result';
    const webTarget = allowedWebOrigins.includes(url.origin) && url.pathname === '/oauth/result';
    if (!nativeTarget && !webTarget) return null;
    return parseOAuthReturnParameters(Object.fromEntries(url.searchParams.entries()));
  } catch {
    return null;
  }
};
