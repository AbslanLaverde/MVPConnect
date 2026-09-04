import { configuredStepFor, ONBOARDING_CONFIG } from '../onboardingConfig';

describe('onboarding presentation config', () => {
  it.each([
    ['artist', 5],
    ['venue', 6],
    ['promoter', 5],
  ] as const)('provides presentation metadata for the %s steps', (persona, expectedCount) => {
    expect(Object.keys(ONBOARDING_CONFIG[persona].stepPresentation)).toHaveLength(expectedCount);
  });

  it('provides presentation metadata for the Venue stage step', () => {
    expect(configuredStepFor('venue', 'stage')).toEqual({
      label: 'THE STAGE',
      placeholderTitle: 'Venue Stage Placeholder',
    });
  });
});
