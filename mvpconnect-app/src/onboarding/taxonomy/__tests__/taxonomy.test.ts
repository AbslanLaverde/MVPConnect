import { EVENT_TYPE_OPTIONS } from '../eventTypes';
import { GENRE_OPTIONS } from '../genres';
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
});
