import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useGetOnboardingQuery,
  useGetOwnedMediaQuery,
  useGetSelfAccountQuery,
} from '../onboardingApi';
import { OnboardingShell } from '../OnboardingShell';

jest.mock('../onboardingApi', () => ({
  useGetOnboardingQuery: jest.fn(),
  useGetOwnedMediaQuery: jest.fn(),
  useGetSelfAccountQuery: jest.fn(),
}));

jest.mock('../OnboardingStepSession', () => ({
  OnboardingStepSession: ({ saveBypass }: { saveBypass: boolean }) => {
    const { Text } = require('react-native');
    return <Text>{`STEP 2 PLACEHOLDER / BYPASS ${String(saveBypass)}`}</Text>;
  },
}));

const mockedOnboarding = useGetOnboardingQuery as jest.Mock;
const mockedMedia = useGetOwnedMediaQuery as jest.Mock;
const mockedSelf = useGetSelfAccountQuery as jest.Mock;

describe('OnboardingShell persistent identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOnboarding.mockReturnValue({
      data: {
        persona: 'MUSICIAN',
        status: 'IN_PROGRESS',
        currentStep: 'sound',
        onboardingVersion: 2,
        steps: [
          {
            key: 'basics',
            position: 1,
            required: true,
            status: 'COMPLETE',
            data: { profileImage: { mediaId: 'media-1' } },
          },
          { key: 'sound', position: 2, required: true, status: 'NOT_STARTED', data: {} },
          { key: 'live', position: 3, required: true, status: 'NOT_STARTED', data: {} },
          { key: 'media', position: 4, required: false, status: 'NOT_STARTED', data: {} },
          { key: 'goals', position: 5, required: true, status: 'NOT_STARTED', data: {} },
        ],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockedSelf.mockReturnValue({ data: { displayName: 'Glass Houses', profileImage: null } });
    mockedMedia.mockReturnValue({
      data: { id: 'media-1', status: 'READY', url: 'http://127.0.0.1:9000/fresh-step-image' },
    });
  });

  it('shows the completed Step 1 identity on Step 2 while keeping placeholder bypass enabled', () => {
    const navigation = { replace: jest.fn(), push: jest.fn() } as any;
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 1200, height: 800 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <OnboardingShell
          navigation={navigation}
          route={{ key: 'sound', name: 'Onboarding', params: { persona: 'artist', step: 'sound' } } as any}
        />
      </SafeAreaProvider>,
    );

    expect(mockedMedia).toHaveBeenCalledWith('media-1', { skip: false });
    expect(screen.getByText('Glass Houses')).toBeTruthy();
    expect(screen.getByLabelText('Glass Houses profile image').props.source.uri)
      .toBe('http://127.0.0.1:9000/fresh-step-image');
    expect(screen.getByText('STEP 2 PLACEHOLDER / BYPASS true')).toBeTruthy();
    expect(screen.getByTestId('onboarding-scroll-view').props.scrollEnabled).toBe(true);
    expect(screen.getByTestId('onboarding-scroll-view').props.showsVerticalScrollIndicator).toBe(true);
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
