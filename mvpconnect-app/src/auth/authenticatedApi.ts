import axios, { type AxiosInstance } from 'axios';
import { API_BASE_URL } from '../services/apiConfig';
import type { SessionController } from './sessionController';

declare module 'axios' {
  interface AxiosRequestConfig {
    _session?: { generation: number; tokenVersion: number; authenticated: boolean; retried: boolean };
  }
}

export function createAuthenticatedApi(session: SessionController): AxiosInstance {
  const client = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });
  client.interceptors.request.use((config) => {
    if (config._session) session.assertGeneration(config._session.generation);
    // This client is exclusively for MVPConnect API calls, never signed object-storage requests.
    if (config.baseURL !== API_BASE_URL || /^([a-z][a-z0-9+.-]*:)?\/\//i.test(config.url ?? '')) {
      throw new Error('External requests must use a separate client.');
    }
    const token = session.getAccessToken();
    config._session = {
      generation: session.getGeneration(), tokenVersion: session.getTokenVersion(),
      authenticated: !!token, retried: config._session?.retried ?? false,
    };
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    else config.headers.delete('Authorization');
    return config;
  });
  client.interceptors.response.use((response) => {
    if (response.config._session) session.assertGeneration(response.config._session.generation);
    return response;
  }, async (error) => {
    const config = error.config;
    const context = config?._session;
    if (!context) return Promise.reject(error);
    session.assertGeneration(context.generation);
    if (error.response?.status !== 401 || !context.authenticated || /\/auth\/(login|signup|refresh|logout)(\/|$)/.test(config.url ?? '')) {
      return Promise.reject(error);
    }
    if (context.retried) {
      await session.expire(context.generation);
      return Promise.reject(error);
    }
    await session.refresh(context.generation, context.tokenVersion);
    session.assertGeneration(context.generation);
    context.retried = true;
    return client.request(config);
  });
  return client;
}
