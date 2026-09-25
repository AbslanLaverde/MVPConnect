import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../services/apiConfig';
import { AuthRequestError } from './authErrors';
import type { AccessResponse, AuthTransport, LoginResponse, NativeResponse } from './authTypes';

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  SESSION_INVALID: 'Your session expired. Sign in again to continue.',
  EMAIL_ALREADY_REGISTERED: 'This email is already registered. Please sign in instead.',
  AUTH_REQUEST_INVALID: 'Please check your account details and try again.',
  AUTH_TRANSPORT_INVALID: 'Authentication is unavailable in this environment.',
  AUTH_ORIGIN_FORBIDDEN: 'Authentication is unavailable from this origin.',
  AUTH_SERVICE_UNAVAILABLE: 'Authentication is temporarily unavailable. Please try again.',
};

// Independent client: auth calls can never recurse through the ordinary API refresh interceptor.
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: Platform.OS === 'web',
  headers: { 'Content-Type': 'application/json', 'X-MVP-Client': Platform.OS === 'web' ? 'web' : 'native' },
});

function validateAccess(value: any): asserts value is AccessResponse {
  if (!value || typeof value.accessToken !== 'string' || !value.accessToken
    || value.tokenType !== 'Bearer' || typeof value.sessionId !== 'string' || !value.sessionId
    || !Number.isFinite(value.expiresIn) || value.expiresIn <= 0 || value.expiresIn > 1800
    || (Platform.OS === 'web' ? Object.hasOwn(value, 'refreshToken')
      : typeof value.refreshToken !== 'string' || !value.refreshToken)) {
    throw new AuthRequestError('AUTH_CONTRACT_INVALID', 'Authentication returned an invalid session.');
  }
}

async function post<T>(path: string, body: object): Promise<T> {
  try {
    return (await client.post<T>(path, body)).data;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const supplied = axios.isAxiosError(error) ? error.response?.data?.code : undefined;
    const code = typeof supplied === 'string' && messages[supplied] ? supplied : 'AUTH_SERVICE_UNAVAILABLE';
    throw new AuthRequestError(code, messages[code], status);
  }
}

async function authenticate(path: string, body: object): Promise<LoginResponse | NativeResponse<LoginResponse>> {
  const result = await post<LoginResponse | NativeResponse<LoginResponse>>(path, body);
  validateAccess(result);
  if (!['MUSICIAN', 'VENUE', 'PROMOTER'].includes(result.userType)
    || !result.userId || typeof result.email !== 'string') {
    throw new AuthRequestError('AUTH_CONTRACT_INVALID', 'Authentication returned an invalid identity.');
  }
  return result;
}

function credentialBody(credential?: string): object {
  if (Platform.OS === 'web') {
    if (credential !== undefined) throw new AuthRequestError('AUTH_TRANSPORT_INVALID', messages.AUTH_TRANSPORT_INVALID);
    return {};
  }
  return credential === undefined ? {} : { refreshToken: credential };
}

export const authTransport: AuthTransport = {
  login: (input) => authenticate('/auth/login', input),
  signup: (persona, input) => authenticate(`/auth/signup/${persona}`, input),
  refresh: async (credential) => {
    const result = await post<AccessResponse | NativeResponse<AccessResponse>>('/auth/refresh', credentialBody(credential));
    validateAccess(result);
    return result;
  },
  logout: async (credential) => { await post('/auth/logout', credentialBody(credential)); },
};
