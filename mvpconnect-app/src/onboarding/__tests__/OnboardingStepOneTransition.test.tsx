import React, { useState } from 'react';
import { Animated } from 'react-native';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import api from '../../services/api';
import { onboardingApi } from '../onboardingApi';
import { OnboardingShell } from '../OnboardingShell';
import type { OnboardingState, OnboardingStep } from '../onboardingTypes';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
  storageHelpers: {
    clearAuthData: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

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

const basics = (status: OnboardingStep['status'] = 'IN_PROGRESS'): OnboardingStep => ({
  key: 'basics',
  position: 1,
  required: true,
  status,
  data: VALID_DATA,
});

const stateAt = (currentStep: 'basics' | 'sound'): OnboardingState => ({
  persona: 'MUSICIAN',
  status: 'IN_PROGRESS',
  currentStep,
  onboardingVersion: 2,
  steps: [
    basics(currentStep === 'sound' ? 'COMPLETE' : 'IN_PROGRESS'),
    { key: 'sound', position: 2, required: true, status: 'NOT_STARTED', data: {} },
    { key: 'live', position: 3, required: true, status: 'NOT_STARTED', data: {} },
    { key: 'media', position: 4, required: false, status: 'NOT_STARTED', data: {} },
    { key: 'goals', position: 5, required: true, status: 'NOT_STARTED', data: {} },
  ],
});

describe('Artist Step 1 integrated transition', () => {
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

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('waits for the canonical cache handoff before exposing Step 2 to the route guard', async () => {
    const initialState = stateAt('basics');
    const completedState = stateAt('sound');
    const testStore = configureStore({
      reducer: { [onboardingApi.reducerPath]: onboardingApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(onboardingApi.middleware),
    });
    await testStore.dispatch(onboardingApi.util.upsertQueryData('getOnboarding', undefined, initialState));

    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/media/media-1') {
        return {
          data: {
            id: 'media-1',
            mediaType: 'PROFILE_IMAGE',
            mediaContext: 'PROFILE',
            originalFileName: 'artist.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            status: 'READY',
            url: 'http://127.0.0.1:9000/profile.jpg',
          },
        } as any;
      }
      if (url === '/me') {
        return {
          data: {
            id: 'artist-1',
            persona: 'MUSICIAN',
            displayName: 'Glass Houses',
            email: 'artist@example.com',
            profileImage: null,
          },
        } as any;
      }
      if (url === '/onboarding') return { data: initialState } as any;
      throw new Error(`Unexpected GET ${url}`);
    });
    mockedApi.put.mockResolvedValue({ data: basics() } as any);
    mockedApi.post.mockResolvedValue({ data: completedState } as any);

    const originalUpsert = onboardingApi.util.upsertQueryData;
    let releaseCacheHandoff: (() => void) | undefined;
    const cacheHandoff = new Promise<void>((resolve) => {
      releaseCacheHandoff = resolve;
    });
    jest.spyOn(onboardingApi.util, 'upsertQueryData').mockImplementation(((...args: Parameters<typeof originalUpsert>) => {
      const originalThunk = originalUpsert(...args);
      return async (dispatch: any) => {
        await cacheHandoff;
        return dispatch(originalThunk as any);
      };
    }) as unknown as typeof originalUpsert);

    let setRoute: React.Dispatch<React.SetStateAction<{ persona: 'artist'; step: string }>>;
    const navigation = {
      push: jest.fn((_screen: string, params: { persona: 'artist'; step: string }) => setRoute(params)),
      replace: jest.fn((_screen: string, params: { persona: 'artist'; step: string }) => setRoute(params)),
      reset: jest.fn(),
    } as any;
    const Harness = () => {
      const [params, updateRoute] = useState<{ persona: 'artist'; step: string }>({
        persona: 'artist',
        step: 'basics',
      });
      setRoute = updateRoute;
      return (
        <OnboardingShell
          navigation={navigation}
          route={{ key: params.step, name: 'Onboarding', params } as any}
        />
      );
    };

    const screen = render(
      <Provider store={testStore}>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, right: 0, bottom: 24, left: 0 },
          }}
        >
          <Harness />
        </SafeAreaProvider>
      </Provider>,
    );

    const continueButton = await screen.findByLabelText('Continue to the next onboarding step');
    await waitFor(() => expect(continueButton.props.accessibilityState.disabled).toBe(false));
    fireEvent.press(continueButton);

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith(
      '/onboarding/steps/basics/complete',
      { data: VALID_DATA },
    ));
    expect(navigation.push).not.toHaveBeenCalled();

    await act(async () => releaseCacheHandoff?.());

    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    expect(onboardingApi.endpoints.getOnboarding.select()(testStore.getState() as any).data?.currentStep)
      .toBe('sound');
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(await screen.findByText('WHAT DO YOU\nSOUND LIKE?')).toBeTruthy();

    screen.unmount();
    testStore.dispatch(onboardingApi.util.resetApiState());
  });
});
