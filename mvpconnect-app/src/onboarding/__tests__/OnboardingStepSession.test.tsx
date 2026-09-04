import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import api from '../../services/api';
import { onboardingApi } from '../onboardingApi';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingStepSession } from '../OnboardingStepSession';
import { OnboardingState, OnboardingStep } from '../onboardingTypes';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

const makeStep = (overrides: Partial<OnboardingStep> = {}): OnboardingStep => ({
  key: 'basics',
  position: 1,
  required: true,
  status: 'NOT_STARTED',
  data: {},
  ...overrides,
});

const makeState = (step: OnboardingStep, overrides: Partial<OnboardingState> = {}): OnboardingState => {
  const defaultSteps: OnboardingStep[] = [
    { key: 'basics', position: 1, required: true, status: 'NOT_STARTED', data: {} },
    { key: 'sound', position: 2, required: true, status: 'NOT_STARTED', data: {} },
    { key: 'live', position: 3, required: true, status: 'NOT_STARTED', data: {} },
    { key: 'media', position: 4, required: false, status: 'NOT_STARTED', data: {} },
    { key: 'goals', position: 5, required: true, status: 'NOT_STARTED', data: {} },
  ];

  return {
    persona: 'MUSICIAN',
    status: 'IN_PROGRESS',
    currentStep: step.key,
    onboardingVersion: 2,
    steps: defaultSteps.map((candidate) => candidate.key === step.key ? step : candidate),
    ...overrides,
  };
};

const renderSession = (
  step = makeStep(),
  state = makeState(step),
  saveBypass = false,
) => {
  const testStore = configureStore({
    reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(onboardingApi.middleware),
  });
  const navigation = { push: jest.fn() } as any;
  const screen = render(
    <Provider store={testStore}>
      <OnboardingStepSession
        state={state}
        step={step}
        config={ONBOARDING_CONFIG.artist}
        navigation={navigation}
        saveBypass={saveBypass}
      />
    </Provider>,
  );
  return { ...screen, navigation };
};

describe('OnboardingStepSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('enables Continue only after the temporary required value is valid', () => {
    const screen = renderSession();
    const continueButton = screen.getByLabelText('Continue to the next onboarding step');

    expect(continueButton.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByLabelText('Framework placeholder is ready'));
    expect(screen.getByLabelText('Continue to the next onboarding step').props.accessibilityState.disabled).toBe(false);
  });

  it('autosaves valid dirty data without completing the step', async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: makeStep({ status: 'IN_PROGRESS', data: { frameworkConfirmed: true } }),
    } as any);
    const screen = renderSession();

    fireEvent.press(screen.getByLabelText('Framework placeholder is ready'));
    await act(async () => jest.advanceTimersByTime(1000));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
      '/onboarding/steps/basics',
      { data: { frameworkConfirmed: true } },
    ));
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('waits for backend completion before navigating', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    mockedApi.post.mockReturnValueOnce(new Promise((resolve) => {
      resolveRequest = resolve;
    }) as any);
    const screen = renderSession();
    fireEvent.press(screen.getByLabelText('Framework placeholder is ready'));
    fireEvent.press(screen.getByLabelText('Continue to the next onboarding step'));

    expect(screen.navigation.push).not.toHaveBeenCalled();

    await act(async () => resolveRequest({
      data: makeState(
        makeStep({ status: 'COMPLETE', data: { frameworkConfirmed: true } }),
        { currentStep: 'sound' },
      ),
    }));

    await waitFor(() => expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', {
      persona: 'artist',
      step: 'sound',
    }));
  });

  it('advances placeholder steps locally without calling a save endpoint when bypass is enabled', () => {
    const screen = renderSession(makeStep(), undefined, true);

    fireEvent.press(screen.getByLabelText('Framework placeholder is ready'));
    fireEvent.press(screen.getByLabelText('Continue to the next onboarding step'));

    expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', {
      persona: 'artist',
      step: 'sound',
    });
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('offers Skip for backend-defined optional Media and advances locally during bypass', () => {
    const media = makeStep({ key: 'media', position: 4, required: false });
    const screen = renderSession(media, makeState(media, { currentStep: 'media' }), true);

    fireEvent.press(screen.getByLabelText('Skip this optional step for now'));

    expect(screen.navigation.push).toHaveBeenCalledWith('Onboarding', {
      persona: 'artist',
      step: 'goals',
    });
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('keeps local values and stays on the step when completion fails', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('offline'));
    const screen = renderSession();
    const checkbox = screen.getByLabelText('Framework placeholder is ready');

    fireEvent.press(checkbox);
    fireEvent.press(screen.getByLabelText('Continue to the next onboarding step'));

    await screen.findByText("WE COULDN'T SAVE YOUR CHANGES.");
    expect(screen.getByLabelText('Framework placeholder is ready').props.accessibilityState.checked).toBe(true);
    expect(screen.navigation.push).not.toHaveBeenCalled();
  });

  it('reopens a completed step after local edits make it invalid', async () => {
    const completeStep = makeStep({
      status: 'COMPLETE',
      data: { frameworkConfirmed: true, preserved: 'value' },
    });
    mockedApi.post.mockResolvedValueOnce({
      data: makeState({ ...completeStep, status: 'IN_PROGRESS' }),
    } as any);
    const screen = renderSession(completeStep, makeState(completeStep));

    fireEvent.press(screen.getByLabelText('Framework placeholder is ready'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith(
      '/onboarding/steps/basics/reopen',
    ));
    expect(mockedApi.put).not.toHaveBeenCalled();
  });
});
