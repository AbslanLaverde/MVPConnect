import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import api, { storageHelpers } from '../../services/api';
import { onboardingApi } from '../onboardingApi';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingRealGoalsSession } from '../OnboardingRealGoalsSession';
import type { OnboardingPersona, OnboardingState, OnboardingStep } from '../onboardingTypes';

jest.mock('../../services/api', () => ({
  __esModule: true,
  storageHelpers: { clearAuthData: jest.fn() },
  default: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedStorage = storageHelpers as jest.Mocked<typeof storageHelpers>;
const stores: ReturnType<typeof configureStore>[] = [];
const PERSONA = {
  artist: { backend: 'MUSICIAN' as const, total: 5, previous: 'media', goals: ['BOOK_SHOWS'] },
  venue: { backend: 'VENUE' as const, total: 6, previous: 'media', goals: ['FIND_ARTISTS'] },
  promoter: { backend: 'PROMOTER' as const, total: 5, previous: 'media', goals: ['FIND_VENUES'] },
};

const makeStep = (persona: OnboardingPersona, status: OnboardingStep['status'] = 'IN_PROGRESS'): OnboardingStep => ({
  key: 'goals',
  position: PERSONA[persona].total,
  required: true,
  status,
  data: { connectionGoals: PERSONA[persona].goals },
});

const makeState = (persona: OnboardingPersona, step = makeStep(persona)): OnboardingState => ({
  persona: PERSONA[persona].backend,
  status: step.status === 'COMPLETE' ? 'READY' : 'IN_PROGRESS',
  currentStep: 'goals',
  onboardingVersion: 2,
  steps: Array.from({ length: PERSONA[persona].total }, (_, index) => index === PERSONA[persona].total - 1
    ? step
    : {
        key: index === PERSONA[persona].total - 2 ? 'media' : `step-${index + 1}`,
        position: index + 1,
        required: index !== PERSONA[persona].total - 2,
        status: 'COMPLETE' as const,
        data: {},
      }),
});

const renderSession = (persona: OnboardingPersona = 'artist', status: OnboardingStep['status'] = 'IN_PROGRESS') => {
  const step = makeStep(persona, status);
  const state = makeState(persona, step);
  const store = configureStore({
    reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(onboardingApi.middleware),
  });
  stores.push(store);
  const navigation = { push: jest.fn(), replace: jest.fn(), reset: jest.fn() } as any;
  return {
    ...render(
      <Provider store={store}>
        <OnboardingRealGoalsSession
          state={state}
          step={step}
          config={ONBOARDING_CONFIG[persona]}
          navigation={navigation}
        />
      </Provider>,
    ),
    navigation,
  };
};

describe('OnboardingRealGoalsSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedStorage.clearAuthData.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
    stores.splice(0).forEach((store) => store.dispatch(onboardingApi.util.resetApiState()));
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it.each(['artist', 'venue', 'promoter'] as const)(
    'runs the exact %s save, step completion, and final completion sequence before Welcome',
    async (persona) => {
      mockedApi.put.mockResolvedValue({ data: makeStep(persona) } as any);
      mockedApi.post.mockImplementation(async (url) => url === '/onboarding/complete'
        ? { data: { persona: PERSONA[persona].backend, status: 'COMPLETED', onboardingVersion: 2 } }
        : { data: makeState(persona, makeStep(persona, 'COMPLETE')) } as any);
      const screen = renderSession(persona);

      fireEvent.press(screen.getByLabelText('Finish onboarding'));
      expect(screen.navigation.reset).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Welcome' }],
      }));

      expect(mockedApi.put).toHaveBeenCalledWith('/onboarding/steps/goals', {
        data: { connectionGoals: PERSONA[persona].goals },
      });
      expect(mockedApi.post.mock.calls.map(([url]) => url)).toEqual([
        '/onboarding/steps/goals/complete',
        '/onboarding/complete',
      ]);
      expect(screen.queryByLabelText('Skip this optional step for now')).toBeNull();
    },
  );

  it('hydrates selections and autosaves a valid multi-select edit', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep('artist') } as any);
    const screen = renderSession('artist');
    expect(screen.getByLabelText('BOOK MORE SHOWS').props.accessibilityState.checked).toBe(true);
    fireEvent.press(screen.getByLabelText('CONNECT WITH PROMOTERS'));
    await act(async () => jest.advanceTimersByTime(1100));
    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith('/onboarding/steps/goals', {
      data: { connectionGoals: ['BOOK_SHOWS', 'FIND_PROMOTERS'] },
    }));
  });

  it('does not autosave or enable Finish after removing the last required goal', async () => {
    const screen = renderSession('artist');
    fireEvent.press(screen.getByLabelText('BOOK MORE SHOWS'));
    expect(screen.getByLabelText('Finish onboarding').props.accessibilityState.disabled).toBe(true);
    await act(async () => jest.advanceTimersByTime(1100));
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(screen.getByText('Choose at least one goal.')).toBeTruthy();
  });

  it('blocks graduation when saving fails and preserves the selected goal', async () => {
    mockedApi.put.mockRejectedValue(new Error('offline'));
    const screen = renderSession('artist');
    fireEvent.press(screen.getByLabelText('Finish onboarding'));
    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(screen.getByLabelText('BOOK MORE SHOWS').props.accessibilityState.checked).toBe(true);
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(screen.navigation.reset).not.toHaveBeenCalled();
  });

  it('blocks graduation when step completion fails and retries from that checkpoint', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep('artist') } as any);
    mockedApi.post
      .mockRejectedValueOnce(new Error('step completion offline'))
      .mockResolvedValueOnce({ data: makeState('artist', makeStep('artist', 'COMPLETE')) } as any)
      .mockResolvedValueOnce({
        data: { persona: 'MUSICIAN', status: 'COMPLETED', onboardingVersion: 2 },
      } as any);
    const screen = renderSession('artist');

    fireEvent.press(screen.getByLabelText('Finish onboarding'));
    expect(await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.")).toBeTruthy();
    expect(screen.navigation.reset).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Try again'));
    await waitFor(() => expect(screen.navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Welcome' }],
    }));
    expect(mockedApi.put).toHaveBeenCalledTimes(1);
    expect(mockedApi.post.mock.calls.map(([url]) => url)).toEqual([
      '/onboarding/steps/goals/complete',
      '/onboarding/steps/goals/complete',
      '/onboarding/complete',
    ]);
  });

  it('blocks final completion and retries only the idempotent final call', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep('venue') } as any);
    mockedApi.post
      .mockResolvedValueOnce({ data: makeState('venue', makeStep('venue', 'COMPLETE')) } as any)
      .mockRejectedValueOnce(new Error('final completion offline'))
      .mockResolvedValueOnce({ data: { persona: 'VENUE', status: 'COMPLETED', onboardingVersion: 2 } } as any);
    const screen = renderSession('venue');

    fireEvent.press(screen.getByLabelText('Finish onboarding'));
    expect(await screen.findByText("WE COULDN'T COMPLETE YOUR ONBOARDING.")).toBeTruthy();
    expect(screen.navigation.reset).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Try again'));
    await waitFor(() => expect(screen.navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Welcome' }],
    }));
    expect(mockedApi.put).toHaveBeenCalledTimes(1);
    expect(mockedApi.post.mock.calls.map(([url]) => url)).toEqual([
      '/onboarding/steps/goals/complete',
      '/onboarding/complete',
      '/onboarding/complete',
    ]);
  });

  it('finishes a READY draft directly and returns Back to Media', async () => {
    mockedApi.post.mockResolvedValue({
      data: { persona: 'PROMOTER', status: 'COMPLETED', onboardingVersion: 2 },
    } as any);
    const screen = renderSession('promoter', 'COMPLETE');
    fireEvent.press(screen.getByLabelText('Go back to the previous onboarding step'));
    expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', { persona: 'promoter', step: 'media' });
    fireEvent.press(screen.getByLabelText('Finish onboarding'));
    await waitFor(() => expect(screen.navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Welcome' }],
    }));
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(mockedApi.post).toHaveBeenCalledWith('/onboarding/complete');
  });

  it('saves a dirty Goals draft before sign-out without finishing or reaching Welcome', async () => {
    mockedApi.put.mockResolvedValue({ data: makeStep('artist') } as any);
    const screen = renderSession('artist');

    fireEvent.press(screen.getByLabelText('CONNECT WITH PROMOTERS'));
    fireEvent.press(screen.getByLabelText('Sign out'));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith('/onboarding/steps/goals', {
      data: { connectionGoals: ['BOOK_SHOWS', 'FIND_PROMOTERS'] },
    }));
    await waitFor(() => expect(screen.navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Login' }],
    }));
    expect(mockedStorage.clearAuthData).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(screen.navigation.reset).not.toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  });
});
