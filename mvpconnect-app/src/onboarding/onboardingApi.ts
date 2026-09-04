import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import axios from 'axios';
import api from '../services/api';
import type {
  OnboardingApiError,
  OnboardingState,
  OnboardingStep,
  SaveOnboardingStepRequest,
} from './onboardingTypes';

const toApiError = (error: unknown): OnboardingApiError => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as Partial<OnboardingApiError> | undefined;
    return {
      status: error.response?.status,
      code: payload?.code,
      message: payload?.message || 'The request could not be completed.',
      details: payload?.details,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'The request could not be completed.',
  };
};

export const onboardingApi = createApi({
  reducerPath: 'onboardingApi',
  baseQuery: fakeBaseQuery<OnboardingApiError>(),
  tagTypes: ['Onboarding'],
  endpoints: (builder) => ({
    getOnboarding: builder.query<OnboardingState, void>({
      queryFn: async () => {
        try {
          const response = await api.get<OnboardingState>('/onboarding');
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      providesTags: ['Onboarding'],
    }),
    saveOnboardingStep: builder.mutation<OnboardingStep, SaveOnboardingStepRequest>({
      queryFn: async ({ stepKey, data }) => {
        try {
          const response = await api.put<OnboardingStep>(`/onboarding/steps/${stepKey}`, { data });
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      async onQueryStarted(_request, { dispatch, queryFulfilled }) {
        try {
          const { data: savedStep } = await queryFulfilled;
          dispatch(
            onboardingApi.util.updateQueryData('getOnboarding', undefined, (draft) => {
              const index = draft.steps.findIndex((step) => step.key === savedStep.key);
              if (index >= 0) draft.steps[index] = savedStep;
            }),
          );
        } catch {
          // The calling UI owns error presentation and retry behavior.
        }
      },
    }),
    completeOnboardingStep: builder.mutation<OnboardingState, SaveOnboardingStepRequest>({
      queryFn: async ({ stepKey, data }) => {
        try {
          const response = await api.post<OnboardingState>(
            `/onboarding/steps/${stepKey}/complete`,
            { data },
          );
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      async onQueryStarted(_request, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(onboardingApi.util.upsertQueryData('getOnboarding', undefined, data));
        } catch {
          // The calling UI owns error presentation and retry behavior.
        }
      },
    }),
    skipOnboardingStep: builder.mutation<OnboardingState, string>({
      queryFn: async (stepKey) => {
        try {
          const response = await api.post<OnboardingState>(`/onboarding/steps/${stepKey}/skip`);
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      async onQueryStarted(_request, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(onboardingApi.util.upsertQueryData('getOnboarding', undefined, data));
        } catch {
          // The calling UI owns error presentation and retry behavior.
        }
      },
    }),
    reopenOnboardingStep: builder.mutation<OnboardingState, string>({
      queryFn: async (stepKey) => {
        try {
          const response = await api.post<OnboardingState>(`/onboarding/steps/${stepKey}/reopen`);
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      async onQueryStarted(_request, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(onboardingApi.util.upsertQueryData('getOnboarding', undefined, data));
        } catch {
          // The calling UI owns error presentation and retry behavior.
        }
      },
    }),
  }),
});

export const {
  useGetOnboardingQuery,
  useSaveOnboardingStepMutation,
  useCompleteOnboardingStepMutation,
  useSkipOnboardingStepMutation,
  useReopenOnboardingStepMutation,
} = onboardingApi;
