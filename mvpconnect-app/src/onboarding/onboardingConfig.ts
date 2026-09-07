import { theme } from '../theme/theme';
import type { BackendPersona, OnboardingPersona } from './onboardingTypes';

export interface OnboardingStepPresentation {
  label: string;
  placeholderTitle: string;
}

export interface OnboardingPersonaConfig {
  persona: OnboardingPersona;
  backendPersona: BackendPersona;
  label: string;
  accentStart: string;
  accentEnd?: string;
  entryStep: string;
  stepPresentation: Readonly<Record<string, OnboardingStepPresentation>>;
}

// TODO(onboarding): Disable this bypass when the real onboarding step requests are
// implemented. Production onboarding must once again require a backend-confirmed
// save/completion before advancing to the next step.
export const ONBOARDING_PLACEHOLDER_SAVE_BYPASS = true;

export const ONBOARDING_CONFIG: Record<OnboardingPersona, OnboardingPersonaConfig> = {
  artist: {
    persona: 'artist',
    backendPersona: 'MUSICIAN',
    label: 'ARTIST',
    accentStart: theme.personas.artist.accentStart,
    accentEnd: theme.personas.artist.accentEnd,
    entryStep: 'basics',
    stepPresentation: {
      basics: { label: 'THE BASICS', placeholderTitle: 'Artist Basics Placeholder' },
      sound: { label: 'YOUR SOUND', placeholderTitle: 'Artist Sound Placeholder' },
      live: { label: 'PLAYING LIVE', placeholderTitle: 'Artist Live Placeholder' },
      media: { label: 'MEDIA', placeholderTitle: 'Artist Media Placeholder' },
      goals: { label: 'YOUR GOALS', placeholderTitle: 'Artist Goals Placeholder' },
    },
  },
  venue: {
    persona: 'venue',
    backendPersona: 'VENUE',
    label: 'VENUE',
    accentStart: theme.personas.venue.accent,
    entryStep: 'room',
    stepPresentation: {
      room: { label: 'THE ROOM', placeholderTitle: 'Venue Room Placeholder' },
      music: { label: 'YOUR MUSIC', placeholderTitle: 'Venue Music Placeholder' },
      stage: { label: 'THE STAGE', placeholderTitle: 'Venue Stage Placeholder' },
      booking: { label: 'BOOKING', placeholderTitle: 'Venue Booking Placeholder' },
      media: { label: 'MEDIA', placeholderTitle: 'Venue Media Placeholder' },
      goals: { label: 'YOUR GOALS', placeholderTitle: 'Venue Goals Placeholder' },
    },
  },
  promoter: {
    persona: 'promoter',
    backendPersona: 'PROMOTER',
    label: 'PROMOTER',
    accentStart: theme.personas.promoter.accent,
    entryStep: 'business',
    stepPresentation: {
      business: { label: 'THE BUSINESS', placeholderTitle: 'Promoter Business Placeholder' },
      specialties: { label: 'YOUR LANE', placeholderTitle: 'Promoter Lane Placeholder' },
      network: { label: 'YOUR NETWORK', placeholderTitle: 'Promoter Network Placeholder' },
      media: { label: 'MEDIA', placeholderTitle: 'Promoter Media Placeholder' },
      goals: { label: 'YOUR GOALS', placeholderTitle: 'Promoter Goals Placeholder' },
    },
  },
};

const ROUTE_PERSONA_BY_BACKEND: Record<BackendPersona, OnboardingPersona> = {
  MUSICIAN: 'artist',
  VENUE: 'venue',
  PROMOTER: 'promoter',
};

export const isOnboardingPersona = (value: string): value is OnboardingPersona =>
  value === 'artist' || value === 'venue' || value === 'promoter';

export const routePersonaForBackend = (persona: BackendPersona): OnboardingPersona =>
  ROUTE_PERSONA_BY_BACKEND[persona];

export const entryStepForPersona = (persona: OnboardingPersona): string =>
  ONBOARDING_CONFIG[persona].entryStep;

export const configuredStepFor = (persona: OnboardingPersona, stepKey: string) =>
  ONBOARDING_CONFIG[persona].stepPresentation[stepKey];
