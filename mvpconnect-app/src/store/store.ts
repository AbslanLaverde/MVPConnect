import { configureStore } from '@reduxjs/toolkit';
import { onboardingApi } from '../onboarding/onboardingApi';

export const store = configureStore({
  reducer: {
    [onboardingApi.reducerPath]: onboardingApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(onboardingApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
