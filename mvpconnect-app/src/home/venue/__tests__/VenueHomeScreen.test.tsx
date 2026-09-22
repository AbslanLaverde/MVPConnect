import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGetSelfAccountQuery } from '../../../onboarding/onboardingApi';
import { theme } from '../../../theme/theme';
import { VenueHomeScreen } from '../VenueHomeScreen';

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
    <VenueHomeScreen
      navigation={{} as any}
      route={{ key: 'venue-home', name: 'VenueHome' }}
    />
  </SafeAreaProvider>,
);

describe('VenueHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    mockedSelfQuery.mockReturnValue({
      data: {
        id: 'venue-1',
        persona: 'VENUE',
        displayName: 'Elsewhere',
        email: 'venue@example.com',
        profileImage: {
          mediaId: 'profile-1',
          url: 'https://media.example/elsewhere.jpg',
          mimeType: 'image/jpeg',
        },
        capacity: 250,
        genres: ['Indie Rock'],
        address: '123 Venue Street',
        bookingBudget: 'FIVE HUNDRED DOLLARS',
        bookingContact: 'bookings@example.com',
        equipmentAvailable: ['FULL HOUSE PA'],
        promoterRelationship: 'PROMOTER FRIENDLY',
        bookingStatus: 'ACTIVELY BOOKING',
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

  it('renders authenticated Venue identity, shared greeting, supporting copy, and profile image', () => {
    const screen = renderScreen();
    expect(screen.getByText('VENUE')).toBeTruthy();
    const heading = screen.getByText('GOOD AFTERNOON, Elsewhere');
    expect(heading).toBeTruthy();
    expect(StyleSheet.flatten(heading.props.style).textTransform).toBe('uppercase');
    expect(screen.getByText('Here’s what’s happening with your room.')).toBeTruthy();
    expect(screen.getByTestId('venue-home-avatar').props.source.uri)
      .toBe('https://media.example/elsewhere.jpg');
  });

  it('uses the Venue violet accent without changing shared Home structure', () => {
    mockedSelfQuery.mockReturnValue({
      data: {
        id: 'venue-1', persona: 'VENUE', displayName: 'Elsewhere', email: 'venue@example.com',
        profileImage: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
    const screen = renderScreen();
    const contextStyle = StyleSheet.flatten(screen.getByText('VENUE').props.style);
    const fallbackStyle = StyleSheet.flatten(
      screen.getByTestId('venue-home-avatar-fallback', { includeHiddenElements: true }).props.style,
    );
    const initialsStyle = StyleSheet.flatten(
      screen.getByText('E', { includeHiddenElements: true }).props.style,
    );

    expect(contextStyle.color).toBe(theme.personas.venue.accent);
    expect(fallbackStyle.borderColor).toBe(theme.colors.venueBorder);
    expect(initialsStyle.color).toBe(theme.personas.venue.accent);
  });

  it('renders Attention with the truthful shared empty state', () => {
    const screen = renderScreen();
    expect(screen.getByText('NEEDS YOUR ATTENTION')).toBeTruthy();
    expect(screen.getByText('YOU’RE ALL CAUGHT UP')).toBeTruthy();
    expect(screen.getByText('Nothing needs your attention right now.')).toBeTruthy();
  });

  it('does not turn canonical Venue profile fields into Home content', () => {
    const screen = renderScreen();
    [
      '250',
      'Indie Rock',
      '123 Venue Street',
      'FIVE HUNDRED DOLLARS',
      'bookings@example.com',
      'FULL HOUSE PA',
      'PROMOTER FRIENDLY',
      'ACTIVELY BOOKING',
    ].forEach((value) => expect(screen.queryByText(value)).toBeNull());
    expect(screen.queryByText(/BOOKING SNAPSHOT/i)).toBeNull();
    expect(screen.queryByText(/QUICK ACTIONS/i)).toBeNull();
    expect(screen.queryByText(/MATCH/i)).toBeNull();
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
    expect(screen.getByLabelText('Loading Venue identity')).toBeTruthy();
    expect(screen.getByTestId('venue-home-avatar-loading')).toBeTruthy();
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
    fireEvent.press(screen.getByLabelText('Retry loading Venue Home'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
