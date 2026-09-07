import type { TaxonomyOption } from './types';

export const PRODUCTION_AMENITY_OPTIONS = [
  { value: 'GREEN_ROOM', label: 'Green Room' },
  { value: 'DRESSING_ROOM', label: 'Dressing Room' },
  { value: 'BACKSTAGE_AREA', label: 'Backstage Area' },
  { value: 'LOAD_IN_ACCESS', label: 'Load-In Access' },
  { value: 'MERCH_AREA', label: 'Merch Area' },
  { value: 'ARTIST_PARKING', label: 'Artist Parking' },
  { value: 'SECURE_GEAR_STORAGE', label: 'Secure Gear Storage' },
  { value: 'HOUSE_LIGHTING', label: 'House Lighting' },
] as const satisfies readonly TaxonomyOption[];

export type ProductionAmenityCode = (typeof PRODUCTION_AMENITY_OPTIONS)[number]['value'];
