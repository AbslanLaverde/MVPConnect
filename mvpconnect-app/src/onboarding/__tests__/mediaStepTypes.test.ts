import { MEDIA_GALLERY_LIMITS, MEDIA_GALLERY_TIPS } from '../mediaStepTypes';

describe('Media step foundation constants', () => {
  it('uses the approved persona gallery limits', () => {
    expect(MEDIA_GALLERY_LIMITS).toEqual({ artist: 8, venue: 10, promoter: 10 });
  });

  it('keeps the approved six practical curation tips per persona', () => {
    expect(MEDIA_GALLERY_TIPS.artist.items).toHaveLength(6);
    expect(MEDIA_GALLERY_TIPS.venue.items).toHaveLength(6);
    expect(MEDIA_GALLERY_TIPS.promoter.items).toHaveLength(6);
    expect(MEDIA_GALLERY_TIPS.artist.items[0]).toBe('Mix live shots with portraits or band photos');
    expect(MEDIA_GALLERY_TIPS.venue.items[0]).toBe('Show the stage both empty and during a real show');
    expect(MEDIA_GALLERY_TIPS.promoter.items[0]).toBe('Show real events with real crowds and energy');
  });
});
