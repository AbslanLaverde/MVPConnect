import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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

jest.mock('../../../assets/branding/mvpconnect-mark.svg', () => {
  const { View } = require('react-native');
  return (props: object) => <View {...props} />;
});

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

  afterEach(() => jest.restoreAllMocks());

  const renderScreen = () => {
    const navigation = { replace: jest.fn() } as any;
    const screen = render(
      <WelcomeScreen navigation={navigation} route={{ key: 'welcome', name: 'Welcome' }} />,
    );
    return { ...screen, navigation };
  };

  it('renders a standalone reduced-motion final state without auto-advancing', async () => {
    const screen = renderScreen();
    expect(await screen.findByText('ONBOARDING COMPLETE.')).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('Enter MVPConnect').props.accessibilityState.disabled).toBe(false));
    expect(screen.navigation.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('YOUR GOALS')).toBeNull();
    expect(screen.queryByText('BACK')).toBeNull();
    const background = screen.getByTestId('welcome-background', { includeHiddenElements: true });
    expect(background.props.accessibilityElementsHidden).toBe(true);
    expect(background.props['aria-hidden']).toBe(true);
    expect(screen.getByTestId('welcome-reveal-mark', { includeHiddenElements: true })).toBeTruthy();
  });

  it('selects the dedicated production background at the shared responsive boundary', () => {
    expect(getWelcomeBackgroundVariant(WELCOME_BACKGROUND_BREAKPOINT - 1, 600)).toBe('mobile');
    expect(getWelcomeBackgroundVariant(WELCOME_BACKGROUND_BREAKPOINT, 600)).toBe('desktop');
    expect(getWelcomeBackgroundVariant(900, 1200)).toBe('mobile');
  });

  it('gives the standalone reveal mark substantial bounded desktop and mobile sizing', () => {
    expect(getWelcomeRevealMarkSize(1440, false)).toBeCloseTo(201.6);
    expect(getWelcomeRevealMarkSize(2560, false)).toBe(280);
    expect(getWelcomeRevealMarkSize(390, true)).toBeCloseTo(124.8);
    expect(getWelcomeRevealMarkSize(320, true)).toBe(112);
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

  it('enters the existing completed-account destination only on activation', async () => {
    const screen = renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Enter MVPConnect').props.accessibilityState.disabled).toBe(false));
    fireEvent.press(screen.getByLabelText('Enter MVPConnect'));
    expect(screen.navigation.replace).toHaveBeenCalledWith('MusicianHome', {
      userId: 'artist-1',
      userName: 'Glass Houses',
      userType: 'MUSICIAN',
    });
  });
});
