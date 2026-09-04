import { theme } from '../theme/theme';
import type { BackendPersona, OnboardingPersona } from './onboardingTypes';

export interface OnboardingStepConfig {
  key: string;
  label: string;
  placeholderTitle: string;
}

export interface OnboardingPersonaConfig {
  persona: OnboardingPersona;
  backendPersona: BackendPersona;
  label: string;
  accentStart: string;
  accentEnd?: string;
  steps: readonly OnboardingStepConfig[];
}

export const ONBOARDING_CONFIG: Record<OnboardingPersona, OnboardingPersonaConfig> = {
  artist: {
    persona: 'artist',
    backendPersona: 'MUSICIAN',
    label: 'ARTIST',
    accentStart: theme.colors.brandBlue,
    steps: [
      { key: 'basics', label: 'THE BASICS', placeholderTitle: 'Artist Basics Placeholder' },
      { key: 'sound', label: 'YOUR SOUND', placeholderTitle: 'Artist Sound Placeholder' },
      { key: 'live', label: 'PLAYING LIVE', placeholderTitle: 'Artist Live Placeholder' },
      { key: 'media', label: 'MEDIA', placeholderTitle: 'Artist Media Placeholder' },
      { key: 'goals', label: 'YOUR GOALS', placeholderTitle: 'Artist Goals Placeholder' },
    ],
  },
  venue: {
    persona: 'venue',
    backendPersona: 'VENUE',
    label: 'VENUE',
    accentStart: theme.colors.brandViolet,
    steps: [
      { key: 'room', label: 'THE ROOM', placeholderTitle: 'Venue Room Placeholder' },
      { key: 'music', label: 'THE MUSIC', placeholderTitle: 'Venue Music Placeholder' },
      { key: 'booking', label: 'BOOKING', placeholderTitle: 'Venue Booking Placeholder' },
      { key: 'media', label: 'MEDIA', placeholderTitle: 'Venue Media Placeholder' },
      { key: 'goals', label: 'YOUR GOALS', placeholderTitle: 'Venue Goals Placeholder' },
    ],
  },
  promoter: {
    persona: 'promoter',
    backendPersona: 'PROMOTER',
    label: 'PROMOTER',
    accentStart: theme.colors.brandBlue,
    accentEnd: theme.colors.brandViolet,
    steps: [
      { key: 'business', label: 'THE BUSINESS', placeholderTitle: 'Promoter Business Placeholder' },
      { key: 'specialties', label: 'SPECIALTIES', placeholderTitle: 'Promoter Specialties Placeholder' },
      { key: 'network', label: 'YOUR NETWORK', placeholderTitle: 'Promoter Network Placeholder' },
      { key: 'media', label: 'MEDIA', placeholderTitle: 'Promoter Media Placeholder' },
      { key: 'goals', label: 'YOUR GOALS', placeholderTitle: 'Promoter Goals Placeholder' },
    ],
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

export const firstStepForPersona = (persona: OnboardingPersona): string =>
  ONBOARDING_CONFIG[persona].steps[0].key;

export const configuredStepFor = (persona: OnboardingPersona, stepKey: string) =>
  ONBOARDING_CONFIG[persona].steps.find((step) => step.key === stepKey);
