import type { OnboardingPersona, OnboardingStepData } from './onboardingTypes';
import type {
  ArtistGoal,
  ArtistGoalsStepRequest,
  GoalCode,
  GoalsStepRequest,
  PromoterGoal,
  PromoterGoalsStepRequest,
  VenueGoal,
  VenueGoalsStepRequest,
} from './goalTypes';

export interface GoalOption<Code extends GoalCode = GoalCode> {
  value: Code;
  label: string;
  description: string;
  symbol: string;
}

export const ARTIST_GOAL_OPTIONS: readonly GoalOption<ArtistGoal>[] = [
  {
    value: 'BOOK_SHOWS',
    label: 'BOOK MORE SHOWS',
    description: 'Find venues and opportunities that fit your sound, draw, and live setup.',
    symbol: '▦',
  },
  {
    value: 'FIND_PROMOTERS',
    label: 'CONNECT WITH PROMOTERS',
    description: 'Meet promoters who work with artists and shows like yours.',
    symbol: '◉',
  },
  {
    value: 'FIND_COLLABORATORS',
    label: 'FIND COLLABORATORS',
    description: 'Connect with artists and musicians you might want to create or perform with.',
    symbol: '●',
  },
  {
    value: 'START_OR_JOIN_BAND',
    label: 'START OR JOIN A BAND',
    description: 'Find musicians looking to build something together.',
    symbol: '♫',
  },
];

export const VENUE_GOAL_OPTIONS: readonly GoalOption<VenueGoal>[] = [
  {
    value: 'FIND_ARTISTS',
    label: 'FIND ARTISTS',
    description: 'Discover artists who fit your room, audience, draw, and production setup.',
    symbol: '●',
  },
  {
    value: 'FIND_PROMOTERS',
    label: 'CONNECT WITH PROMOTERS',
    description: 'Build relationships with promoters who put together shows that make sense for your space.',
    symbol: '◢',
  },
  {
    value: 'FILL_OPEN_DATES',
    label: 'FILL OPEN DATES',
    description: 'Find artists and promoters who can help turn available dates into the right shows.',
    symbol: '▦',
  },
];

export const PROMOTER_GOAL_OPTIONS: readonly GoalOption<PromoterGoal>[] = [
  {
    value: 'FIND_ARTISTS',
    label: 'FIND ARTISTS',
    description: 'Discover artists who fit the kinds of shows, genres, and audiences you work with.',
    symbol: '●',
  },
  {
    value: 'FIND_VENUES',
    label: 'FIND VENUES',
    description: 'Connect with venues that make sense for your artists, events, and markets.',
    symbol: '◆',
  },
  {
    value: 'BUILD_MY_ROSTER',
    label: 'BUILD MY ROSTER',
    description: 'Find artists you may want to represent, develop, or work with more closely.',
    symbol: '▥',
  },
  {
    value: 'BOOK_MY_ARTISTS',
    label: 'BOOK MY ARTISTS',
    description: 'Find the right venues and opportunities for artists already on your roster.',
    symbol: '▦',
  },
];

export const GOAL_OPTIONS: Record<OnboardingPersona, readonly GoalOption[]> = {
  artist: ARTIST_GOAL_OPTIONS,
  venue: VENUE_GOAL_OPTIONS,
  promoter: PROMOTER_GOAL_OPTIONS,
};

export const GOALS_SUPPORT_COPY: Record<OnboardingPersona, string> = {
  artist: "Tell us what you're looking for. We'll use your goals to make MVPConnect more useful to you.",
  venue: "Tell us what you're looking for. We'll use your goals to make MVPConnect more useful to your venue.",
  promoter: "Tell us what you're looking for. We'll use your goals to make MVPConnect more useful to you.",
};

const allowedCodes = (persona: OnboardingPersona) =>
  new Set<string>(GOAL_OPTIONS[persona].map((option) => option.value));

const normalizedCodes = (persona: OnboardingPersona, values: unknown): GoalCode[] => {
  if (!Array.isArray(values)) return [];
  const allowed = allowedCodes(persona);
  const seen = new Set<string>();
  return values.flatMap((value) => {
    if (typeof value !== 'string' || !allowed.has(value) || seen.has(value)) return [];
    seen.add(value);
    return [value as GoalCode];
  });
};

export function hydrateGoalsData(persona: 'artist', data: OnboardingStepData): ArtistGoalsStepRequest;
export function hydrateGoalsData(persona: 'venue', data: OnboardingStepData): VenueGoalsStepRequest;
export function hydrateGoalsData(persona: 'promoter', data: OnboardingStepData): PromoterGoalsStepRequest;
export function hydrateGoalsData(persona: OnboardingPersona, data: OnboardingStepData): GoalsStepRequest;
export function hydrateGoalsData(persona: OnboardingPersona, data: OnboardingStepData): GoalsStepRequest {
  return { connectionGoals: normalizedCodes(persona, data.connectionGoals) } as GoalsStepRequest;
}

export const normalizeGoalsForPayload = (
  persona: OnboardingPersona,
  data: GoalsStepRequest,
): GoalsStepRequest => ({
  connectionGoals: normalizedCodes(persona, data.connectionGoals),
}) as GoalsStepRequest;

export const validateGoalsData = (
  persona: OnboardingPersona,
  data: GoalsStepRequest,
): { valid: boolean; error?: string } => {
  const normalized = normalizedCodes(persona, data.connectionGoals);
  if (normalized.length === 0) {
    return { valid: false, error: 'Choose at least one goal.' };
  }
  if (normalized.length !== data.connectionGoals.length) {
    return { valid: false, error: 'Choose each available goal only once.' };
  }
  return { valid: true };
};

export const toggleGoal = (
  data: GoalsStepRequest,
  goal: GoalCode,
): GoalsStepRequest => {
  const selected: readonly GoalCode[] = data.connectionGoals;
  return {
    connectionGoals: selected.includes(goal)
      ? selected.filter((value) => value !== goal)
      : [...selected, goal],
  } as GoalsStepRequest;
};

export const isRealGoalsStep = (_persona: OnboardingPersona, stepKey: string): boolean =>
  stepKey === 'goals';
