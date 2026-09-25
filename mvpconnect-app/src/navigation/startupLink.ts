import { Linking, Platform } from 'react-native';
import { parseOAuthReturn, type ParsedOAuthReturn } from '../services/externalConnectionService';

export type StartupLink = { oauth: ParsedOAuthReturn } | {
  auth: 'Login' | 'Signup' | 'SignupArtist' | 'SignupVenue' | 'SignupPromoter';
} | null;

export function parseStartupLink(value: string | null, webOrigin?: string): StartupLink {
  if (!value) return null;
  const oauth = parseOAuthReturn(value, webOrigin ? [webOrigin] : undefined);
  if (oauth) return { oauth };
  try {
    const url = new URL(value);
    const native = url.protocol === 'mvpconnect:';
    if (!native && (!webOrigin || url.origin !== webOrigin)) return null;
    const path = native ? `/${url.hostname}${url.pathname}` : url.pathname;
    const routes = { '/login': 'Login', '/signup': 'Signup', '/signup/artist': 'SignupArtist',
      '/signup/venue': 'SignupVenue', '/signup/promoter': 'SignupPromoter' } as const;
    const auth = routes[path as keyof typeof routes];
    return auth ? { auth } : null;
  } catch { return null; }
}

export async function captureStartupLink(): Promise<StartupLink> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return parseStartupLink(window.location.href, window.location.origin);
  }
  return parseStartupLink(await Linking.getInitialURL());
}
