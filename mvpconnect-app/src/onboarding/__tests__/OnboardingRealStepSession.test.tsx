import React from 'react';
import { Animated } from 'react-native';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import api from '../../services/api';
import { onboardingApi } from '../onboardingApi';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingRealStepSession } from '../OnboardingRealStepSession';
import type { OnboardingState, OnboardingStep } from '../onboardingTypes';

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
const VALID_DATA = {
  profileImage: { mediaId: 'media-1' },
  bio: 'Atmospheric indie rock from Brooklyn.',
  location: {
    displayName: 'Brooklyn, NY, United States',
    addressLine1: null,
    addressLine2: null,
    city: 'Brooklyn',
    state: 'NY',
    postalCode: null,
    country: 'United States',
    latitude: null,
    longitude: null,
    neighborhood: 'Williamsburg',
    placeId: null,
  },
};

const makeStep = (overrides: Partial<OnboardingStep> = {}): OnboardingStep => ({
  key: 'basics',
  position: 1,
  required: true,
  status: 'IN_PROGRESS',
  data: VALID_DATA,
  ...overrides,
});

const makeState = (step = makeStep(), currentStep = 'basics'): OnboardingState => ({
  persona: 'MUSICIAN',
  status: 'IN_PROGRESS',
  currentStep,
  onboardingVersion: 2,
  steps: [
    step,
    { key: 'sound', position: 2, required: true, status: 'NOT_STARTED', data: {} },
    { key: 'live', position: 3, required: true, status: 'NOT_STARTED', data: {} },
    { key: 'media', position: 4, required: false, status: 'NOT_STARTED', data: {} },
    { key: 'goals', position: 5, required: true, status: 'NOT_STARTED', data: {} },
  ],
});

const readyMedia = {
  id: 'media-1',
  mediaType: 'PROFILE_IMAGE',
  mediaContext: 'PROFILE',
  originalFileName: 'artist.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  status: 'READY',
  url: 'http://127.0.0.1:9000/fresh-access-url',
};

const renderSession = (step = makeStep(), state = makeState(step)) => {
  mockedApi.get.mockResolvedValue({ data: readyMedia } as any);
  const testStore = configureStore({
    reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(onboardingApi.middleware),
  });
  testStores.push(testStore);
  const navigation = { push: jest.fn() } as any;
  const screen = render(
    <Provider store={testStore}>
      <OnboardingRealStepSession
        state={state}
        step={step}
        config={ONBOARDING_CONFIG.artist}
        displayName="Glass Houses"
        navigation={navigation}
      />
    </Provider>,
  );
  return { ...screen, navigation };
};

describe('OnboardingRealStepSession', () => {
  let timingSpy: jest.SpyInstance;
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  beforeAll(() => {
    global.requestAnimationFrame = jest.fn(() => 0);
    global.cancelAnimationFrame = jest.fn();
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: (callback?: (result: { finished: boolean }) => void) => callback?.({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    }) as any);
  });
  afterAll(() => {
    timingSpy.mockRestore();
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });
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

  it('hydrates persisted form data and fetches a fresh media access URL', async () => {
    const screen = renderSession();
    expect(screen.getByDisplayValue('Atmospheric indie rock from Brooklyn.')).toBeTruthy();
    expect(screen.getByDisplayValue('Brooklyn')).toBeTruthy();
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/media/media-1'));
    expect(await screen.findByLabelText('Selected profile image preview')).toBeTruthy();
  });

  it('enables Continue for valid data and waits for save plus completion before navigating', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep() } as any);
    mockedApi.post.mockResolvedValue({
      data: makeState(makeStep({ status: 'COMPLETE' }), 'sound'),
    } as any);
    const screen = renderSession();
    const continueButton = await waitFor(() => {
      const button = screen.getByLabelText('Continue to the next onboarding step');
      expect(button.props.accessibilityState.disabled).toBe(false);
      return button;
    });

    fireEvent.press(continueButton);
    expect(screen.navigation.push).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', {
      persona: 'artist',
      step: 'sound',
    }));
    expect(mockedApi.put).toHaveBeenCalledWith('/onboarding/steps/basics', { data: VALID_DATA });
    expect(mockedApi.post).toHaveBeenCalledWith('/onboarding/steps/basics/complete', { data: VALID_DATA });
  });

  it('keeps local data and does not navigate when save fails', async () => {
    mockedApi.put.mockRejectedValue(new Error('offline'));
    const screen = renderSession();
    const continueButton = await waitFor(() => {
      const button = screen.getByLabelText('Continue to the next onboarding step');
      expect(button.props.accessibilityState.disabled).toBe(false);
      return button;
    });

    fireEvent.press(continueButton);
    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(screen.getByDisplayValue('Atmospheric indie rock from Brooklyn.')).toBeTruthy();
    expect(screen.navigation.push).not.toHaveBeenCalled();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('does not navigate when completion fails after a successful save', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep() } as any);
    mockedApi.post.mockRejectedValue(new Error('complete failed'));
    const screen = renderSession();
    const continueButton = await waitFor(() => {
      const button = screen.getByLabelText('Continue to the next onboarding step');
      expect(button.props.accessibilityState.disabled).toBe(false);
      return button;
    });

    fireEvent.press(continueButton);
    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(screen.navigation.push).not.toHaveBeenCalled();
  });

  it('does not autosave invalid edits', async () => {
    const screen = renderSession();
    await waitFor(() => expect(
      screen.getByLabelText('Continue to the next onboarding step').props.accessibilityState.disabled,
    ).toBe(false));
    fireEvent.changeText(screen.getByLabelText('City, required'), '');
    await act(async () => jest.advanceTimersByTime(1100));
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(screen.getByText('City is required.')).toBeTruthy();
  });

  it('autosaves valid edits after the step is valid', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep() } as any);
    const screen = renderSession();
    await waitFor(() => expect(
      screen.getByLabelText('Continue to the next onboarding step').props.accessibilityState.disabled,
    ).toBe(false));

    fireEvent.changeText(screen.getByLabelText('BIO, optional'), 'Updated artist bio');
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
      '/onboarding/steps/basics',
      expect.objectContaining({ data: expect.objectContaining({ bio: 'Updated artist bio' }) }),
    ), { timeout: 1800 });
    await screen.findByText('SAVED');
  });

  it('pauses autosave while city suggestions are open and resumes after selection', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep() } as any);
    const screen = renderSession();
    await waitFor(() => expect(
      screen.getByLabelText('Continue to the next onboarding step').props.accessibilityState.disabled,
    ).toBe(false));

    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/locations/suggestions') {
        return {
          data: [{ placeId: 'mount-vernon-place', displayName: 'Mount Vernon, NY, USA' }],
        } as any;
      }
      if (url === '/locations/place') {
        return {
          data: {
            displayName: 'Mount Vernon, NY, USA',
            addressLine1: null,
            addressLine2: null,
            city: 'Mount Vernon',
            state: 'NY',
            postalCode: null,
            country: 'United States',
            latitude: 40.9126,
            longitude: -73.8371,
            neighborhood: null,
            placeId: 'mount-vernon-place',
          },
        } as any;
      }
      return { data: readyMedia } as any;
    });

    fireEvent.changeText(screen.getByLabelText('City, required'), 'Mount Ver');
    await act(async () => jest.advanceTimersByTime(350));
    const suggestion = await screen.findByLabelText('Use location Mount Vernon, NY, USA');
    await act(async () => jest.advanceTimersByTime(1200));
    expect(mockedApi.put).not.toHaveBeenCalled();

    fireEvent.press(suggestion);
    await waitFor(() => expect(screen.getByDisplayValue('Mount Vernon')).toBeTruthy());
    await act(async () => jest.advanceTimersByTime(1100));
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
      '/onboarding/steps/basics',
      expect.objectContaining({
        data: expect.objectContaining({
          location: expect.objectContaining({
            city: 'Mount Vernon',
            placeId: 'mount-vernon-place',
          }),
        }),
      }),
    ));
  });

  it('reopens a completed step as soon as its local data is edited', async () => {
    const completed = makeStep({ status: 'COMPLETE' });
    mockedApi.post.mockResolvedValue({ data: makeState({ ...completed, status: 'IN_PROGRESS' }) } as any);
    const screen = renderSession(completed, makeState(completed));
    await waitFor(() => expect(
      screen.getByLabelText('Continue to the next onboarding step').props.accessibilityState.disabled,
    ).toBe(false));

    fireEvent.changeText(screen.getByLabelText('City, required'), '');
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/onboarding/steps/basics/reopen'));
    expect(mockedApi.put).not.toHaveBeenCalled();
  });
});
