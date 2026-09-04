import type { SelectionOption } from './SelectChips';

// Central first-pass taxonomy. Values are stable storage keys; labels are presentation.
// Custom genres and an "Other" value are intentionally not supported yet.
export const APPROVED_GENRE_TAXONOMY: readonly SelectionOption[] = [
  { value: 'alternative', label: 'Alternative' },
  { value: 'blues', label: 'Blues' },
  { value: 'country', label: 'Country' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'folk', label: 'Folk' },
  { value: 'funk', label: 'Funk' },
  { value: 'hip-hop', label: 'Hip-Hop' },
  { value: 'indie-rock', label: 'Indie Rock' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'latin', label: 'Latin' },
  { value: 'metal', label: 'Metal' },
  { value: 'pop', label: 'Pop' },
  { value: 'punk', label: 'Punk' },
  { value: 'r-and-b', label: 'R&B' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'rock', label: 'Rock' },
  { value: 'singer-songwriter', label: 'Singer-Songwriter' },
  { value: 'soul', label: 'Soul' },
] as const;
