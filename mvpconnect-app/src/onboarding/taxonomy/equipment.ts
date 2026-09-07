import type { TaxonomyOption } from './types';

export const EQUIPMENT_OPTIONS = [
  { value: 'DRUM_KIT', label: 'Drum Kit' },
  { value: 'GUITAR_AMP', label: 'Guitar Amp' },
  { value: 'BASS_AMP', label: 'Bass Amp' },
  { value: 'KEYBOARD_PIANO', label: 'Keyboard / Piano' },
  { value: 'PERCUSSION', label: 'Percussion' },
  { value: 'DJ_EQUIPMENT', label: 'DJ Equipment' },
  { value: 'MICROPHONES', label: 'Microphones' },
  { value: 'DI_BOXES', label: 'DI Boxes' },
  { value: 'STAGE_MONITORS', label: 'Stage Monitors' },
  { value: 'IEM_SYSTEM', label: 'IEM System' },
  { value: 'INSTRUMENT_STANDS', label: 'Instrument Stands' },
] as const satisfies readonly TaxonomyOption[];

export type EquipmentCode = (typeof EQUIPMENT_OPTIONS)[number]['value'];
