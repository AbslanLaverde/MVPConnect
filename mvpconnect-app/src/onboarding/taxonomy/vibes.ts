import type { TaxonomyOption } from './types';

export const VIBE_OPTIONS = [
  { value: 'ATMOSPHERIC', label: 'Atmospheric' },
  { value: 'DARK', label: 'Dark' },
  { value: 'DREAMY', label: 'Dreamy' },
  { value: 'ENERGETIC', label: 'Energetic' },
  { value: 'EXPERIMENTAL', label: 'Experimental' },
  { value: 'GRITTY', label: 'Gritty' },
  { value: 'GROOVY', label: 'Groovy' },
  { value: 'HEAVY', label: 'Heavy' },
  { value: 'INTIMATE', label: 'Intimate' },
  { value: 'MELLOW', label: 'Mellow' },
  { value: 'RAW', label: 'Raw' },
  { value: 'RELAXED', label: 'Relaxed' },
  { value: 'THEATRICAL', label: 'Theatrical' },
  { value: 'UPBEAT', label: 'Upbeat' },
] as const satisfies readonly TaxonomyOption[];

export type VibeCode = (typeof VIBE_OPTIONS)[number]['value'];
