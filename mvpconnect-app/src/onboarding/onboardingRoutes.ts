import {
  isOnboardingPersona,
  routePersonaForBackend,
} from './onboardingConfig';
import type { OnboardingPersona, OnboardingState } from './onboardingTypes';

export interface ResolvedOnboardingRoute {
  persona: OnboardingPersona;
  step: string;
  shouldRedirect: boolean;
}

const orderedSteps = (state: OnboardingState) =>
  [...state.steps].sort((left, right) => left.position - right.position);

export const resumeStepFromState = (state: OnboardingState): string => {
  const currentExists = state.steps.some((step) => step.key === state.currentStep);
  if (state.currentStep && currentExists) return state.currentStep;

  const ordered = orderedSteps(state);
  const unresolved = ordered
    .find((step) => step.status !== 'COMPLETE' && step.status !== 'SKIPPED');

  return unresolved?.key ?? ordered.at(-1)?.key ?? '';
};

export const resolveOnboardingRoute = (
  state: OnboardingState,
  requestedPersona: string,
  requestedStep: string,
  allowPlaceholderNavigation = false,
): ResolvedOnboardingRoute => {
  const persona = routePersonaForBackend(state.persona);
  const resumeStep = resumeStepFromState(state);
  if (state.status === 'COMPLETED' || state.steps.length === 0) {
    return { persona, step: requestedStep, shouldRedirect: false };
  }
  const personaMatches = isOnboardingPersona(requestedPersona) && requestedPersona === persona;
  const target = state.steps.find((step) => step.key === requestedStep);
  const resolvedTarget = target?.status === 'COMPLETE' || target?.status === 'SKIPPED';
  const isCurrent = requestedStep === state.currentStep;
  const onboardingResolved = state.status === 'READY';
  const stepAllowed = Boolean(
    target &&
    (allowPlaceholderNavigation || resolvedTarget || isCurrent || onboardingResolved),
  );

  if (!personaMatches || !stepAllowed) {
    return { persona, step: resumeStep, shouldRedirect: true };
  }

  return { persona, step: requestedStep, shouldRedirect: false };
};

export const previousResolvedStep = (
  state: OnboardingState,
  stepKey: string,
): string | undefined => {
  const ordered = orderedSteps(state);
  const index = ordered.findIndex((step) => step.key === stepKey);
  if (index <= 0) return undefined;

  const previous = ordered[index - 1];
  return previous.status === 'COMPLETE' || previous.status === 'SKIPPED'
    ? previous.key
    : undefined;
};

export const nextStepFromState = (
  state: OnboardingState,
  stepKey: string,
): string | undefined => {
  const ordered = orderedSteps(state);
  const index = ordered.findIndex((step) => step.key === stepKey);
  return index >= 0 ? ordered[index + 1]?.key : undefined;
};

export const previousStepFromState = (
  state: OnboardingState,
  stepKey: string,
): string | undefined => {
  const ordered = orderedSteps(state);
  const index = ordered.findIndex((step) => step.key === stepKey);
  return index > 0 ? ordered[index - 1]?.key : undefined;
};
