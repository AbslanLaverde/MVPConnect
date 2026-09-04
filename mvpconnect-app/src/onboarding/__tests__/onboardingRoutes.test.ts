import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { resolveOnboardingRoute } from '../onboardingRoutes';
import { BackendPersona, OnboardingState } from '../onboardingTypes';

const stateFor = (
  persona: BackendPersona,
  currentStep: string,
  completedKeys: string[] = [],
): OnboardingState => {
  const routePersona = persona === 'MUSICIAN' ? 'artist' : persona.toLowerCase() as 'venue' | 'promoter';
  return {
    persona,
    status: 'IN_PROGRESS',
    currentStep,
    onboardingVersion: 1,
    steps: ONBOARDING_CONFIG[routePersona].steps.map((step, index) => ({
      key: step.key,
      position: index + 1,
      required: true,
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

  it('allows a previously completed step', () => {
    const state = stateFor('MUSICIAN', 'sound', ['basics']);

    expect(resolveOnboardingRoute(state, 'artist', 'basics').shouldRedirect).toBe(false);
  });

  it('allows a previously skipped optional step', () => {
    const state = stateFor('MUSICIAN', 'live', ['basics']);
    state.steps[1] = { ...state.steps[1], required: false, status: 'SKIPPED' };

    expect(resolveOnboardingRoute(state, 'artist', 'sound').shouldRedirect).toBe(false);
  });

  it('redirects a persona mismatch to the authenticated persona and current step', () => {
    const state = stateFor('VENUE', 'booking', ['room', 'music']);

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
});
