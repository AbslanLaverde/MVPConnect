import type { TaxonomyOption } from './types';

export const SOUND_ENGINEER_AVAILABILITY_OPTIONS = [
  { value: 'IN_HOUSE', label: 'In House' },
  { value: 'AVAILABLE_BY_ARRANGEMENT', label: 'Available By Arrangement' },
  { value: 'NOT_AVAILABLE', label: 'Not Available' },
] as const satisfies readonly TaxonomyOption[];

export type SoundEngineerAvailability =
  (typeof SOUND_ENGINEER_AVAILABILITY_OPTIONS)[number]['value'];

export const PA_AVAILABILITY_OPTIONS = [
  { value: 'FULL_HOUSE_PA', label: 'Full House PA' },
  { value: 'LIMITED_PA', label: 'Limited PA' },
  { value: 'NO_PA', label: 'No PA' },
] as const satisfies readonly TaxonomyOption[];

export type PaAvailability = (typeof PA_AVAILABILITY_OPTIONS)[number]['value'];

export const SOUNDCHECK_AVAILABILITY_OPTIONS = [
  { value: 'FULL_SOUNDCHECK', label: 'Full Soundcheck' },
  { value: 'LINE_CHECK_ONLY', label: 'Line Check Only' },
  { value: 'BY_ARRANGEMENT', label: 'By Arrangement' },
  { value: 'NOT_AVAILABLE', label: 'Not Available' },
] as const satisfies readonly TaxonomyOption[];

export type SoundcheckAvailability =
  (typeof SOUNDCHECK_AVAILABILITY_OPTIONS)[number]['value'];
