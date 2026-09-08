import {
  hydrateBookingNetworkData,
  marketIdentity,
  marketsAreSame,
  normalizeBookingNetworkForPayload,
  validateBookingNetworkData,
} from '../onboardingBookingNetwork';
import type { OnboardingLocationData } from '../onboardingStepOne';

const market = (
  city: string,
  state: string,
  country: string,
  placeId: string | null = null,
): OnboardingLocationData => ({
  displayName: `${city}, ${state}`,
  addressLine1: null,
  addressLine2: null,
  city,
  state,
  postalCode: null,
  country,
  latitude: null,
  longitude: null,
  neighborhood: null,
  placeId,
});

describe('Venue Booking and Promoter Network contracts', () => {
  it('hydrates and normalizes the exact Venue Booking DTO', () => {
    const hydrated = hydrateBookingNetworkData('venue', {
      bookingStatus: 'SELECTIVELY_BOOKING',
      bookingMethod: 'THROUGH_PROMOTERS',
      desiredArtistDraw: 'FROM_251_TO_500',
      bookingEmail: ' booking@example.com ',
    });

    expect(validateBookingNetworkData('venue', hydrated).valid).toBe(true);
    expect(normalizeBookingNetworkForPayload('venue', hydrated)).toEqual({
      bookingStatus: 'SELECTIVELY_BOOKING',
      bookingMethod: 'THROUGH_PROMOTERS',
      desiredArtistDraw: 'FROM_251_TO_500',
      bookingEmail: 'booking@example.com',
    });
  });

  it('requires Venue status/method and rejects an invalid optional email', () => {
    const data = hydrateBookingNetworkData('venue', { bookingEmail: 'not-email' });
    const validation = validateBookingNetworkData('venue', data);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toMatchObject({
      bookingStatus: expect.any(String),
      bookingMethod: expect.any(String),
      bookingEmail: 'Enter a valid email address.',
    });
  });

  it('uses rosterArtists and preserves structured markets and legacy pastShows', () => {
    const hydrated = hydrateBookingNetworkData('promoter', {
      acceptingStatus: 'ACTIVELY_ACCEPTING',
      rosterSize: 'ONE_TO_FIVE',
      rosterArtists: [{
        entityType: 'ARTIST', entityId: 'artist-1', displayName: 'Interpol', external: true,
      }],
      venues: [{
        entityType: 'VENUE', entityId: 'venue-1', displayName: 'Elsewhere', external: true,
      }],
      additionalMarkets: [market('Austin', 'TX', 'US', 'place-austin')],
      pastShows: [{ mediaId: 'show-1', date: null, venue: null, location: null, artists: [] }],
    });

    expect(validateBookingNetworkData('promoter', hydrated).valid).toBe(true);
    expect(normalizeBookingNetworkForPayload('promoter', hydrated)).toMatchObject({
      acceptingStatus: 'ACTIVELY_ACCEPTING',
      rosterSize: 'ONE_TO_FIVE',
      rosterArtists: [{ entityId: 'artist-1' }],
      additionalMarkets: [{ city: 'Austin', placeId: 'place-austin' }],
      pastShows: [{ mediaId: 'show-1' }],
    });
  });

  it('detects duplicate markets by placeId or normalized city/state/country', () => {
    const austin = market('Austin', 'TX', 'US', 'place-austin');
    expect(marketIdentity(austin)).toBe('place:place-austin');
    expect(marketsAreSame(austin, market('Round Rock', 'TX', 'US', ' PLACE-AUSTIN '))).toBe(true);
    expect(marketsAreSame(austin, market(' austin ', 'tx', ' us ', 'different'))).toBe(true);

    const hydrated = hydrateBookingNetworkData('promoter', {
      acceptingStatus: 'SELECTIVELY_ACCEPTING',
      additionalMarkets: [austin, market(' AUSTIN ', 'tx', 'us', 'different')],
    });
    expect(validateBookingNetworkData('promoter', hydrated).errors.additionalMarkets)
      .toBe('Choose each market only once.');
  });

  it('requires resolved stable IDs and enforces reference/market maximums', () => {
    const unresolved = hydrateBookingNetworkData('promoter', {
      acceptingStatus: 'ACTIVELY_ACCEPTING',
      rosterArtists: [{ entityType: 'ARTIST', entityId: null, displayName: 'Artist', external: true }],
      additionalMarkets: Array.from({ length: 6 }, (_, index) =>
        market(`City ${index}`, `S${index}`, 'US')),
    });
    const validation = validateBookingNetworkData('promoter', unresolved);

    expect(validation.errors.rosterArtists).toContain('resolved MVPConnect ID');
    expect(validation.errors.additionalMarkets).toBe('Add no more than 5 markets.');
  });
});
