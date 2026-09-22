import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGetSelfAccountQuery } from '../../../onboarding/onboardingApi';
import { theme } from '../../../theme/theme';
import { PromoterHomeScreen } from '../PromoterHomeScreen';

jest.mock('../../../onboarding/onboardingApi', () => ({
  useGetSelfAccountQuery: jest.fn(),
}));

const mockedSelfQuery = useGetSelfAccountQuery as jest.Mock;

const renderScreen = () => render(
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 800 },
      insets: { top: 24, right: 0, bottom: 16, left: 0 },
    }}
  >
    <PromoterHomeScreen
      navigation={{} as any}
      route={{ key: 'promoter-home', name: 'PromoterHome' }}
    />
  </SafeAreaProvider>,
);

describe('PromoterHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    mockedSelfQuery.mockReturnValue({
      data: {
        id: 'promoter-1',
        persona: 'PROMOTER',
        displayName: 'Night Signal Presents',
        email: 'promoter@example.com',
        profileImage: {
          mediaId: 'profile-1',
          url: 'https://media.example/night-signal.jpg',
          mimeType: 'image/jpeg',
        },
        specialties: ['SHOWCASE'],
        genres: ['Indie Rock'],
        markets: ['Brooklyn, NY'],
        rosterSize: 'SIX_TO_TEN',
        websiteUrl: 'https://night-signal.example',
        connectionGoals: ['FIND_ARTISTS'],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders authenticated Promoter identity, shared greeting, supporting copy, and profile image', () => {
    const screen = renderScreen();
    expect(screen.getByText('PROMOTER')).toBeTruthy();
    const heading = screen.getByText('GOOD AFTERNOON, Night Signal Presents');
    expect(heading).toBeTruthy();
    expect(StyleSheet.flatten(heading.props.style).textTransform).toBe('uppercase');
    expect(screen.getByText('Here’s what’s happening across your network.')).toBeTruthy();
    expect(screen.getByTestId('promoter-home-avatar').props.source.uri)
      .toBe('https://media.example/night-signal.jpg');
  });

  it('uses the Promoter electric-blue accent without changing shared Home structure', () => {
    mockedSelfQuery.mockReturnValue({
      data: {
        id: 'promoter-1', persona: 'PROMOTER', displayName: 'Night Signal Presents',
        email: 'promoter@example.com', profileImage: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
    const screen = renderScreen();
    const contextStyle = StyleSheet.flatten(screen.getByText('PROMOTER').props.style);
    const fallbackStyle = StyleSheet.flatten(
      screen.getByTestId('promoter-home-avatar-fallback', { includeHiddenElements: true }).props.style,
    );
    const initialsStyle = StyleSheet.flatten(
      screen.getByText('NS', { includeHiddenElements: true }).props.style,
    );

    expect(contextStyle.color).toBe(theme.personas.promoter.accent);
    expect(fallbackStyle.borderColor).toBe(theme.colors.promoterBorder);
    expect(initialsStyle.color).toBe(theme.personas.promoter.accent);
  });

  it('renders Attention with the truthful shared empty state', () => {
    const screen = renderScreen();
    expect(screen.getByText('NEEDS YOUR ATTENTION')).toBeTruthy();
    expect(screen.getByText('YOU’RE ALL CAUGHT UP')).toBeTruthy();
    expect(screen.getByText('Nothing needs your attention right now.')).toBeTruthy();
  });

  it('does not turn canonical Promoter profile fields or future modules into Home content', () => {
    const screen = renderScreen();
    [
      'SHOWCASE',
      'Indie Rock',
      'Brooklyn, NY',
      'SIX_TO_TEN',
      'https://night-signal.example',
      'FIND_ARTISTS',
    ].forEach((value) => expect(screen.queryByText(value)).toBeNull());
    expect(screen.queryByText(/OPPORTUNITIES/i)).toBeNull();
    expect(screen.queryByText(/QUICK ACTIONS/i)).toBeNull();
    expect(screen.queryByText(/ROSTER/i)).toBeNull();
    expect(screen.queryByText(/VENUE NETWORK/i)).toBeNull();
    expect(screen.queryByText(/DISCOVER ARTISTS/i)).toBeNull();
    expect(screen.queryByText(/GOOD CONNECT|GREAT CONNECT|MVP CONNECT/i)).toBeNull();
    expect(screen.queryByText(/BOARD/i)).toBeNull();
  });

  it('keeps the Home shell and Attention visible while identity loads', () => {
    mockedSelfQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: jest.fn(),
    });
    const screen = renderScreen();
    expect(screen.getByTestId('home-shell')).toBeTruthy();
    expect(screen.getByLabelText('Loading Promoter identity')).toBeTruthy();
    expect(screen.getByTestId('promoter-home-avatar-loading')).toBeTruthy();
    expect(screen.getByText('NEEDS YOUR ATTENTION')).toBeTruthy();
  });

  it('keeps the frame visible and retries an identity failure', () => {
    const refetch = jest.fn();
    mockedSelfQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    });
    const screen = renderScreen();
    expect(screen.getByTestId('home-shell')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Retry loading Promoter Home'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
