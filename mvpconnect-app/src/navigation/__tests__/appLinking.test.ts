import { getPathFromState, getStateFromPath } from '@react-navigation/native';
import { appLinking } from '../appLinking';

const homes = ['ArtistHome', 'VenueHome', 'PromoterHome'] as const;

it.each(homes)('serializes nested %s without the shell route in the URL', (home) => {
  const state = { routes: [{ name: 'AuthenticatedApp', state: { routes: [{ name: home }] } }] };
  const path = getPathFromState(state, appLinking.config);
  expect(path).toBe(`/${home}`);
  expect(path).not.toContain('AuthenticatedApp');
});

it.each(homes)('parses /%s into the shared authenticated branch and round-trips canonically', (home) => {
  const state = getStateFromPath(`/${home}`, appLinking.config);
  expect(state).toEqual({ routes: [{ name: 'AuthenticatedApp', state: {
    routes: [{ name: home, path: `/${home}` }],
  } }] });
  expect(getPathFromState(state!, appLinking.config)).toBe(`/${home}`);
});

it.each(homes)('does not register the old generated /AuthenticatedApp/%s path', (home) => {
  expect(getStateFromPath(`/AuthenticatedApp/${home}`, appLinking.config)).toBeUndefined();
});

it.each([
  ['Login', '/login'],
  ['Signup', '/signup'],
  ['SignupArtist', '/signup/artist'],
  ['SignupVenue', '/signup/venue'],
  ['SignupPromoter', '/signup/promoter'],
  ['Welcome', '/welcome'],
] as const)('preserves the existing %s path %s', (name, path) => {
  expect(getPathFromState({ routes: [{ name }] }, appLinking.config)).toBe(path);
  expect(getStateFromPath(path, appLinking.config)).toEqual({ routes: [{ name, path }] });
});

it('preserves the onboarding path and its persona/step parameters', () => {
  const route = { name: 'Onboarding', params: { persona: 'venue', step: 'media' } };
  const path = '/onboarding/venue/media';
  expect(getPathFromState({ routes: [route] }, appLinking.config)).toBe(path);
  expect(getStateFromPath(path, appLinking.config)).toEqual({ routes: [{ ...route, path }] });
});

it('preserves the OAuth callback path and query parameters', () => {
  const route = { name: 'OAuthResult', params: { attemptId: 'safe-attempt', provider: 'YOUTUBE', status: 'SUCCEEDED' } };
  const path = '/oauth/result?attemptId=safe-attempt&provider=YOUTUBE&status=SUCCEEDED';
  expect(getPathFromState({ routes: [route] }, appLinking.config)).toBe(path);
  expect(getStateFromPath(path, appLinking.config)).toEqual({ routes: [{ ...route, path }] });
});

it('keeps legacy Profile unlinked', () => {
  expect(appLinking.config?.screens.Profile).toBeUndefined();
  expect(getStateFromPath('/Profile', appLinking.config)).toBeUndefined();
  expect(getStateFromPath('/Profile/user-1', appLinking.config)).toBeUndefined();
});

it('keeps cold-link handling owned by session bootstrap', async () => {
  expect(appLinking.prefixes).toEqual(['mvpconnect://']);
  expect(await appLinking.getInitialURL?.()).toBeNull();
});
