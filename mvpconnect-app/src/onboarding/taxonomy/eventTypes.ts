import type { TaxonomyOption } from './types';

export const EVENT_TYPE_OPTIONS = [
  { value: 'CLUB_NIGHT', label: 'Club Night' },
  { value: 'COMMUNITY_EVENT', label: 'Community Event' },
  { value: 'CONCERT', label: 'Concert' },
  { value: 'DJ_NIGHT', label: 'DJ Night' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'HOUSE_SHOW', label: 'House Show' },
  { value: 'OPEN_MIC', label: 'Open Mic' },
  { value: 'PRIVATE_EVENT', label: 'Private Event' },
  { value: 'RESIDENCY', label: 'Residency' },
  { value: 'SHOWCASE', label: 'Showcase' },
] as const satisfies readonly TaxonomyOption[];

export type EventTypeCode = (typeof EVENT_TYPE_OPTIONS)[number]['value'];
