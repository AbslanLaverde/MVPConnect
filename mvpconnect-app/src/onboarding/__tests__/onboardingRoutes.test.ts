import {
  nextStepFromState,
  previousStepFromState,
  resolveAuthenticatedEntryRoute,
  resolveOnboardingRoute,
} from '../onboardingRoutes';
import { BackendPersona, OnboardingState } from '../onboardingTypes';

const BACKEND_STEPS: Record<BackendPersona, readonly { key: string; required: boolean }[]> = {
  MUSICIAN: [
    { key: 'basics', required: true },
    { key: 'sound', required: true },
    { key: 'live', required: true },
    { key: 'media', required: false },
    { key: 'goals', required: true },
  ],
  VENUE: [
    { key: 'room', required: true },
    { key: 'music', required: true },
    { key: 'stage', required: true },
    { key: 'booking', required: true },
    { key: 'media', required: false },
    { key: 'goals', required: true },
  ],
  PROMOTER: [
    { key: 'business', required: true },
    { key: 'specialties', required: true },
    { key: 'network', required: true },
    { key: 'media', required: false },
    { key: 'goals', required: true },
  ],
};

const stateFor = (
  persona: BackendPersona,
  currentStep: string,
  completedKeys: string[] = [],
): OnboardingState => {
  return {
    persona,
    status: 'IN_PROGRESS',
    currentStep,
    onboardingVersion: 2,
    steps: BACKEND_STEPS[persona].map((step, index) => ({
      key: step.key,
      position: index + 1,
      required: step.required,
      status: completedKeys.includes(step.key) ? 'COMPLETE' : 'NOT_STARTED',
      data: {},
    })),
  };
};

describe('resolveOnboardingRoute', () => {
  it.each([
    ['MUSICIAN', 'artist', 'basics'],
    ['VENUE', 'venue', 'room'],
    ['PROMOTER', 'promoter', 'business'],
  ] as const)('resolves the %s route', (backendPersona, routePersona, step) => {
    const state = stateFor(backendPersona, step);

    expect(resolveOnboardingRoute(state, routePersona, step)).toEqual({
      persona: routePersona,
      step,
      shouldRedirect: false,
    });
  });

  it('redirects a direct future-step URL to the backend current step', () => {
    const state = stateFor('MUSICIAN', 'sound', ['basics']);

    expect(resolveOnboardingRoute(state, 'artist', 'media')).toEqual({
      persona: 'artist',
      step: 'sound',
      shouldRedirect: true,
    });
  });

  it('allows configured future steps while placeholder save bypass is enabled', () => {
    const state = stateFor('MUSICIAN', 'basics');

    expect(resolveOnboardingRoute(state, 'artist', 'sound', true)).toEqual({
      persona: 'artist',
      step: 'sound',
      shouldRedirect: false,
    });
  });

  it('allows a previously completed step', () => {
    const state = stateFor('MUSICIAN', 'sound', ['basics']);

    expect(resolveOnboardingRoute(state, 'artist', 'basics').shouldRedirect).toBe(false);
  });

  it('allows a previously skipped optional step', () => {
    const state = stateFor('MUSICIAN', 'goals', ['basics', 'sound', 'live']);
    state.steps[3] = { ...state.steps[3], status: 'SKIPPED' };

    expect(resolveOnboardingRoute(state, 'artist', 'media').shouldRedirect).toBe(false);
  });

  it('redirects a persona mismatch to the authenticated persona and current step', () => {
    const state = stateFor('VENUE', 'booking', ['room', 'music', 'stage']);

    expect(resolveOnboardingRoute(state, 'artist', 'sound')).toEqual({
      persona: 'venue',
      step: 'booking',
      shouldRedirect: true,
    });
  });

  it('allows revisiting any configured step when backend status is READY', () => {
    const state = stateFor('PROMOTER', 'goals');
    state.status = 'READY';

    expect(resolveOnboardingRoute(state, 'promoter', 'business').shouldRedirect).toBe(false);
  });

  it('accepts the backend-provided Venue stage route at position 3', () => {
    const state = stateFor('VENUE', 'stage', ['room', 'music']);

    expect(resolveOnboardingRoute(state, 'venue', 'stage')).toEqual({
      persona: 'venue',
      step: 'stage',
      shouldRedirect: false,
    });
    expect(nextStepFromState(state, 'music')).toBe('stage');
    expect(nextStepFromState(state, 'stage')).toBe('booking');
    expect(previousStepFromState(state, 'stage')).toBe('music');
  });

  it.each([
    ['MUSICIAN', 5],
    ['VENUE', 6],
    ['PROMOTER', 5],
  ] as const)('uses the backend %s step count and order', (persona, expectedCount) => {
    const state = stateFor(persona, BACKEND_STEPS[persona][0].key);

    expect(state.steps).toHaveLength(expectedCount);
    expect(state.steps.map((step) => step.position)).toEqual(
      Array.from({ length: expectedCount }, (_, index) => index + 1),
    );
  });
});

describe('resolveAuthenticatedEntryRoute', () => {
  it.each([
    ['MUSICIAN', 'artist', 'sound', ['basics']],
    ['VENUE', 'venue', 'stage', ['room', 'music']],
    ['PROMOTER', 'promoter', 'network', ['business', 'specialties']],
  ] as const)(
    'resumes incomplete %s onboarding at the backend current step',
    (backendPersona, routePersona, currentStep, completedKeys) => {
      const state = stateFor(backendPersona, currentStep, [...completedKeys]);

      expect(resolveAuthenticatedEntryRoute(state)).toEqual({
        screen: 'onboarding',
        persona: routePersona,
        step: currentStep,
      });
    },
  );

  it('keeps a READY account in onboarding until completion is recorded', () => {
    const state = stateFor('MUSICIAN', 'goals', ['basics', 'sound', 'live', 'media']);
    state.status = 'READY';

    expect(resolveAuthenticatedEntryRoute(state)).toEqual({
      screen: 'onboarding',
      persona: 'artist',
      step: 'goals',
    });
  });

  it('routes home only when onboarding is completed', () => {
    const state = stateFor('VENUE', 'room');
    state.status = 'COMPLETED';
    state.currentStep = null;
    state.steps = [];

    expect(resolveAuthenticatedEntryRoute(state)).toEqual({ screen: 'home' });
  });

  it('rejects an incomplete state with no resumable steps', () => {
    const state = stateFor('PROMOTER', 'business');
    state.currentStep = null;
    state.steps = [];

    expect(() => resolveAuthenticatedEntryRoute(state)).toThrow(
      'Incomplete onboarding state does not contain a resumable step.',
    );
  });
});
