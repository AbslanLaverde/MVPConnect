import { configureStore } from '@reduxjs/toolkit';
import { onboardingApi } from '../onboarding/onboardingApi';
import { registerSessionCacheReset } from '../auth/sessionExit';

export const store = configureStore({
  reducer: {
    [onboardingApi.reducerPath]: onboardingApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(onboardingApi.middleware),
});

registerSessionCacheReset(() => store.dispatch(onboardingApi.util.resetApiState()));

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
