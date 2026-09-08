import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import api from '../../services/api';
import type { LocationSuggestionProvider } from '../../components/onboarding/LocationField';
import { onboardingApi } from '../onboardingApi';
import type {
  BookingNetworkStepRequest,
  PromoterNetworkStepRequest,
  VenueBookingStepRequest,
} from '../bookingNetworkTypes';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingRealBookingNetworkSession } from '../OnboardingRealBookingNetworkSession';
import type { OnboardingState, OnboardingStep, OnboardingStepData } from '../onboardingTypes';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const stores: ReturnType<typeof configureStore>[] = [];
const locationProvider: LocationSuggestionProvider = { search: jest.fn().mockResolvedValue([]) };

const VENUE_DATA: VenueBookingStepRequest = {
  bookingStatus: 'ACTIVELY_BOOKING',
  bookingMethod: 'BOTH',
  desiredArtistDraw: 'FROM_101_TO_250',
  bookingEmail: 'booking@venue.example',
};

const PROMOTER_DATA: PromoterNetworkStepRequest = {
  acceptingStatus: 'ACTIVELY_ACCEPTING',
  rosterSize: 'ONE_TO_FIVE',
  rosterArtists: [{
    entityType: 'ARTIST', entityId: 'artist-interpol', displayName: 'Interpol', external: true,
  }],
  venues: [{
    entityType: 'VENUE', entityId: 'venue-elsewhere', displayName: 'Elsewhere', external: true,
  }],
  additionalMarkets: [{
    displayName: 'Austin, TX, US', addressLine1: null, addressLine2: null,
    city: 'Austin', state: 'TX', postalCode: null, country: 'US',
    latitude: null, longitude: null, neighborhood: null, placeId: 'place-austin',
  }],
  pastShows: [],
};

const PERSONA = {
  venue: {
    backend: 'VENUE' as const,
    step: 'booking',
    position: 4,
    previous: 'stage',
    next: 'media',
    steps: ['room', 'music', 'stage', 'booking', 'media', 'goals'],
    data: VENUE_DATA,
  },
  promoter: {
    backend: 'PROMOTER' as const,
    step: 'network',
    position: 3,
    previous: 'specialties',
    next: 'media',
    steps: ['business', 'specialties', 'network', 'media', 'goals'],
    data: PROMOTER_DATA,
  },
};

type Persona = keyof typeof PERSONA;

const makeStep = (
  persona: Persona,
  data: BookingNetworkStepRequest = PERSONA[persona].data,
  status: OnboardingStep['status'] = 'IN_PROGRESS',
): OnboardingStep => ({
  key: PERSONA[persona].step,
  position: PERSONA[persona].position,
  required: true,
  status,
  data: data as unknown as OnboardingStepData,
});

const makeState = (
  persona: Persona,
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
        status: index < PERSONA[persona].position - 1 ? 'COMPLETE' : 'NOT_STARTED',
        data: {},
      }),
});

const renderSession = (
  persona: Persona,
  data: BookingNetworkStepRequest = PERSONA[persona].data,
  status: OnboardingStep['status'] = 'IN_PROGRESS',
) => {
  const step = makeStep(persona, data, status);
  const state = makeState(persona, step);
  const store = configureStore({
    reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(onboardingApi.middleware),
  });
  stores.push(store);
  const navigation = { push: jest.fn() } as any;
  const screen = render(
    <Provider store={store}>
      <OnboardingRealBookingNetworkSession
        state={state}
        step={step}
        config={ONBOARDING_CONFIG[persona]}
        navigation={navigation}
        locationProvider={locationProvider}
      />
    </Provider>,
  );
  return { ...screen, navigation };
};

describe('OnboardingRealBookingNetworkSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    stores.splice(0).forEach((store) => store.dispatch(onboardingApi.util.resetApiState()));
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it.each(['venue', 'promoter'] as const)(
    'saves and completes %s before navigating to Media',
    async (persona) => {
      const step = makeStep(persona);
      mockedApi.put.mockResolvedValue({ data: step } as any);
      mockedApi.post.mockResolvedValue({
        data: makeState(persona, { ...step, status: 'COMPLETE' }, PERSONA[persona].next),
      } as any);
      const screen = renderSession(persona);

      fireEvent.press(screen.getByLabelText('Continue to the next onboarding step'));
      expect(screen.navigation.push).not.toHaveBeenCalled();
      await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
        `/onboarding/steps/${PERSONA[persona].step}`,
        { data: PERSONA[persona].data },
      ));
      await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith(
        `/onboarding/steps/${PERSONA[persona].step}/complete`,
        { data: PERSONA[persona].data },
      ));
      expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', { persona, step: 'media' });
    },
  );

  it('hydrates Venue selections and private booking email', () => {
    const screen = renderSession('venue');

    expect(screen.getByLabelText('Actively Booking').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Both').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('101–250').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Booking email, optional').props.value).toBe('booking@venue.example');
  });

  it('hydrates Promoter roster, venue, and structured market references', () => {
    const screen = renderSession('promoter');

    expect(screen.getByLabelText('Actively Accepting').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('1–5').props.accessibilityState.checked).toBe(true);
    expect(screen.getByText('Interpol')).toBeTruthy();
    expect(screen.getByText('Elsewhere')).toBeTruthy();
    expect(screen.getByText('Austin, TX')).toBeTruthy();
  });

  it('does not autosave an invalid private Venue booking email', async () => {
    const venue = renderSession('venue');
    fireEvent.changeText(venue.getByLabelText('Booking email, optional'), 'invalid');
    expect(venue.getByLabelText('Continue to the next onboarding step').props.accessibilityState.disabled)
      .toBe(true);
    await act(async () => jest.advanceTimersByTime(1100));
    expect(mockedApi.put).not.toHaveBeenCalled();
  });

  it('does not allow a missing required Promoter status to save', () => {
    const promoter = renderSession('promoter', { ...PROMOTER_DATA, acceptingStatus: undefined as never });
    expect(promoter.getByLabelText('Continue to the next onboarding step').props.accessibilityState.disabled)
      .toBe(true);
    expect(mockedApi.put).not.toHaveBeenCalled();
  });

  it('autosaves valid edits after the existing debounce', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep('venue') } as any);
    const screen = renderSession('venue');

    fireEvent.press(screen.getByLabelText('Direct'));
    await act(async () => jest.advanceTimersByTime(1100));
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
      '/onboarding/steps/booking',
      { data: { ...VENUE_DATA, bookingMethod: 'DIRECT' } },
    ));
  });

  it('reopens a completed Promoter step and persists the exact triggering edit', async () => {
    mockedApi.post.mockResolvedValue({
      data: makeState('promoter', makeStep('promoter'), 'network'),
    } as any);
    mockedApi.put.mockResolvedValue({ data: makeStep('promoter') } as any);
    const screen = renderSession('promoter', PROMOTER_DATA, 'COMPLETE');

    fireEvent.press(screen.getByLabelText('Selectively Accepting'));
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/onboarding/steps/network/reopen'));
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith('/onboarding/steps/network', {
      data: { ...PROMOTER_DATA, acceptingStatus: 'SELECTIVELY_ACCEPTING' },
    }));
  });

  it('reopens an invalid completed edit without overwriting the last valid draft', async () => {
    mockedApi.post.mockResolvedValue({
      data: makeState('venue', makeStep('venue'), 'booking'),
    } as any);
    const screen = renderSession('venue', VENUE_DATA, 'COMPLETE');

    fireEvent.changeText(screen.getByLabelText('Booking email, optional'), 'invalid');
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/onboarding/steps/booking/reopen'));
    expect(mockedApi.put).not.toHaveBeenCalled();
  });

  it('blocks completion and navigation when the save fails', async () => {
    mockedApi.put.mockRejectedValue(new Error('offline'));
    const screen = renderSession('venue');

    fireEvent.press(screen.getByLabelText('Continue to the next onboarding step'));
    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(screen.navigation.push).not.toHaveBeenCalled();
  });

  it('blocks navigation and offers retry when completion fails', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep('promoter') } as any);
    mockedApi.post.mockRejectedValue(new Error('completion offline'));
    const screen = renderSession('promoter');

    fireEvent.press(screen.getByLabelText('Continue to the next onboarding step'));
    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(mockedApi.put).toHaveBeenCalled();
    expect(mockedApi.post).toHaveBeenCalled();
    expect(screen.navigation.push).not.toHaveBeenCalled();
  });

  it.each(['venue', 'promoter'] as const)('returns %s to its previous completed step', (persona) => {
    const screen = renderSession(persona);
    fireEvent.press(screen.getByLabelText('Go back to the previous onboarding step'));
    expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', {
      persona,
      step: PERSONA[persona].previous,
    });
  });
});
