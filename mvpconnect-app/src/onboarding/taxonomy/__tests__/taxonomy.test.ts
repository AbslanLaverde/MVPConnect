import { EVENT_TYPE_OPTIONS } from '../eventTypes';
import { EQUIPMENT_OPTIONS } from '../equipment';
import { GENRE_OPTIONS } from '../genres';
import {
  PA_AVAILABILITY_OPTIONS,
  SOUNDCHECK_AVAILABILITY_OPTIONS,
  SOUND_ENGINEER_AVAILABILITY_OPTIONS,
} from '../soundSupport';
import { VIBE_OPTIONS } from '../vibes';

const values = (options: readonly { value: string }[]) =>
  options.map((option) => option.value);

describe('canonical Step 2 taxonomy', () => {
  it('contains exactly the approved GenreCode values in order', () => {
    expect(values(GENRE_OPTIONS)).toEqual([
      'ALTERNATIVE',
      'BLUES',
      'CLASSICAL',
      'COUNTRY',
      'ELECTRONIC',
      'EXPERIMENTAL',
      'FOLK',
      'FUNK',
      'GOSPEL',
      'HARDCORE',
      'HIP_HOP',
      'INDIE',
      'JAZZ',
      'LATIN',
      'METAL',
      'POP',
      'PUNK',
      'R_AND_B',
      'REGGAE',
      'ROCK',
      'SINGER_SONGWRITER',
      'SOUL',
    ]);
    expect(values(GENRE_OPTIONS)).not.toContain('indie-rock');
    expect(GENRE_OPTIONS.every((option) => option.value === option.value.toUpperCase())).toBe(true);
  });

  it('contains exactly the approved VibeCode values in order', () => {
    expect(values(VIBE_OPTIONS)).toEqual([
      'ATMOSPHERIC',
      'DARK',
      'DREAMY',
      'ENERGETIC',
      'EXPERIMENTAL',
      'GRITTY',
      'GROOVY',
      'HEAVY',
      'INTIMATE',
      'MELLOW',
      'RAW',
      'RELAXED',
      'THEATRICAL',
      'UPBEAT',
    ]);
  });

  it('contains exactly the approved EventTypeCode values in order', () => {
    expect(values(EVENT_TYPE_OPTIONS)).toEqual([
      'CLUB_NIGHT',
      'COMMUNITY_EVENT',
      'CONCERT',
      'DJ_NIGHT',
      'FESTIVAL',
      'HOUSE_SHOW',
      'OPEN_MIC',
      'PRIVATE_EVENT',
      'RESIDENCY',
      'SHOWCASE',
    ]);
  });

  it('contains exactly the shared EquipmentCode values and labels in order', () => {
    expect(EQUIPMENT_OPTIONS).toEqual([
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
    ]);
  });

  it('contains exactly the approved sound-support API codes and labels', () => {
    expect(SOUND_ENGINEER_AVAILABILITY_OPTIONS).toEqual([
      { value: 'IN_HOUSE', label: 'In House' },
      { value: 'AVAILABLE_BY_ARRANGEMENT', label: 'Available By Arrangement' },
      { value: 'NOT_AVAILABLE', label: 'Not Available' },
    ]);
    expect(PA_AVAILABILITY_OPTIONS).toEqual([
      { value: 'FULL_HOUSE_PA', label: 'Full House PA' },
      { value: 'LIMITED_PA', label: 'Limited PA' },
      { value: 'NO_PA', label: 'No PA' },
    ]);
    expect(SOUNDCHECK_AVAILABILITY_OPTIONS).toEqual([
      { value: 'FULL_SOUNDCHECK', label: 'Full Soundcheck' },
      { value: 'LINE_CHECK_ONLY', label: 'Line Check Only' },
      { value: 'BY_ARRANGEMENT', label: 'By Arrangement' },
      { value: 'NOT_AVAILABLE', label: 'Not Available' },
    ]);
  });
});
