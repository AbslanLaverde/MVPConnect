import React from 'react';
import 'react-native-gesture-handler/jestSetup';
import { act, render, waitFor } from '@testing-library/react-native';
import { getPathFromState, getStateFromPath } from '@react-navigation/native';
import { AppNavigator } from '../AppNavigator';
import { rootNavigation } from '../rootNavigation';
import type { StartupRoute } from '../../auth/startupEntry';
import { appLinking } from '../appLinking';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context/jest/mock').default,
}));
jest.mock('../../screens/LoginScreen', () => ({ LoginScreen: () => null }));
jest.mock('../../screens/SignupScreen', () => ({ SignupScreen: () => null }));
jest.mock('../../screens/ProfileScreen', () => ({ ProfileScreen: () => null }));
jest.mock('../../onboarding/OnboardingShell', () => ({ OnboardingShell: () => null }));
jest.mock('../../screens/OAuthResultScreen', () => ({ OAuthResultScreen: () => null }));
jest.mock('../../screens/WelcomeScreen', () => ({ WelcomeScreen: () => null }));
jest.mock('../../home/artist/ArtistHomeScreen', () => ({ ArtistHomeScreen: () => null }));
jest.mock('../../home/venue/VenueHomeScreen', () => ({ VenueHomeScreen: () => null }));
jest.mock('../../home/promoter/PromoterHomeScreen', () => ({ PromoterHomeScreen: () => null }));
jest.mock('../../onboarding/onboardingApi', () => ({ useGetSelfAccountQuery: () => ({}) }));
jest.mock('../../auth/session', () => {
  const snapshot = { status: 'authenticated', userType: 'MUSICIAN', generation: 1 };
  return { sessionController: { subscribe: () => () => {}, getSnapshot: () => snapshot } };
});

it.each([
  { name: 'AuthenticatedApp', params: { screen: 'ArtistHome' } },
  { name: 'AuthenticatedApp', params: { screen: 'VenueHome' } },
  { name: 'AuthenticatedApp', params: { screen: 'PromoterHome' } },
  { name: 'Onboarding', params: { persona: 'artist', step: 'sound' } },
  { name: 'OAuthResult', params: { attemptId: 'attempt-1', provider: 'YOUTUBE', status: 'SUCCEEDED' } },
] satisfies StartupRoute[])('mounts $name as the only root route, with no Login or Welcome behind Back', async (route) => {
  const view = render(<AppNavigator initialRoute={route} />);
  await waitFor(() => expect(rootNavigation.isReady()).toBe(true));
  expect(rootNavigation.getRootState().routes.map(({ name }) => name)).toEqual([route.name]);
  expect(rootNavigation.getRootState().index).toBe(0);
  expect(rootNavigation.canGoBack()).toBe(false);
  if (route.name === 'AuthenticatedApp') {
    expect(rootNavigation.getCurrentRoute()?.name).toBe(route.params.screen);
    expect(view.getByTestId('authenticated-header')).toBeTruthy();
  } else expect(view.queryByTestId('authenticated-header')).toBeNull();
  view.unmount();
});

it.each(['ArtistHome', 'VenueHome', 'PromoterHome'])('renders parsed /%s inside the existing shell', async (home) => {
  const view = render(<AppNavigator initialRoute={{ name: 'AuthenticatedApp', params: { screen: 'ArtistHome' } }} />);
  await waitFor(() => expect(rootNavigation.isReady()).toBe(true));
  const state = getStateFromPath(`/${home}`, appLinking.config);
  expect(state).toBeDefined();
  act(() => rootNavigation.resetRoot(state!));
  await waitFor(() => expect(rootNavigation.getCurrentRoute()?.name).toBe(home));
  expect(rootNavigation.getRootState().routes.map(({ name }) => name)).toEqual(['AuthenticatedApp']);
  expect(view.getAllByTestId('authenticated-header')).toHaveLength(1);
  expect(rootNavigation.canGoBack()).toBe(false);
  expect(getPathFromState(rootNavigation.getRootState(), appLinking.config)).toBe(`/${home}`);
  view.unmount();
});
