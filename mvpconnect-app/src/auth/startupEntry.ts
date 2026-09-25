import { onboardingApi, type SelfAccountResponse } from '../onboarding/onboardingApi';
import type { OnboardingState } from '../onboarding/onboardingTypes';
import { resolveAuthenticatedEntryRoute } from '../onboarding/onboardingRoutes';
import { configuredStepFor } from '../onboarding/onboardingConfig';
import { authenticatedAppRoute, resolveAuthenticatedHomeRoute } from '../navigation/authenticatedRoutes';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { AppDispatch } from '../store/store';
import type { SessionController } from './sessionController';
import { StaleSessionError } from './authErrors';

export type StartupRoute = {
  [Name in keyof RootStackParamList]: undefined extends RootStackParamList[Name]
    ? { name: Name; params?: RootStackParamList[Name] }
    : { name: Name; params: RootStackParamList[Name] }
}[keyof RootStackParamList];

const validIdentity = (value: SelfAccountResponse): boolean => Boolean(value
  && typeof value.id === 'string' && value.id.trim()
  && ['MUSICIAN', 'VENUE', 'PROMOTER'].includes(value.persona)
  && typeof value.displayName === 'string' && typeof value.email === 'string');

function validWorkflow(value: OnboardingState): boolean {
  return Boolean(value && ['NOT_STARTED', 'IN_PROGRESS', 'READY', 'COMPLETED'].includes(value.status)
    && Array.isArray(value.steps) && value.steps.every((step) => step
      && typeof step.key === 'string' && step.key.trim() && Number.isFinite(step.position)
      && ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'SKIPPED'].includes(step.status)));
}

/** Uses the real shared cache, with fresh requests and no separate startup identity store. */
export async function loadStartupEntry(session: SessionController, dispatch: AppDispatch): Promise<StartupRoute> {
  const generation = session.getGeneration();
  const account = dispatch(onboardingApi.endpoints.getSelfAccount.initiate(undefined, { forceRefetch: true }));
  const onboarding = dispatch(onboardingApi.endpoints.getOnboarding.initiate(undefined, { forceRefetch: true }));
  try {
    const [identity, workflow] = await Promise.all([account.unwrap(), onboarding.unwrap()]);
    if (!session.isCurrent(generation)) throw new StaleSessionError();
    if (!validIdentity(identity) || !workflow || identity.persona !== workflow.persona) {
      // Missing ownership or disagreeing personas cannot safely select an authenticated page.
      await session.rejectRestoredIdentity();
      throw new StaleSessionError();
    }
    if (!validWorkflow(workflow)) throw new Error('Account setup is temporarily unavailable.');
    const entry = resolveAuthenticatedEntryRoute(workflow); // Missing resumable step is retryable.
    if (entry.screen === 'onboarding' && !configuredStepFor(entry.persona, entry.step)) {
      throw new Error('Account setup is temporarily unavailable.');
    }
    session.acceptRestoredIdentity(generation, {
      userId: identity.id, userType: identity.persona, email: identity.email, name: identity.displayName,
    });
    return entry.screen === 'home' ? authenticatedAppRoute(resolveAuthenticatedHomeRoute(identity))
      : { name: 'Onboarding', params: { persona: entry.persona, step: entry.step } };
  } finally {
    account.unsubscribe();
    onboarding.unsubscribe();
  }
}
