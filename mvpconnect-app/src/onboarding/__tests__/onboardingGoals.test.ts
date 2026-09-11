import {
  ARTIST_GOAL_OPTIONS,
  GOAL_OPTIONS,
  hydrateGoalsData,
  normalizeGoalsForPayload,
  toggleGoal,
  validateGoalsData,
} from '../onboardingGoals';

describe('onboarding Goals contract', () => {
  it('keeps the exact persona-specific API codes and product order', () => {
    expect(GOAL_OPTIONS.artist.map((option) => option.value)).toEqual([
      'BOOK_SHOWS', 'FIND_PROMOTERS', 'FIND_COLLABORATORS', 'START_OR_JOIN_BAND',
    ]);
    expect(GOAL_OPTIONS.venue.map((option) => option.value)).toEqual([
      'FIND_ARTISTS', 'FIND_PROMOTERS', 'FILL_OPEN_DATES',
    ]);
    expect(GOAL_OPTIONS.promoter.map((option) => option.value)).toEqual([
      'FIND_ARTISTS', 'FIND_VENUES', 'BUILD_MY_ROSTER', 'BOOK_MY_ARTISTS',
    ]);
    expect(ARTIST_GOAL_OPTIONS[0]).toMatchObject({
      label: 'BOOK MORE SHOWS',
      description: 'Find venues and opportunities that fit your sound, draw, and live setup.',
    });
  });

  it('hydrates only allowed, duplicate-free values while preserving their order', () => {
    expect(hydrateGoalsData('artist', {
      connectionGoals: ['FIND_PROMOTERS', 'BOOK_SHOWS', 'FIND_PROMOTERS', 'NOT_REAL'],
    })).toEqual({ connectionGoals: ['FIND_PROMOTERS', 'BOOK_SHOWS'] });
  });

  it('requires at least one goal and allows every persona goal', () => {
    expect(validateGoalsData('venue', { connectionGoals: [] })).toEqual({
      valid: false,
      error: 'Choose at least one goal.',
    });
    const everyVenueGoal = { connectionGoals: ['FIND_ARTISTS', 'FIND_PROMOTERS', 'FILL_OPEN_DATES'] as const };
    expect(validateGoalsData('venue', everyVenueGoal as any).valid).toBe(true);
  });

  it('toggles independently and emits duplicate-free payloads', () => {
    const selected = toggleGoal({ connectionGoals: ['BOOK_SHOWS'] }, 'FIND_PROMOTERS');
    expect(selected.connectionGoals).toEqual(['BOOK_SHOWS', 'FIND_PROMOTERS']);
    expect(toggleGoal(selected, 'BOOK_SHOWS').connectionGoals).toEqual(['FIND_PROMOTERS']);
    expect(normalizeGoalsForPayload('artist', {
      connectionGoals: ['BOOK_SHOWS', 'BOOK_SHOWS'] as any,
    })).toEqual({ connectionGoals: ['BOOK_SHOWS'] });
  });
});
