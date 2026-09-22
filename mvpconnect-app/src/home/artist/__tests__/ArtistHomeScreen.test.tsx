import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGetSelfAccountQuery } from '../../../onboarding/onboardingApi';
import { ArtistHomeScreen } from '../ArtistHomeScreen';
import { getGreetingForHour } from '../../shared/HomeHeader';

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
    <ArtistHomeScreen
      navigation={{} as any}
      route={{ key: 'artist-home', name: 'ArtistHome' }}
    />
  </SafeAreaProvider>,
);

describe('ArtistHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelfQuery.mockReturnValue({
      data: {
        id: 'artist-1',
        persona: 'MUSICIAN',
        displayName: 'Glass Houses',
        email: 'artist@example.com',
        profileImage: {
          mediaId: 'profile-1',
          url: 'https://media.example/glass-houses.jpg',
          mimeType: 'image/jpeg',
        },
        genres: ['Indie Rock'],
        typicalDraw: 'FROM_101_TO_250',
        bookingStatus: 'ACTIVELY_BOOKING',
        travelRadiusMiles: 50,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  it.each([
    [5, 'GOOD MORNING'],
    [11, 'GOOD MORNING'],
    [12, 'GOOD AFTERNOON'],
    [16, 'GOOD AFTERNOON'],
    [17, 'GOOD EVENING'],
    [0, 'GOOD EVENING'],
  ])('maps hour %s to %s', (hour, expected) => {
    expect(getGreetingForHour(hour)).toBe(expected);
  });

  it('renders authenticated Artist identity, supporting copy, and profile image', () => {
    const screen = renderScreen();
    expect(screen.getByText('ARTIST')).toBeTruthy();
    expect(screen.getByText(/Glass Houses/)).toBeTruthy();
    expect(screen.getByText('Here’s what’s happening around your music career.')).toBeTruthy();
    expect(screen.getByTestId('artist-home-avatar').props.source.uri)
      .toBe('https://media.example/glass-houses.jpg');
  });

  it('renders Attention with the truthful empty state', () => {
    const screen = renderScreen();
    expect(screen.getByText('NEEDS YOUR ATTENTION')).toBeTruthy();
    expect(screen.getByText('YOU’RE ALL CAUGHT UP')).toBeTruthy();
    expect(screen.getByText('Nothing needs your attention right now.')).toBeTruthy();
  });

  it('does not turn canonical profile facts into Home content', () => {
    const screen = renderScreen();
    expect(screen.queryByText('Indie Rock')).toBeNull();
    expect(screen.queryByText('FROM_101_TO_250')).toBeNull();
    expect(screen.queryByText('ACTIVELY_BOOKING')).toBeNull();
    expect(screen.queryByText('50')).toBeNull();
    expect(screen.queryByText(/MATCH/i)).toBeNull();
    expect(screen.queryByText(/BOARD/i)).toBeNull();
    expect(screen.queryByText(/SOUNDS LIKE/i)).toBeNull();
  });

  it('uses a restrained initials fallback when the profile image is absent', () => {
    mockedSelfQuery.mockReturnValue({
      data: {
        id: 'artist-1', persona: 'MUSICIAN', displayName: 'Glass Houses', email: 'artist@example.com',
        profileImage: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
    const screen = renderScreen();
    expect(screen.getByTestId('artist-home-avatar-fallback', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('GH', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(/COULDN’T LOAD/)).toBeNull();
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
    expect(screen.getByTestId('home-identity-loading')).toBeTruthy();
    expect(screen.getByText('NEEDS YOUR ATTENTION')).toBeTruthy();
    expect(screen.getByText('YOU’RE ALL CAUGHT UP')).toBeTruthy();
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
    fireEvent.press(screen.getByLabelText('Retry loading Artist Home'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
