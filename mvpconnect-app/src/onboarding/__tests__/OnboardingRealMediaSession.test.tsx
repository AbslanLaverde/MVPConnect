import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import api from '../../services/api';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingRealMediaSession } from '../OnboardingRealMediaSession';
import { hydrateMediaStepData } from '../onboardingMediaStep';
import type { OnboardingPersona, OnboardingState, OnboardingStep } from '../onboardingTypes';

jest.mock('../../services/api', () => ({
  __esModule: true,
  storageHelpers: { clearAuthData: jest.fn() },
  default: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{
      uri: 'file:///media.jpg',
      fileName: 'media.jpg',
      mimeType: 'image/jpeg',
      fileSize: 100,
      width: 1200,
      height: 600,
      file: new Blob(['media'], { type: 'image/jpeg' }),
    }],
  }),
}));

const mockSaveStep = jest.fn();
const mockCompleteStep = jest.fn();
const mockSkipStep = jest.fn();
const mockReopenStep = jest.fn();
const mockDispatch = jest.fn();
const mockResetApiState = jest.fn(() => ({ type: 'onboardingApi/resetApiState' }));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('../onboardingApi', () => ({
  onboardingApi: { util: { resetApiState: mockResetApiState } },
  useSaveOnboardingStepMutation: () => [mockSaveStep, { isLoading: false }],
  useCompleteOnboardingStepMutation: () => [mockCompleteStep, { isLoading: false }],
  useSkipOnboardingStepMutation: () => [mockSkipStep, { isLoading: false }],
  useReopenOnboardingStepMutation: () => [mockReopenStep, { isLoading: false }],
}));

const mockedApi = api as jest.Mocked<typeof api>;

const META = {
  artist: { backend: 'MUSICIAN' as const, position: 4, total: 5, previous: 'live', next: 'goals', steps: ['basics', 'sound', 'live', 'media', 'goals'] },
  venue: { backend: 'VENUE' as const, position: 5, total: 6, previous: 'booking', next: 'goals', steps: ['room', 'music', 'stage', 'booking', 'media', 'goals'] },
  promoter: { backend: 'PROMOTER' as const, position: 4, total: 5, previous: 'network', next: 'goals', steps: ['business', 'specialties', 'network', 'media', 'goals'] },
};

const makeStep = (persona: OnboardingPersona, data = hydrateMediaStepData(persona, {})): OnboardingStep => ({
  key: 'media',
  position: META[persona].position,
  required: false,
  status: 'IN_PROGRESS',
  data: data as any,
});

const makeState = (
  persona: OnboardingPersona,
  step = makeStep(persona),
  currentStep = 'media',
): OnboardingState => ({
  persona: META[persona].backend,
  status: 'IN_PROGRESS',
  currentStep,
  onboardingVersion: 2,
  steps: META[persona].steps.map((key, index) => key === 'media' ? step : ({
    key,
    position: index + 1,
    required: key !== 'media',
    status: index < META[persona].position - 1 ? 'COMPLETE' : 'NOT_STARTED',
    data: {},
  })),
});

const mockHydration = () => {
  mockedApi.get.mockImplementation(async (url: string) => {
    if (url === '/external-connections') return { data: [] } as any;
    if (url === '/me/artist-identity') return { status: 204, data: undefined } as any;
    if (url.startsWith('/media/')) {
      const id = url.split('/').at(-1)!;
      return { data: {
        id,
        mediaType: id.includes('banner') ? 'BANNER_IMAGE' : 'GALLERY_IMAGE',
        mediaContext: 'PROFILE',
        originalFileName: `${id}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        status: 'READY',
        url: `http://localhost:9000/${id}.jpg`,
      } } as any;
    }
    throw new Error(`Unexpected GET ${url}`);
  });
};

const renderSession = (persona: OnboardingPersona, step = makeStep(persona)) => {
  const state = makeState(persona, step);
  const navigation = { push: jest.fn(), reset: jest.fn() } as any;
  const screen = render(
    <OnboardingRealMediaSession
      state={state}
      step={step}
      config={ONBOARDING_CONFIG[persona]}
      navigation={navigation}
    />,
  );
  return { ...screen, navigation, state };
};

describe('OnboardingRealMediaSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydration();
    mockSaveStep.mockReturnValue({ unwrap: jest.fn().mockResolvedValue(undefined) });
    mockCompleteStep.mockReturnValue({ unwrap: jest.fn().mockResolvedValue(undefined) });
    mockSkipStep.mockReturnValue({ unwrap: jest.fn().mockResolvedValue(undefined) });
    mockReopenStep.mockReturnValue({ unwrap: jest.fn().mockResolvedValue(undefined) });
  });

  afterEach(() => {
    cleanup();
  });

  it.each(['artist', 'venue', 'promoter'] as const)(
    'saves, completes, and navigates the optional empty %s Media step through the backend',
    async (persona) => {
      const step = makeStep(persona);
      mockCompleteStep.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue(makeState(persona, { ...step, status: 'COMPLETE' }, 'goals')),
      });
      const screen = renderSession(persona, step);

      await screen.findByTestId(`onboarding-media-${persona}`);
      fireEvent.press(screen.getByLabelText('Continue to the next onboarding step'));

      const expected = hydrateMediaStepData(persona, {});
      await waitFor(() => expect(mockSaveStep).toHaveBeenCalledWith({ stepKey: 'media', data: expected }));
      await waitFor(() => expect(mockCompleteStep).toHaveBeenCalledWith({ stepKey: 'media', data: expected }));
      expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', {
        persona,
        step: META[persona].next,
      });
    },
  );

  it('uses real backend skip semantics and does not delete account connections', async () => {
    const step = makeStep('artist');
    mockSkipStep.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue(makeState('artist', { ...step, status: 'SKIPPED' }, 'goals')),
    });
    const screen = renderSession('artist', step);

    await screen.findByTestId('onboarding-media-artist');
    fireEvent.press(screen.getByLabelText('Skip this optional step for now'));

    await waitFor(() => expect(mockSkipStep).toHaveBeenCalledWith('media'));
    expect(mockedApi.delete).not.toHaveBeenCalled();
    expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', { persona: 'artist', step: 'goals' });
  });

  it('hydrates an ordered gallery and banner from the exact draft media IDs', async () => {
    const data = {
      ...hydrateMediaStepData('venue', {}),
      bannerImage: { mediaId: 'banner-1' },
      galleryImages: [{ mediaId: 'gallery-b' }, { mediaId: 'gallery-a' }],
    };
    const screen = renderSession('venue', makeStep('venue', data));

    await screen.findByLabelText('Selected banner image preview');
    expect(screen.getAllByLabelText('Selected gallery image preview')).toHaveLength(2);
    expect(mockedApi.get).toHaveBeenCalledWith('/media/banner-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/media/gallery-b');
    expect(mockedApi.get).toHaveBeenCalledWith('/media/gallery-a');
  });

  it('blocks navigation when completion fails after the confirmed save', async () => {
    mockCompleteStep.mockReturnValue({ unwrap: jest.fn().mockRejectedValue(new Error('offline')) });
    const screen = renderSession('promoter');
    await screen.findByTestId('onboarding-media-promoter');

    fireEvent.press(screen.getByLabelText('Continue to the next onboarding step'));

    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(mockSaveStep).toHaveBeenCalled();
    expect(screen.navigation.push).not.toHaveBeenCalled();
  });

  it('blocks completion and navigation when the explicit save fails', async () => {
    mockSaveStep.mockReturnValue({ unwrap: jest.fn().mockRejectedValue(new Error('offline')) });
    const screen = renderSession('artist');
    await screen.findByTestId('onboarding-media-artist');

    fireEvent.press(screen.getByLabelText('Continue to the next onboarding step'));

    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(mockCompleteStep).not.toHaveBeenCalled();
    expect(screen.navigation.push).not.toHaveBeenCalled();
  });

  it('autosaves valid Media changes after the established debounce', async () => {
    const screen = renderSession('venue');
    await screen.findByTestId('onboarding-media-venue');

    fireEvent.changeText(screen.getByLabelText('Website URL, optional'), 'https://thevenue.example');

    await waitFor(() => expect(mockSaveStep).toHaveBeenCalledWith({
      stepKey: 'media',
      data: expect.objectContaining({ websiteUrl: 'https://thevenue.example' }),
    }), { timeout: 2500 });
  });

  it('disables Continue while an image upload has not completed its association', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/media/uploads') return new Promise(() => undefined);
      throw new Error(`Unexpected POST ${url}`);
    });
    const screen = renderSession('promoter');
    await screen.findByTestId('onboarding-media-promoter');

    fireEvent.press(screen.getAllByLabelText('Select image')[0]);
    expect(await screen.findByText('UPLOADING 8%')).toBeTruthy();
    const continueButton = screen.getByLabelText('Saving onboarding step');
    expect(continueButton.props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByLabelText('Continue to the next onboarding step')).toBeNull();
    expect(mockSaveStep).not.toHaveBeenCalled();
    expect(mockCompleteStep).not.toHaveBeenCalled();
  });

  it('returns each persona to its actual previous completed step', async () => {
    const screen = renderSession('venue');
    await screen.findByTestId('onboarding-media-venue');
    fireEvent.press(screen.getByLabelText('Go back to the previous onboarding step'));
    expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', { persona: 'venue', step: 'booking' });
  });

  it('reopens a completed Media step before mutating an account connection', async () => {
    const completedStep = { ...makeStep('artist'), status: 'COMPLETE' as const };
    mockedApi.put.mockResolvedValue({
      data: {
        connectionId: 'instagram-connection',
        provider: 'INSTAGRAM',
        connectionMethod: 'PROFILE_URL',
        status: 'UNVERIFIED',
        profileUrl: 'https://instagram.com/glasshouses',
      },
    } as any);
    const screen = renderSession('artist', completedStep);
    await screen.findByTestId('onboarding-media-artist');

    fireEvent.changeText(
      screen.getByLabelText('Instagram profile URL or handle'),
      'https://instagram.com/glasshouses',
    );
    fireEvent.press(screen.getByLabelText('Save Instagram connection'));

    await waitFor(() => expect(mockReopenStep).toHaveBeenCalledWith('media'));
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith('/external-connections/url', {
      provider: 'INSTAGRAM',
      profile: 'https://instagram.com/glasshouses',
      displayName: null,
    }));
    expect(mockReopenStep.mock.invocationCallOrder[0]).toBeLessThan(mockedApi.put.mock.invocationCallOrder[0]);
  });

});
