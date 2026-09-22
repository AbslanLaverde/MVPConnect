import React from 'react';
import { AccessibilityInfo, Animated, Dimensions, StyleSheet } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useGetOnboardingQuery, useGetSelfAccountQuery } from '../../onboarding/onboardingApi';
import {
  WELCOME_BACKGROUND_BREAKPOINT,
  WELCOME_TRANSITION_TIMING,
  WelcomeScreen,
  getWelcomeBackgroundVariant,
  getWelcomeRevealMarkSize,
} from '../WelcomeScreen';

jest.mock('../../onboarding/onboardingApi', () => ({
  useGetOnboardingQuery: jest.fn(),
  useGetSelfAccountQuery: jest.fn(),
}));

jest.mock('../../../assets/branding/mvpconnect-mark-native.png', () => ({
  testUri: 'mvpconnect-mark-native.png',
}));
jest.mock('../../../assets/branding/mvpconnect-logo-native.png', () => ({
  testUri: 'mvpconnect-logo-native.png',
}));

const nativeRevealMark = require('../../../assets/branding/mvpconnect-mark-native.png');
const nativeWordmark = require('../../../assets/branding/mvpconnect-logo-native.png');

const mockedSelfQuery = useGetSelfAccountQuery as jest.Mock;
const mockedOnboardingQuery = useGetOnboardingQuery as jest.Mock;

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    mockedSelfQuery.mockReturnValue({
      data: { id: 'artist-1', persona: 'MUSICIAN', displayName: 'Glass Houses', email: 'artist@example.com' },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockedOnboardingQuery.mockReturnValue({
      data: {
        persona: 'MUSICIAN',
        status: 'COMPLETED',
        currentStep: 'goals',
        onboardingVersion: 2,
        steps: [],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const renderScreen = () => {
    const navigation = { replace: jest.fn() } as any;
    const screen = render(
      <WelcomeScreen navigation={navigation} route={{ key: 'welcome', name: 'Welcome' }} />,
    );
    return { ...screen, navigation };
  };

  it('uses the centered native-safe standalone mark for the reveal', async () => {
    const screen = renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Enter MVPConnect').props.accessibilityState.disabled).toBe(false));
    const reveal = screen.getByTestId('welcome-reveal-mark', { includeHiddenElements: true });
    const revealStyle = StyleSheet.flatten(reveal.props.style);
    const window = Dimensions.get('window');
    const compact = getWelcomeBackgroundVariant(window.width, window.height) === 'mobile';

    expect(reveal.props.source).toEqual(nativeRevealMark);
    expect(reveal.props.source).not.toEqual(nativeWordmark);
    expect(reveal.props.resizeMode).toBe('contain');
    expect(revealStyle.width).toBe(getWelcomeRevealMarkSize(window.width, compact));
    expect(revealStyle.height).toBe(revealStyle.width);
    expect(revealStyle.transform).toBeUndefined();

    const introStyle = StyleSheet.flatten(
      screen.getByTestId('welcome-intro', { includeHiddenElements: true }).props.style,
    );
    expect(introStyle.alignItems).toBe('center');
    expect(introStyle.justifyContent).toBe('center');
  });

  it('shows the final Welcome immediately without running the reveal sequence for reduced motion', async () => {
    const sequenceSpy = jest.spyOn(Animated, 'sequence');
    const screen = renderScreen();

    expect(await screen.findByText('ONBOARDING COMPLETE.')).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('Enter MVPConnect').props.accessibilityState.disabled).toBe(false));
    expect(sequenceSpy).not.toHaveBeenCalled();
    expect(screen.navigation.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('YOUR GOALS')).toBeNull();
    expect(screen.queryByText('BACK')).toBeNull();

    const introOpacity = StyleSheet.flatten(
      screen.getByTestId('welcome-intro', { includeHiddenElements: true }).props.style,
    ).opacity;
    const finalOpacity = StyleSheet.flatten(
      screen.getByTestId('welcome-final').props.style,
    ).opacity;
    expect(introOpacity).toBe(0);
    expect(finalOpacity).toBe(1);

    const background = screen.getByTestId('welcome-background', { includeHiddenElements: true });
    expect(background.props.accessibilityElementsHidden).toBe(true);
    expect(background.props['aria-hidden']).toBe(true);
  });

  it('selects the dedicated production background at the shared responsive boundary', () => {
    expect(getWelcomeBackgroundVariant(WELCOME_BACKGROUND_BREAKPOINT - 1, 600)).toBe('mobile');
    expect(getWelcomeBackgroundVariant(WELCOME_BACKGROUND_BREAKPOINT, 600)).toBe('desktop');
    expect(getWelcomeBackgroundVariant(900, 1200)).toBe('mobile');
  });

  it('gives the standalone reveal mark the intended bounded desktop and mobile sizing', () => {
    expect(getWelcomeRevealMarkSize(1000, false)).toBe(200);
    expect(getWelcomeRevealMarkSize(1440, false)).toBeCloseTo(201.6);
    expect(getWelcomeRevealMarkSize(2560, false)).toBe(280);
    expect(getWelcomeRevealMarkSize(3000, false)).toBe(280);

    expect(getWelcomeRevealMarkSize(300, true)).toBe(112);
    expect(getWelcomeRevealMarkSize(320, true)).toBe(112);
    expect(getWelcomeRevealMarkSize(390, true)).toBeCloseTo(124.8);
    expect(getWelcomeRevealMarkSize(600, true)).toBe(144);
    expect(getWelcomeRevealMarkSize(1440, true)).not.toBe(getWelcomeRevealMarkSize(1440, false));
  });

  it('runs the standard-motion reveal through visible, hidden, and final states', async () => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const screen = renderScreen();

    await act(async () => {
      await Promise.resolve();
    });

    const getOpacity = (testId: string): number => StyleSheet.flatten(
      screen.getByTestId(testId, { includeHiddenElements: true }).props.style,
    ).opacity as number;

    expect(getOpacity('welcome-intro')).toBe(0);
    expect(getOpacity('welcome-final')).toBe(0);

    act(() => jest.advanceTimersByTime(WELCOME_TRANSITION_TIMING.logoDelayMs + 550));
    expect(getOpacity('welcome-intro')).toBeGreaterThan(0);
    expect(getOpacity('welcome-intro')).toBeLessThan(1);

    act(() => jest.advanceTimersByTime(550));
    expect(getOpacity('welcome-intro')).toBe(1);

    act(() => jest.advanceTimersByTime(WELCOME_TRANSITION_TIMING.logoHoldMs + 500));
    expect(getOpacity('welcome-intro')).toBeGreaterThan(0);
    expect(getOpacity('welcome-intro')).toBeLessThan(1);

    act(() => jest.advanceTimersByTime(500 + WELCOME_TRANSITION_TIMING.finalFadeInMs));
    expect(getOpacity('welcome-intro')).toBe(0);
    expect(getOpacity('welcome-final')).toBe(1);
  });

  it('keeps the standard transition within the approved approximately 4.2 second timing', () => {
    const totalMs = Object.values(WELCOME_TRANSITION_TIMING)
      .reduce((total, duration) => total + duration, 0);
    expect(totalMs).toBe(4200);
  });

  it('redirects an incomplete direct visit to the current onboarding step', async () => {
    mockedOnboardingQuery.mockReturnValue({
      data: {
        persona: 'VENUE',
        status: 'IN_PROGRESS',
        currentStep: 'media',
        onboardingVersion: 2,
        steps: [{ key: 'media', position: 5, required: false, status: 'IN_PROGRESS', data: {} }],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
    const screen = renderScreen();
    await waitFor(() => expect(screen.navigation.replace).toHaveBeenCalledWith('Onboarding', {
      persona: 'venue',
      step: 'media',
    }));
    expect(screen.getByLabelText('Enter MVPConnect', { includeHiddenElements: true })
      .props.accessibilityState.disabled).toBe(true);
  });

  it('enters Artist Home only on activation for a completed Artist account', async () => {
    const screen = renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Enter MVPConnect').props.accessibilityState.disabled).toBe(false));
    fireEvent.press(screen.getByLabelText('Enter MVPConnect'));
    expect(screen.navigation.replace).toHaveBeenCalledWith('ArtistHome');
    expect(screen.navigation.replace).not.toHaveBeenCalledWith('MusicianHome', expect.anything());
  });
});
