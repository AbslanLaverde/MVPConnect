import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import api from '../../services/api';
import type { VenueReferenceProvider } from '../../services/venueIdentityService';
import { onboardingApi } from '../onboardingApi';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingRealStepThreeSession } from '../OnboardingRealStepThreeSession';
import type { OnboardingState, OnboardingStep, OnboardingStepData } from '../onboardingTypes';
import type { ArtistLiveStepRequest, StepThreeRequest, VenueStageStepRequest } from '../stepThreeTypes';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const testStores: ReturnType<typeof configureStore>[] = [];
const venueProvider: VenueReferenceProvider = {
  searchLocal: jest.fn().mockResolvedValue([]),
  searchGoogle: jest.fn().mockResolvedValue([]),
  resolveGoogle: jest.fn(),
  createFreeForm: jest.fn(),
};

const ARTIST_DATA: ArtistLiveStepRequest = {
  bookingStatus: 'ACTIVELY_BOOKING',
  typicalDraw: 'FROM_101_TO_250',
  touring: false,
  travelRadiusMiles: 50,
  setLengthMinutes: 45,
  equipmentBrought: [
    { code: 'GUITAR_AMP', quantity: 2 },
    { code: 'MICROPHONES', quantity: 4 },
    { code: 'DRUM_KIT', quantity: null },
  ],
  venuesPlayed: [{
    entityType: 'VENUE',
    entityId: 'venue-babys-all-right',
    displayName: "Baby's All Right",
    external: true,
  }],
  performanceImages: [],
};

const VENUE_DATA: VenueStageStepRequest = {
  stageWidthFeet: 24,
  stageDepthFeet: 16,
  soundEngineerAvailability: 'IN_HOUSE',
  soundcheckAvailability: 'FULL_SOUNDCHECK',
  paAvailability: 'FULL_HOUSE_PA',
  equipmentAvailable: [
    { code: 'STAGE_MONITORS', quantity: 4 },
    { code: 'DI_BOXES', quantity: 6 },
    { code: 'DRUM_KIT', quantity: null },
  ],
  productionAmenities: ['GREEN_ROOM', 'LOAD_IN_ACCESS'],
};

const PERSONA = {
  artist: {
    backend: 'MUSICIAN' as const,
    step: 'live',
    previous: 'sound',
    next: 'media',
    steps: ['basics', 'sound', 'live', 'media', 'goals'],
    valid: ARTIST_DATA,
  },
  venue: {
    backend: 'VENUE' as const,
    step: 'stage',
    previous: 'music',
    next: 'booking',
    steps: ['room', 'music', 'stage', 'booking', 'media', 'goals'],
    valid: VENUE_DATA,
  },
};

const makeStep = (
  persona: keyof typeof PERSONA,
  data: StepThreeRequest = PERSONA[persona].valid,
  status: OnboardingStep['status'] = 'IN_PROGRESS',
): OnboardingStep => ({
  key: PERSONA[persona].step,
  position: 3,
  required: true,
  status,
  data: data as unknown as OnboardingStepData,
});

const makeState = (
  persona: keyof typeof PERSONA,
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
        status: index < 2 ? 'COMPLETE' : 'NOT_STARTED',
        data: {},
      }),
});

const renderSession = (
  persona: keyof typeof PERSONA,
  data: StepThreeRequest = PERSONA[persona].valid,
  status: OnboardingStep['status'] = 'IN_PROGRESS',
) => {
  const step = makeStep(persona, data, status);
  const state = makeState(persona, step);
  const testStore = configureStore({
    reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(onboardingApi.middleware),
  });
  testStores.push(testStore);
  const navigation = { push: jest.fn() } as any;
  const screen = render(
    <Provider store={testStore}>
      <OnboardingRealStepThreeSession
        state={state}
        step={step}
        config={ONBOARDING_CONFIG[persona]}
        navigation={navigation}
        venueProvider={venueProvider}
      />
    </Provider>,
  );
  return { ...screen, navigation };
};

const continueButton = (screen: ReturnType<typeof renderSession>) =>
  screen.getByLabelText('Continue to the next onboarding step');

describe('OnboardingRealStepThreeSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    testStores.splice(0).forEach((testStore) => {
      testStore.dispatch(onboardingApi.util.resetApiState());
    });
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it.each(['artist', 'venue'] as const)(
    'saves the exact typed %s DTO, completes, then navigates to Step 4',
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

  it('hydrates Artist selections, travel, quantities, and VenueIdentity references', () => {
    const screen = renderSession('artist');

    expect(screen.getByLabelText('Actively Booking').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('101–250').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Up to 50 Miles').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('45 Min').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Guitar Amp quantity, optional').props.value).toBe('2');
    expect(screen.getByText("Baby's All Right")).toBeTruthy();
  });

  it('hydrates Venue sound support, dimensions, quantities, and amenities', () => {
    const screen = renderSession('venue');

    expect(screen.getByLabelText('In House').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Full Soundcheck').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Full House PA').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Stage width in feet, optional').props.value).toBe('24');
    expect(screen.getByLabelText('Stage Monitors quantity, optional').props.value).toBe('4');
    expect(screen.getByLabelText('Green Room').props.accessibilityState.checked).toBe(true);
  });

  it('blocks Continue and autosave when required Artist values are absent', async () => {
    const screen = renderSession('artist', {
      ...ARTIST_DATA,
      bookingStatus: undefined as never,
    });

    expect(continueButton(screen).props.accessibilityState.disabled).toBe(true);
    await act(async () => jest.advanceTimersByTime(1100));
    expect(mockedApi.put).not.toHaveBeenCalled();
  });

  it('blocks Venue autosave when a populated dimension is invalid', async () => {
    const screen = renderSession('venue');

    fireEvent.changeText(screen.getByLabelText('Stage width in feet, optional'), '0');
    expect(continueButton(screen).props.accessibilityState.disabled).toBe(true);
    await act(async () => jest.advanceTimersByTime(1100));
    expect(mockedApi.put).not.toHaveBeenCalled();
  });

  it('autosaves a valid Artist edit after the existing debounce', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep('artist') } as any);
    const screen = renderSession('artist');

    fireEvent.press(screen.getByLabelText('Open to Offers'));
    await act(async () => jest.advanceTimersByTime(1100));
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
      '/onboarding/steps/live',
      { data: { ...ARTIST_DATA, bookingStatus: 'OPEN_TO_OFFERS' } },
    ));
  });

  it('reopens a completed Venue step immediately after an edit', async () => {
    mockedApi.post.mockResolvedValue({
      data: makeState('venue', makeStep('venue'), 'stage'),
    } as any);
    const screen = renderSession('venue', VENUE_DATA, 'COMPLETE');

    fireEvent.press(screen.getByLabelText('Limited PA'));
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith(
      '/onboarding/steps/stage/reopen',
    ));
    expect(mockedApi.put).not.toHaveBeenCalled();
  });

  it('does not navigate or complete when the save fails', async () => {
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

  it.each(['artist', 'venue'] as const)(
    'returns %s to its completed Step 2 route from Back',
    (persona) => {
      const screen = renderSession(persona);
      fireEvent.press(screen.getByLabelText('Go back to the previous onboarding step'));
      expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', {
        persona,
        step: PERSONA[persona].previous,
      });
    },
  );
});
