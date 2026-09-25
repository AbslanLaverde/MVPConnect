import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';
import axios from 'axios';
import api from '../services/api';
import { sessionController } from '../auth/session';
import type {
  OnboardingApiError,
  OnboardingState,
  OnboardingStep,
  SaveOnboardingStepRequest,
} from './onboardingTypes';
import type { OwnedMediaResponse } from './onboardingMedia';
import type { ExternalConnectionSummary } from '../services/externalConnectionService';
import type { ExternalArtistResult } from '../services/externalArtistService';
import type { GoalCode } from './goalTypes';

export interface SelfProfileMedia {
  mediaId: string;
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface SelfAccountResponse {
  id: string;
  persona: 'MUSICIAN' | 'VENUE' | 'PROMOTER';
  displayName: string;
  email: string;
  profileImage?: SelfProfileMedia | null;
  bannerImage?: SelfProfileMedia | null;
  galleryImages?: SelfProfileMedia[];
  externalConnections?: ExternalConnectionSummary[];
  spotifyArtistIdentity?: ExternalArtistResult | null;
  connectionGoals?: GoalCode[];
  [key: string]: unknown;
}

export interface OnboardingCompletionResponse {
  persona: 'MUSICIAN' | 'VENUE' | 'PROMOTER';
  status: 'COMPLETED';
  onboardingCompletedAt: string;
  onboardingVersion: number;
}

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

export const fetchOnboardingState = async (): Promise<OnboardingState> => {
  const response = await api.get<OnboardingState>('/onboarding');
  return response.data;
};

const synchronizeOnboardingState = async (
  dispatch: BaseQueryApi['dispatch'],
  state: OnboardingState,
) => {
  await dispatch(onboardingApi.util.upsertQueryData('getOnboarding', undefined, state));
};

const cacheDeletedOwnedMedia = async (
  dispatch: BaseQueryApi['dispatch'],
  mediaId: string,
) => {
  await dispatch(onboardingApi.util.upsertQueryData('getOwnedMedia', mediaId, null));
};

export const onboardingApi = createApi({
  reducerPath: 'onboardingApi',
  baseQuery: fakeBaseQuery<OnboardingApiError>(),
  tagTypes: ['Onboarding'],
  endpoints: (builder) => ({
    getOnboarding: builder.query<OnboardingState, void>({
      queryFn: async () => {
        try {
          return { data: await fetchOnboardingState() };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      providesTags: ['Onboarding'],
    }),
    getSelfAccount: builder.query<SelfAccountResponse, void>({
      queryFn: async () => {
        try {
          const response = await api.get<SelfAccountResponse>('/me');
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
    }),
    getOwnedMedia: builder.query<OwnedMediaResponse | null, string>({
      queryFn: async (mediaId) => {
        try {
          const response = await api.get<OwnedMediaResponse>(`/media/${mediaId}`);
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      keepUnusedDataFor: 0,
    }),
    deleteOwnedMedia: builder.mutation<string, string>({
      queryFn: async (mediaId, { dispatch }) => {
        const generation = sessionController.getGeneration();
        try {
          await api.delete(`/media/${mediaId}`);
          sessionController.assertGeneration(generation);
          await cacheDeletedOwnedMedia(dispatch, mediaId);
          return { data: mediaId };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
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
        const generation = sessionController.getGeneration();
        try {
          const { data: savedStep } = await queryFulfilled;
          sessionController.assertGeneration(generation);
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
      queryFn: async ({ stepKey, data }, { dispatch }) => {
        const generation = sessionController.getGeneration();
        try {
          const response = await api.post<OnboardingState>(
            `/onboarding/steps/${stepKey}/complete`,
            { data },
          );
          sessionController.assertGeneration(generation);
          await synchronizeOnboardingState(dispatch, response.data);
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
    }),
    skipOnboardingStep: builder.mutation<OnboardingState, string>({
      queryFn: async (stepKey, { dispatch }) => {
        const generation = sessionController.getGeneration();
        try {
          const response = await api.post<OnboardingState>(`/onboarding/steps/${stepKey}/skip`);
          sessionController.assertGeneration(generation);
          await synchronizeOnboardingState(dispatch, response.data);
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
    }),
    reopenOnboardingStep: builder.mutation<OnboardingState, string>({
      queryFn: async (stepKey, { dispatch }) => {
        const generation = sessionController.getGeneration();
        try {
          const response = await api.post<OnboardingState>(`/onboarding/steps/${stepKey}/reopen`);
          sessionController.assertGeneration(generation);
          await synchronizeOnboardingState(dispatch, response.data);
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
    }),
    completeOnboarding: builder.mutation<OnboardingCompletionResponse, void>({
      queryFn: async (_request, { dispatch }) => {
        const generation = sessionController.getGeneration();
        try {
          const response = await api.post<OnboardingCompletionResponse>('/onboarding/complete');
          sessionController.assertGeneration(generation);
          // Completion commits canonical media before returning. A /me request
          // started before promotion must settle before we force a fresh one;
          // RTK Query otherwise deduplicates against that stale in-flight read.
          await dispatch(onboardingApi.util.getRunningQueryThunk('getSelfAccount', undefined));
          sessionController.assertGeneration(generation);
          await dispatch(onboardingApi.endpoints.getSelfAccount.initiate(undefined, {
            subscribe: false,
            forceRefetch: true,
          }));
          sessionController.assertGeneration(generation);
          // A failed identity read does not undo completed onboarding. Welcome
          // blocks entry on that query error and offers its existing retry.
          return { data: response.data };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      async onQueryStarted(_request, { dispatch, queryFulfilled }) {
        const generation = sessionController.getGeneration();
        try {
          const { data } = await queryFulfilled;
          sessionController.assertGeneration(generation);
          dispatch(
            onboardingApi.util.updateQueryData('getOnboarding', undefined, (draft) => {
              draft.status = data.status;
            }),
          );
        } catch {
          // The graduation UI owns error presentation and retry behavior.
        }
      },
    }),
  }),
});

export const {
  useGetOnboardingQuery,
  useGetSelfAccountQuery,
  useGetOwnedMediaQuery,
  useDeleteOwnedMediaMutation,
  useSaveOnboardingStepMutation,
  useCompleteOnboardingStepMutation,
  useSkipOnboardingStepMutation,
  useReopenOnboardingStepMutation,
  useCompleteOnboardingMutation,
} = onboardingApi;
