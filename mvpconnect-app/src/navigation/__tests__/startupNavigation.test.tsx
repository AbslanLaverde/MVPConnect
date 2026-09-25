import React from 'react';
import 'react-native-gesture-handler/jestSetup';
import { render, waitFor } from '@testing-library/react-native';
import { AppNavigator } from '../AppNavigator';
import { rootNavigation } from '../rootNavigation';
import type { StartupRoute } from '../../auth/startupEntry';

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

it.each<StartupRoute>([
  { name: 'ArtistHome' }, { name: 'VenueHome' }, { name: 'PromoterHome' },
  { name: 'Onboarding', params: { persona: 'artist', step: 'sound' } },
  { name: 'OAuthResult', params: { attemptId: 'attempt-1', provider: 'YOUTUBE', status: 'SUCCEEDED' } },
])('mounts $name as the only root route, with no Login or Welcome behind Back', async (route) => {
  const view = render(<AppNavigator initialRoute={route} />);
  await waitFor(() => expect(rootNavigation.isReady()).toBe(true));
  expect(rootNavigation.getRootState().routes.map(({ name }) => name)).toEqual([route.name]);
  expect(rootNavigation.getRootState().index).toBe(0);
  expect(rootNavigation.canGoBack()).toBe(false);
  view.unmount();
});
