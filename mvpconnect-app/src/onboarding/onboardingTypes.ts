export type OnboardingPersona = 'artist' | 'venue' | 'promoter';

export type BackendPersona = 'MUSICIAN' | 'VENUE' | 'PROMOTER';

export type OnboardingStepStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'SKIPPED';

export type OnboardingDraftStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'COMPLETED';

export type OnboardingStepData = Record<string, unknown>;

export interface OnboardingStep {
  key: string;
  position: number;
  required: boolean;
  status: OnboardingStepStatus;
  data: OnboardingStepData;
}

export interface OnboardingState {
  persona: BackendPersona;
  status: OnboardingDraftStatus;
  currentStep: string | null;
  onboardingVersion: number;
  steps: OnboardingStep[];
}

export interface SaveOnboardingStepRequest {
  stepKey: string;
  data: OnboardingStepData;
}

export interface OnboardingApiError {
  status?: number;
  code?: string;
  message: string;
  details?: string[];
}

export type OnboardingSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
