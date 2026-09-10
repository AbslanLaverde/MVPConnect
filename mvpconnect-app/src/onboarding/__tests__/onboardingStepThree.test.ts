import {
  ARTIST_TRAVEL_OPTIONS,
  emptyArtistLiveData,
  emptyVenueStageData,
  hydrateArtistLiveData,
  hydrateVenueStageData,
  isRealStepThree,
  MAX_VENUES_PLAYED,
  normalizeArtistLiveDataForPayload,
  normalizeVenueStageDataForPayload,
  travelContractFromSelection,
  travelSelectionFromContract,
  validateArtistLiveData,
  validateVenueStageData,
} from '../onboardingStepThree';
import type { VenueEntityReferenceDto } from '../stepTwoTypes';
import { EQUIPMENT_OPTIONS, PRODUCTION_AMENITY_OPTIONS } from '../taxonomy';

const venueReference = (index: number): VenueEntityReferenceDto => ({
  entityType: 'VENUE',
  entityId: `venue-${index}`,
  displayName: `Venue ${index}`,
  external: true,
});

describe('onboardingStepThree', () => {
  it('recognizes only the real Artist and Venue Step 3 routes', () => {
    expect(isRealStepThree('artist', 'live')).toBe(true);
    expect(isRealStepThree('venue', 'stage')).toBe(true);
    expect(isRealStepThree('promoter', 'network')).toBe(false);
    expect(isRealStepThree('artist', 'media')).toBe(false);
  });

  it.each(ARTIST_TRAVEL_OPTIONS)(
    'maps $label to the backend contract and hydrates it back',
    (option) => {
      expect(travelContractFromSelection(option.value)).toEqual({
        touring: option.touring,
        travelRadiusMiles: option.radiusMiles,
      });
      expect(travelSelectionFromContract(option.touring, option.radiusMiles)).toBe(option.value);
    },
  );

  it('normalizes the exact Artist live DTO without exposing performance media controls', () => {
    const payload = normalizeArtistLiveDataForPayload({
      bookingStatus: 'ACTIVELY_BOOKING',
      typicalDraw: 'FROM_101_TO_250',
      travelSelection: 'UP_TO_50',
      setLengthMinutes: 45,
      equipmentBrought: [
        { code: 'GUITAR_AMP', quantity: 2 },
        { code: 'DRUM_KIT', quantity: null },
      ],
      venuesPlayed: [venueReference(1)],
    });

    expect(payload).toEqual({
      bookingStatus: 'ACTIVELY_BOOKING',
      typicalDraw: 'FROM_101_TO_250',
      touring: false,
      travelRadiusMiles: 50,
      setLengthMinutes: 45,
      equipmentBrought: [
        { code: 'GUITAR_AMP', quantity: 2 },
        { code: 'DRUM_KIT', quantity: null },
      ],
      venuesPlayed: [venueReference(1)],
    });
  });

  it('hydrates the Artist travel abstraction, equipment quantities, and stable venue IDs', () => {
    expect(hydrateArtistLiveData({
      bookingStatus: 'OPEN_TO_OFFERS',
      typicalDraw: 'UNDER_50',
      touring: true,
      travelRadiusMiles: null,
      setLengthMinutes: 90,
      equipmentBrought: [{ code: 'MICROPHONES', quantity: 4 }],
      venuesPlayed: [venueReference(2)],
      performanceImages: [],
    })).toEqual({
      bookingStatus: 'OPEN_TO_OFFERS',
      typicalDraw: 'UNDER_50',
      travelSelection: 'TOURING_ANYWHERE',
      setLengthMinutes: 90,
      equipmentBrought: [{ code: 'MICROPHONES', quantity: 4 }],
      venuesPlayed: [venueReference(2)],
      performanceImages: [],
    });
  });

  it('requires Artist booking, draw, and travel while allowing every equipment type', () => {
    expect(validateArtistLiveData(emptyArtistLiveData()).errors).toMatchObject({
      bookingStatus: expect.any(String),
      typicalDraw: expect.any(String),
      travelSelection: expect.any(String),
    });

    const equipmentBrought = EQUIPMENT_OPTIONS.map(({ value }, index) => ({
      code: value,
      quantity: index % 2 === 0 ? index + 1 : null,
    }));
    expect(validateArtistLiveData({
      ...emptyArtistLiveData(),
      bookingStatus: 'OPEN_TO_OFFERS',
      typicalDraw: 'FROM_50_TO_100',
      travelSelection: 'UP_TO_250',
      equipmentBrought,
    }).valid).toBe(true);
  });

  it('enforces the five-venue limit and resolved stable VenueIdentity references', () => {
    const base = {
      ...emptyArtistLiveData(),
      bookingStatus: 'OPEN_TO_OFFERS' as const,
      typicalDraw: 'FROM_50_TO_100' as const,
      travelSelection: 'UP_TO_250' as const,
    };
    expect(validateArtistLiveData({
      ...base,
      venuesPlayed: Array.from({ length: MAX_VENUES_PLAYED }, (_, index) => venueReference(index)),
    }).valid).toBe(true);
    expect(validateArtistLiveData({
      ...base,
      venuesPlayed: Array.from({ length: MAX_VENUES_PLAYED + 1 }, (_, index) => venueReference(index)),
    }).errors.venuesPlayed).toContain('no more than 5');
    expect(validateArtistLiveData({
      ...base,
      venuesPlayed: [{ ...venueReference(1), entityId: null }],
    }).errors.venuesPlayed).toContain('resolved MVPConnect venue ID');
  });

  it('requires all three Venue sound-support choices and positive populated dimensions', () => {
    expect(validateVenueStageData(emptyVenueStageData()).errors).toMatchObject({
      soundEngineerAvailability: expect.any(String),
      soundcheckAvailability: expect.any(String),
      paAvailability: expect.any(String),
    });

    const valid = {
      ...emptyVenueStageData(),
      soundEngineerAvailability: 'IN_HOUSE' as const,
      soundcheckAvailability: 'FULL_SOUNDCHECK' as const,
      paAvailability: 'FULL_HOUSE_PA' as const,
    };
    expect(validateVenueStageData(valid).valid).toBe(true);
    expect(validateVenueStageData({ ...valid, stageWidthFeet: 0 }).errors.stageWidthFeet)
      .toContain('greater than 0');
    expect(validateVenueStageData({ ...valid, stageDepthFeet: -2 }).errors.stageDepthFeet)
      .toContain('greater than 0');
  });

  it('normalizes and hydrates the exact Venue stage DTO with all canonical amenities', () => {
    const data = {
      stageWidthFeet: 24,
      stageDepthFeet: 16,
      soundEngineerAvailability: 'AVAILABLE_BY_ARRANGEMENT' as const,
      soundcheckAvailability: 'BY_ARRANGEMENT' as const,
      paAvailability: 'LIMITED_PA' as const,
      equipmentAvailable: EQUIPMENT_OPTIONS.map(({ value }) => ({ code: value, quantity: null })),
      productionAmenities: PRODUCTION_AMENITY_OPTIONS.map(({ value }) => value),
    };
    const payload = normalizeVenueStageDataForPayload(data);
    expect(payload).toEqual(data);
    expect(hydrateVenueStageData(payload as unknown as Record<string, unknown>)).toEqual(data);
    expect(validateVenueStageData(data).valid).toBe(true);
  });
});
