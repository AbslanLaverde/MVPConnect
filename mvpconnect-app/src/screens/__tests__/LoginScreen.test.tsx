import { sessionController } from '../../auth/session';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authAPI } from '../../services/api';
import { fetchOnboardingState, onboardingApi } from '../../onboarding/onboardingApi';
import { store } from '../../store/store';
import { LoginScreen } from '../LoginScreen';

jest.mock('../../auth/session', () => ({ sessionController: { isCurrent: jest.fn(() => true) } }));

jest.mock('../../services/api', () => ({
  authAPI: { login: jest.fn() },

}));

jest.mock('../../onboarding/onboardingApi', () => ({
  fetchOnboardingState: jest.fn(),
  onboardingApi: {
    util: {
      resetApiState: jest.fn(() => ({ type: 'reset-onboarding-api' })),
      upsertQueryData: jest.fn(() => ({ type: 'seed-onboarding-cache' })),
    },
  },
}));

jest.mock('../../store/store', () => ({
  store: { dispatch: jest.fn(() => Promise.resolve()) },
}));

jest.mock('../../components/MatchShowcase', () => ({
  MatchShowcase: () => null,
}));

jest.mock('../../components/Button', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ title, onPress, accessibilityLabel, disabled, loading }: any) => (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
      >
        <Text>{loading ? 'LOADING' : title}</Text>
      </Pressable>
    ),
  };
});

jest.mock('../../../assets/branding/mvpconnect-logo-native.png', () => ({
  testUri: 'mvpconnect-logo-native.png',
}));

const mockedLogin = authAPI.login as jest.Mock;

const mockedFetchOnboarding = fetchOnboardingState as jest.Mock;
const mockedDispatch = store.dispatch as jest.Mock;

const onboardingState = (
  persona: 'MUSICIAN' | 'VENUE' | 'PROMOTER',
  status: 'IN_PROGRESS' | 'READY' | 'COMPLETED',
) => ({
  persona,
  status,
  currentStep: status === 'COMPLETED' ? null : persona === 'MUSICIAN' ? 'sound' : persona === 'VENUE' ? 'music' : 'specialties',
  onboardingVersion: 2,
  steps: status === 'COMPLETED' ? [] : [{
    key: persona === 'MUSICIAN' ? 'sound' : persona === 'VENUE' ? 'music' : 'specialties',
    position: 2,
    required: true,
    status: status === 'READY' ? 'COMPLETE' : 'IN_PROGRESS',
    data: {},
  }],
});

const renderScreen = (notice?: 'SESSION_EXPIRED') => {
  const navigation = { replace: jest.fn(), navigate: jest.fn(), setParams: jest.fn() } as any;
  const screen = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 800 },
        insets: { top: 24, right: 0, bottom: 16, left: 0 },
      }}
    >
      <LoginScreen navigation={navigation} route={{ key: 'login', name: 'Login', params: { sessionNotice: notice } }} />
    </SafeAreaProvider>,
  );
  fireEvent.changeText(screen.getByLabelText('EMAIL, required'), 'artist@example.com');
  fireEvent.changeText(screen.getByLabelText('PASSWORD, required'), 'password');
  return { ...screen, navigation };
};

describe('LoginScreen authenticated entry routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLogin.mockResolvedValue({
      accessToken: 'token',
      tokenType: 'Bearer',
      userType: 'MUSICIAN',
      userId: 'artist-1',
      email: 'artist@example.com',
      name: 'Glass Houses',
    });

    mockedDispatch.mockResolvedValue(undefined);
  });

  it('consumes the typed expiry notice once and clears it when signing in', async () => {
    mockedFetchOnboarding.mockResolvedValue(onboardingState('MUSICIAN', 'COMPLETED'));
    const screen = renderScreen('SESSION_EXPIRED');
    expect(screen.getByText('Your session expired. Sign in again to continue.')).toBeTruthy();
    expect(screen.navigation.setParams).toHaveBeenCalledWith({ sessionNotice: undefined });
    fireEvent.press(screen.getByLabelText('Sign in to your account'));
    await waitFor(() => expect(screen.navigation.replace).toHaveBeenCalledWith('ArtistHome'));
    expect(screen.queryByText('Your session expired. Sign in again to continue.')).toBeNull();
  });

  it('shows no expired-session notice after explicit Sign Out', () => {
    expect(renderScreen().queryByText('Your session expired. Sign in again to continue.')).toBeNull();
  });

  it('does not resurrect onboarding or populate cache after session exit during entry lookup', async () => {
    (sessionController.isCurrent as jest.Mock).mockReturnValueOnce(false);
    mockedFetchOnboarding.mockResolvedValue(onboardingState('MUSICIAN', 'COMPLETED'));
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText('Sign in to your account'));
    await waitFor(() => expect(mockedFetchOnboarding).toHaveBeenCalled());
    expect(screen.navigation.replace).not.toHaveBeenCalled();
    expect(onboardingApi.util.upsertQueryData).not.toHaveBeenCalled();
  });

  it('routes a completed Artist directly to Artist Home and not Welcome or MusicianHome', async () => {
    mockedFetchOnboarding.mockResolvedValue(onboardingState('MUSICIAN', 'COMPLETED'));
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText('Sign in to your account'));

    await waitFor(() => expect(screen.navigation.replace).toHaveBeenCalledWith('ArtistHome'));
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('MusicianHome', expect.anything());
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('Welcome');


    expect(onboardingApi.util.upsertQueryData).toHaveBeenCalledTimes(1);
  });

  it.each(['IN_PROGRESS', 'READY'] as const)('keeps a %s Artist in onboarding', async (status) => {
    mockedFetchOnboarding.mockResolvedValue(onboardingState('MUSICIAN', status));
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText('Sign in to your account'));

    await waitFor(() => expect(screen.navigation.replace).toHaveBeenCalledWith('Onboarding', {
      persona: 'artist',
      step: 'sound',
    }));
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('ArtistHome');
  });

  it('routes a completed Venue directly to Venue Home', async () => {
    mockedLogin.mockResolvedValue({
      accessToken: 'token', tokenType: 'Bearer', userType: 'VENUE', userId: 'venue-1',
      email: 'venue@example.com', name: 'The Marlowe Room',
    });
    mockedFetchOnboarding.mockResolvedValue(onboardingState('VENUE', 'COMPLETED'));
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText('Sign in to your account'));

    await waitFor(() => expect(screen.navigation.replace).toHaveBeenCalledWith('VenueHome'));
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('ArtistHome');
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('MusicianHome', expect.anything());
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('Welcome');
  });

  it.each(['IN_PROGRESS', 'READY'] as const)('keeps a %s Venue in onboarding', async (status) => {
    mockedLogin.mockResolvedValue({
      accessToken: 'token', tokenType: 'Bearer', userType: 'VENUE', userId: 'venue-1',
      email: 'venue@example.com', name: 'The Marlowe Room',
    });
    mockedFetchOnboarding.mockResolvedValue(onboardingState('VENUE', status));
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText('Sign in to your account'));

    await waitFor(() => expect(screen.navigation.replace).toHaveBeenCalledWith('Onboarding', {
      persona: 'venue',
      step: 'music',
    }));
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('VenueHome');
  });

  it('routes a completed Promoter directly to Promoter Home', async () => {
    mockedLogin.mockResolvedValue({
      accessToken: 'token', tokenType: 'Bearer', userType: 'PROMOTER', userId: 'promoter-1',
      email: 'account@example.com', name: 'Night Signal Presents',
    });
    mockedFetchOnboarding.mockResolvedValue(onboardingState('PROMOTER', 'COMPLETED'));
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText('Sign in to your account'));

    await waitFor(() => expect(screen.navigation.replace).toHaveBeenCalledWith('PromoterHome'));
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('ArtistHome');
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('VenueHome');
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('Welcome');
  });

  it.each(['IN_PROGRESS', 'READY'] as const)('keeps a %s Promoter in onboarding', async (status) => {
    mockedLogin.mockResolvedValue({
      accessToken: 'token', tokenType: 'Bearer', userType: 'PROMOTER', userId: 'promoter-1',
      email: 'account@example.com', name: 'Night Signal Presents',
    });
    mockedFetchOnboarding.mockResolvedValue(onboardingState('PROMOTER', status));
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText('Sign in to your account'));

    await waitFor(() => expect(screen.navigation.replace).toHaveBeenCalledWith('Onboarding', {
      persona: 'promoter',
      step: 'specialties',
    }));
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('PromoterHome');
  });
});
