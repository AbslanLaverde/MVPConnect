import type { TaxonomyOption } from './types';

export const GENRE_OPTIONS = [
  { value: 'ALTERNATIVE', label: 'Alternative' },
  { value: 'BLUES', label: 'Blues' },
  { value: 'CLASSICAL', label: 'Classical' },
  { value: 'COUNTRY', label: 'Country' },
  { value: 'ELECTRONIC', label: 'Electronic' },
  { value: 'EXPERIMENTAL', label: 'Experimental' },
  { value: 'FOLK', label: 'Folk' },
  { value: 'FUNK', label: 'Funk' },
  { value: 'GOSPEL', label: 'Gospel' },
  { value: 'HARDCORE', label: 'Hardcore' },
  { value: 'HIP_HOP', label: 'Hip-Hop' },
  { value: 'INDIE', label: 'Indie' },
  { value: 'JAZZ', label: 'Jazz' },
  { value: 'LATIN', label: 'Latin' },
  { value: 'METAL', label: 'Metal' },
  { value: 'POP', label: 'Pop' },
  { value: 'PUNK', label: 'Punk' },
  { value: 'R_AND_B', label: 'R&B' },
  { value: 'REGGAE', label: 'Reggae' },
  { value: 'ROCK', label: 'Rock' },
  { value: 'SINGER_SONGWRITER', label: 'Singer-Songwriter' },
  { value: 'SOUL', label: 'Soul' },
] as const satisfies readonly TaxonomyOption[];

export type GenreCode = (typeof GENRE_OPTIONS)[number]['value'];
