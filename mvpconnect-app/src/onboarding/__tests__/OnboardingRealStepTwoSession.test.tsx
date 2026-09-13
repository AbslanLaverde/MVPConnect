import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import api, { storageHelpers } from '../../services/api';
import type { ArtistReferenceProvider } from '../../services/externalArtistService';
import { onboardingApi } from '../onboardingApi';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingRealStepTwoSession } from '../OnboardingRealStepTwoSession';
import type { OnboardingPersona } from '../onboardingTypes';
import type { OnboardingState, OnboardingStep } from '../onboardingTypes';
import type { StepTwoRequest } from '../stepTwoTypes';

jest.mock('../../services/api', () => ({
  __esModule: true,
  storageHelpers: {
    clearAuthData: jest.fn(),
  },
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedStorage = storageHelpers as jest.Mocked<typeof storageHelpers>;
const testStores: ReturnType<typeof configureStore>[] = [];
const artistProvider: ArtistReferenceProvider = {
  searchLocal: jest.fn().mockResolvedValue([]),
  searchSpotify: jest.fn().mockResolvedValue([]),
  resolveSpotify: jest.fn(),
  createFreeForm: jest.fn(),
};

const PERSONA = {
  artist: {
    backend: 'MUSICIAN' as const,
    step: 'sound',
    next: 'live',
    steps: ['basics', 'sound', 'live', 'media', 'goals'],
    valid: { genres: ['ROCK'], vibes: ['RAW'], eventTypes: [], soundsLikeArtists: [] } as StepTwoRequest,
  },
  venue: {
    backend: 'VENUE' as const,
    step: 'music',
    next: 'stage',
    steps: ['room', 'music', 'stage', 'booking', 'media', 'goals'],
    valid: { genres: ['INDIE'], ambience: ['INTIMATE'], eventTypes: [], artistsBooked: [] } as StepTwoRequest,
  },
  promoter: {
    backend: 'PROMOTER' as const,
    step: 'specialties',
    next: 'network',
    steps: ['business', 'specialties', 'network', 'media', 'goals'],
    valid: { genres: ['ELECTRONIC'], eventTypes: ['CLUB_NIGHT'], vibes: [], artistsWorkedWith: [] } as StepTwoRequest,
  },
};

const makeStep = (
  persona: OnboardingPersona,
  data: StepTwoRequest = PERSONA[persona].valid,
  status: OnboardingStep['status'] = 'IN_PROGRESS',
): OnboardingStep => ({
  key: PERSONA[persona].step,
  position: 2,
  required: true,
  status,
  data,
});

const makeState = (
  persona: OnboardingPersona,
  step = makeStep(persona),
  currentStep = PERSONA[persona].step,
): OnboardingState => ({
  persona: PERSONA[persona].backend,
  status: 'IN_PROGRESS',
  currentStep,
  onboardingVersion: 2,
  steps: PERSONA[persona].steps.map((key, index) => key === step.key
    ? step
    : {
        key,
        position: index + 1,
        required: key !== 'media',
        status: index === 0 ? 'COMPLETE' : 'NOT_STARTED',
        data: {},
      }),
});

const renderSession = (
  persona: OnboardingPersona,
  data: StepTwoRequest = PERSONA[persona].valid,
  status: OnboardingStep['status'] = 'IN_PROGRESS',
) => {
  const step = makeStep(persona, data, status);
  const state = makeState(persona, step);
  const testStore = configureStore({
    reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(onboardingApi.middleware),
  });
  testStores.push(testStore);
  const dispatchSpy = jest.spyOn(testStore, 'dispatch');
  const navigation = { push: jest.fn(), reset: jest.fn() } as any;
  const screen = render(
    <Provider store={testStore}>
      <OnboardingRealStepTwoSession
        state={state}
        step={step}
        config={ONBOARDING_CONFIG[persona]}
        navigation={navigation}
        artistProvider={artistProvider}
      />
    </Provider>,
  );
  return { ...screen, navigation, state, step, testStore, dispatchSpy };
};

const continueButton = (screen: ReturnType<typeof renderSession>) =>
  screen.getByLabelText('Continue to the next onboarding step');

describe('OnboardingRealStepTwoSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedStorage.clearAuthData.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
    testStores.splice(0).forEach((testStore) => {
      testStore.dispatch(onboardingApi.util.resetApiState());
    });
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it.each([
    ['artist', { genres: [], vibes: ['RAW'], eventTypes: [], soundsLikeArtists: [] }],
    ['artist', { genres: ['ROCK'], vibes: [], eventTypes: [], soundsLikeArtists: [] }],
    ['venue', { genres: [], ambience: ['INTIMATE'], eventTypes: [], artistsBooked: [] }],
    ['venue', { genres: ['ROCK'], ambience: [], eventTypes: [], artistsBooked: [] }],
    ['promoter', { genres: [], eventTypes: ['CONCERT'], vibes: [], artistsWorkedWith: [] }],
    ['promoter', { genres: ['ROCK'], eventTypes: [], vibes: [], artistsWorkedWith: [] }],
  ] as const)('disables Continue when %s required selections are incomplete', (persona, data) => {
    const screen = renderSession(persona, data as unknown as StepTwoRequest);
    expect(continueButton(screen).props.accessibilityState.disabled).toBe(true);
  });

  it.each(['artist', 'venue', 'promoter'] as const)(
    'allows %s to continue with every optional Step 2 field empty',
    (persona) => {
      const screen = renderSession(persona);
      expect(continueButton(screen).props.accessibilityState.disabled).toBe(false);
    },
  );

  it.each(['artist', 'venue', 'promoter'] as const)(
    'saves the exact typed %s DTO, completes, then reaches Step 3',
    async (persona) => {
      const step = makeStep(persona);
      mockedApi.put.mockResolvedValue({ data: step } as any);
      mockedApi.post.mockResolvedValue({
        data: makeState(persona, { ...step, status: 'COMPLETE' }, PERSONA[persona].next),
      } as any);
      const screen = renderSession(persona);

      fireEvent.press(continueButton(screen));
      expect(screen.navigation.push).not.toHaveBeenCalled();
      await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
        `/onboarding/steps/${PERSONA[persona].step}`,
        { data: PERSONA[persona].valid },
      ));
      await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith(
        `/onboarding/steps/${PERSONA[persona].step}/complete`,
        { data: PERSONA[persona].valid },
      ));
      expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', {
        persona,
        step: PERSONA[persona].next,
      });
    },
  );

  it('does not navigate or complete when the Step 2 save fails', async () => {
    mockedApi.put.mockRejectedValue(new Error('offline'));
    const screen = renderSession('artist');
    fireEvent.press(continueButton(screen));
    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(screen.navigation.push).not.toHaveBeenCalled();
  });

  it('does not navigate when completion fails after a successful save', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep('venue') } as any);
    mockedApi.post.mockRejectedValue(new Error('complete failed'));
    const screen = renderSession('venue');
    fireEvent.press(continueButton(screen));
    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(screen.navigation.push).not.toHaveBeenCalled();
  });

  it('hydrates all persisted taxonomy values and artist references', () => {
    const data: StepTwoRequest = {
      genres: ['ROCK', 'INDIE'],
      vibes: ['RAW', 'DREAMY'],
      eventTypes: ['CONCERT'],
      soundsLikeArtists: [{
        entityType: 'ARTIST',
        entityId: 'external-interpol',
        displayName: 'Interpol',
        external: true,
      }],
    };
    const screen = renderSession('artist', data);
    expect(screen.getByLabelText('Rock').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Indie').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Raw').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Concert').props.accessibilityState.checked).toBe(true);
    expect(screen.getByText('Interpol')).toBeTruthy();
  });

  it('does not autosave an edit that removes a required selection', async () => {
    const screen = renderSession('artist');
    fireEvent.press(screen.getByLabelText('Rock'));
    await act(async () => jest.advanceTimersByTime(1100));
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(continueButton(screen).props.accessibilityState.disabled).toBe(true);
  });

  it('autosaves a valid edit after the debounce', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep('artist') } as any);
    const screen = renderSession('artist');
    fireEvent.press(screen.getByLabelText('Indie'));
    await act(async () => jest.advanceTimersByTime(1100));
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
      '/onboarding/steps/sound',
      { data: { ...PERSONA.artist.valid, genres: ['ROCK', 'INDIE'] } },
    ));
  });

  it('reopens a completed Step 2 immediately when required data is removed', async () => {
    mockedApi.post.mockResolvedValue({
      data: makeState('promoter', makeStep('promoter'), 'specialties'),
    } as any);
    const screen = renderSession('promoter', PERSONA.promoter.valid, 'COMPLETE');
    fireEvent.press(screen.getByLabelText('Club Night'));
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith(
      '/onboarding/steps/specialties/reopen',
    ));
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Saving onboarding step').props.accessibilityState.disabled).toBe(true);
  });

  it('returns to the completed Step 1 route from Back', () => {
    const screen = renderSession('venue');
    fireEvent.press(screen.getByLabelText('Go back to the previous onboarding step'));
    expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', {
      persona: 'venue',
      step: 'room',
    });
  });

  it.each(['artist', 'venue', 'promoter'] as const)(
    'signs a clean %s onboarding session out through the shared operation',
    async (persona) => {
      const screen = renderSession(persona);

      fireEvent.press(screen.getByLabelText('Sign out'));

      await waitFor(() => {
        expect(mockedStorage.clearAuthData).toHaveBeenCalledTimes(1);
        expect(screen.dispatchSpy).toHaveBeenCalledWith(onboardingApi.util.resetApiState());
        expect(screen.navigation.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      });
      expect(mockedApi.put).not.toHaveBeenCalled();
      expect(mockedApi.post).not.toHaveBeenCalled();
    },
  );

  it('flushes a valid dirty draft before clearing auth and navigating to Login', async () => {
    let resolveSave: ((value: unknown) => void) | undefined;
    mockedApi.put.mockImplementation(() => new Promise((resolve) => {
      resolveSave = resolve;
    }) as any);
    const screen = renderSession('artist');

    fireEvent.press(screen.getByLabelText('Indie'));
    fireEvent.press(screen.getByLabelText('Sign out'));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
      '/onboarding/steps/sound',
      { data: { ...PERSONA.artist.valid, genres: ['ROCK', 'INDIE'] } },
    ));
    expect(mockedStorage.clearAuthData).not.toHaveBeenCalled();
    expect(screen.navigation.reset).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave?.({ data: makeStep('artist') });
      await Promise.resolve();
    });
    await waitFor(() => expect(mockedStorage.clearAuthData).toHaveBeenCalledTimes(1));
    expect(screen.navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  });

  it('waits for an in-flight autosave before signing out', async () => {
    let resolveSave: ((value: unknown) => void) | undefined;
    mockedApi.put.mockImplementation(() => new Promise((resolve) => {
      resolveSave = resolve;
    }) as any);
    const screen = renderSession('artist');

    fireEvent.press(screen.getByLabelText('Indie'));
    await act(async () => jest.advanceTimersByTime(1100));
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText('Sign out'));
    expect(mockedStorage.clearAuthData).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave?.({ data: makeStep('artist') });
      await Promise.resolve();
      jest.advanceTimersByTime(50);
    });
    await waitFor(() => expect(mockedStorage.clearAuthData).toHaveBeenCalledTimes(1));
    expect(mockedApi.put).toHaveBeenCalledTimes(1);
  });

  it('lets Sign Out win over a Continue save without racing into step completion', async () => {
    let resolveSave: ((value: unknown) => void) | undefined;
    mockedApi.put.mockImplementation(() => new Promise((resolve) => {
      resolveSave = resolve;
    }) as any);
    const screen = renderSession('artist');

    fireEvent.press(continueButton(screen));
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText('Sign out'));
    expect(mockedStorage.clearAuthData).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave?.({ data: makeStep('artist') });
      await Promise.resolve();
      jest.advanceTimersByTime(50);
    });
    await waitFor(() => expect(mockedStorage.clearAuthData).toHaveBeenCalledTimes(1));
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(screen.navigation.push).not.toHaveBeenCalled();
    expect(screen.navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  });

  it('requires explicit confirmation before discarding an invalid dirty draft', async () => {
    const screen = renderSession('artist');

    fireEvent.press(screen.getByLabelText('Rock'));
    fireEvent.press(screen.getByLabelText('Sign out'));

    expect(screen.getByText('DISCARD UNSAVED CHANGES?')).toBeTruthy();
    expect(mockedStorage.clearAuthData).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Keep editing'));
    expect(screen.queryByText('DISCARD UNSAVED CHANGES?')).toBeNull();
    expect(screen.getByLabelText('Rock').props.accessibilityState.checked).toBe(false);

    fireEvent.press(screen.getByLabelText('Sign out'));
    fireEvent.press(screen.getByLabelText('Sign out and discard unsaved changes'));
    await waitFor(() => expect(mockedStorage.clearAuthData).toHaveBeenCalledTimes(1));
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(screen.navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  });

  it('blocks sign-out when the required valid-draft save fails', async () => {
    mockedApi.put.mockRejectedValue(new Error('offline'));
    const screen = renderSession('artist');

    fireEvent.press(screen.getByLabelText('Indie'));
    fireEvent.press(screen.getByLabelText('Sign out'));

    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(mockedStorage.clearAuthData).not.toHaveBeenCalled();
    expect(screen.navigation.reset).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Indie').props.accessibilityState.checked).toBe(true);
  });

  it('ignores duplicate Sign Out activation while logout cleanup is running', async () => {
    let resolveClear: (() => void) | undefined;
    mockedStorage.clearAuthData.mockImplementation(() => new Promise<void>((resolve) => {
      resolveClear = resolve;
    }));
    const screen = renderSession('artist');

    fireEvent.press(screen.getByLabelText('Sign out'));
    await waitFor(() => expect(mockedStorage.clearAuthData).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText('Signing out'));
    expect(mockedStorage.clearAuthData).toHaveBeenCalledTimes(1);

    await act(async () => resolveClear?.());
    await waitFor(() => expect(screen.navigation.reset).toHaveBeenCalledTimes(1));
  });
});
