import { theme } from '../../theme/theme';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import {
  ArtistBasicsData,
  PromoterBusinessData,
  VenueRoomData,
  normalizeStepOneDataForPayload,
  updateLocationForEditing,
  validateStepOneData,
} from '../onboardingStepOne';

const location = {
  displayName: 'Brooklyn, NY, United States',
  addressLine1: null,
  addressLine2: null,
  city: 'Brooklyn',
  state: 'NY',
  postalCode: null,
  country: 'United States',
  latitude: null,
  longitude: null,
  neighborhood: 'Williamsburg',
  placeId: null,
};

describe('Step 1 contracts and validation', () => {
  it('uses the canonical persona accents', () => {
    expect(ONBOARDING_CONFIG.artist).toMatchObject({
      accentStart: theme.personas.artist.accentStart,
      accentEnd: theme.personas.artist.accentEnd,
    });
    expect(ONBOARDING_CONFIG.venue.accentStart).toBe(theme.personas.venue.accent);
    expect(ONBOARDING_CONFIG.venue.accentEnd).toBeUndefined();
    expect(ONBOARDING_CONFIG.promoter.accentStart).toBe(theme.personas.promoter.accent);
    expect(ONBOARDING_CONFIG.promoter.accentEnd).toBeUndefined();
  });

  it('requires a ready profile image and required location fields', () => {
    const artist: ArtistBasicsData = { bio: null, location };
    expect(validateStepOneData('artist', artist, false).valid).toBe(false);

    artist.profileImage = { mediaId: 'media-1' };
    artist.location = { ...location, city: '' };
    expect(validateStepOneData('artist', artist, true).errors.city).toBe('City is required.');

    artist.location = location;
    expect(validateStepOneData('artist', artist, true).valid).toBe(true);
  });

  it('requires Venue address and a positive whole-number capacity', () => {
    const venue: VenueRoomData = {
      profileImage: { mediaId: 'media-1' },
      description: null,
      location,
    };
    expect(validateStepOneData('venue', venue, true).errors.addressLine1).toBeDefined();

    venue.location = { ...location, addressLine1: '123 Bedford Ave' };
    venue.capacity = 0;
    expect(validateStepOneData('venue', venue, true).errors.capacity).toBeDefined();

    venue.capacity = 250;
    expect(validateStepOneData('venue', venue, true).valid).toBe(true);
  });

  it('mirrors backend limits for generated location display names and address lines', () => {
    const venue: VenueRoomData = {
      profileImage: { mediaId: 'media-1' },
      description: null,
      capacity: 250,
      location: {
        ...location,
        addressLine1: '123 Bedford Ave',
        addressLine2: 'x'.repeat(201),
        displayName: 'x'.repeat(251),
      },
    };

    const result = validateStepOneData('venue', venue, true);
    expect(result.errors.location).toBe('Location must be 250 characters or fewer.');
    expect(result.errors.addressLine2).toBe('Address line 2 must be 200 characters or fewer.');
  });

  it('blocks a malformed optional Promoter website', () => {
    const promoter: PromoterBusinessData = {
      profileImage: { mediaId: 'media-1' },
      bio: null,
      location,
      websiteUrl: 'nightshift.example.com',
      phone: null,
    };
    expect(validateStepOneData('promoter', promoter, true).errors.websiteUrl).toBeDefined();
    promoter.websiteUrl = 'https://nightshift.example.com';
    expect(validateStepOneData('promoter', promoter, true).valid).toBe(true);
  });

  it('preserves editing spaces and trims only when producing an API payload', () => {
    const editingLocation = updateLocationForEditing({
      ...location,
      city: 'Mount Vernon ',
      country: 'United States ',
    });
    expect(editingLocation.city).toBe('Mount Vernon ');
    expect(editingLocation.country).toBe('United States ');

    const payload = normalizeStepOneDataForPayload('artist', {
      profileImage: { mediaId: 'media-1' },
      bio: ' Artist bio ',
      location: editingLocation,
    }) as ArtistBasicsData;
    expect(payload.bio).toBe('Artist bio');
    expect(payload.location.city).toBe('Mount Vernon');
    expect(payload.location.country).toBe('United States');
  });
});
