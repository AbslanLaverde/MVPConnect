import React, { useState } from 'react';
import { Linking, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { VenueEntityReferenceDto } from '../../../onboarding/stepTwoTypes';
import type {
  GoogleVenueResult,
  VenuePhotoPresentation,
  VenueIdentityResult,
  VenueReferenceProvider,
} from '../../../services/venueIdentityService';
import { ENTITY_REFERENCE_SEARCH_DEBOUNCE_MS } from '../EntityReferenceResolverInput';
import { VenueReferenceInput } from '../VenueReferenceInput';

const venuePhoto = (): VenuePhotoPresentation => ({
  url: 'https://lh3.googleusercontent.com/venue-photo',
  googleMapsUri: 'https://maps.google.com/photo/photo-1',
  authorAttributions: [{
    displayName: 'Venue Photographer',
    uri: 'https://maps.google.com/contributor/photographer',
    photoUri: 'https://lh3.googleusercontent.com/photographer-avatar',
  }],
});

const localVenue = (overrides: Partial<VenueIdentityResult> = {}): VenueIdentityResult => ({
  id: 'venue-identity-1',
  name: "Baby's All Right",
  source: 'GOOGLE',
  resolutionStatus: 'RESOLVED',
  googlePlaceId: 'place-1',
  googleMapsUri: 'https://maps.google.com/venue/place-1',
  location: { city: 'Brooklyn', state: 'NY' },
  ...overrides,
});

const googleVenue = (overrides: Partial<GoogleVenueResult> = {}): GoogleVenueResult => ({
  providerPlaceId: 'place-1',
  name: "Baby's All Right",
  googleMapsUri: 'https://maps.google.com/venue/place-1',
  location: { city: 'Brooklyn', state: 'NY' },
  ...overrides,
});

const provider = (overrides: Partial<VenueReferenceProvider> = {}): VenueReferenceProvider => ({
  searchLocal: jest.fn().mockResolvedValue([localVenue()]),
  searchGoogle: jest.fn().mockResolvedValue([googleVenue()]),
  resolveGoogle: jest.fn().mockResolvedValue(localVenue()),
  createFreeForm: jest.fn().mockResolvedValue(localVenue({
    id: 'manual-1',
    name: 'Tiny Local Room',
    source: 'FREE_FORM',
    resolutionStatus: 'UNRESOLVED',
    googlePlaceId: null,
    googleMapsUri: null,
    location: null,
  })),
  ...overrides,
});

const Harness = ({
  initial = [],
  venueProvider,
}: {
  initial?: VenueEntityReferenceDto[];
  venueProvider: VenueReferenceProvider;
}) => {
  const [references, setReferences] = useState(initial);
  return (
    <>
      <VenueReferenceInput
        label="Venues You've Played"
        value={references}
        onChange={setReferences}
        provider={venueProvider}
      />
      <Text accessibilityLabel="Venue reference data">{JSON.stringify(references)}</Text>
    </>
  );
};

const reference = (displayName: string, entityId: string): VenueEntityReferenceDto => ({
  entityType: 'VENUE',
  entityId,
  displayName,
  external: true,
});

const runDebounce = async () => {
  await act(async () => {
    jest.advanceTimersByTime(ENTITY_REFERENCE_SEARCH_DEBOUNCE_MS);
  });
  await act(async () => Promise.resolve());
};

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('VenueReferenceInput', () => {
  it('searches local VenueIdentity first and renders location disambiguation', async () => {
    const venueProvider = provider();
    const screen = render(<Harness venueProvider={venueProvider} />);

    fireEvent.changeText(screen.getByLabelText("Venues You've Played venue name"), "Baby's");
    await runDebounce();

    expect(venueProvider.searchLocal).toHaveBeenCalledWith("Baby's");
    expect(venueProvider.searchGoogle).not.toHaveBeenCalled();
    expect(screen.getByText('MVPConnect VENUES')).toBeTruthy();
    expect(screen.getByText('Brooklyn, NY')).toBeTruthy();
    expect(screen.getByLabelText('Search Google')).toBeTruthy();
  });

  it('auto-searches Google only when local results are empty', async () => {
    const venueProvider = provider({ searchLocal: jest.fn().mockResolvedValue([]) });
    const screen = render(<Harness venueProvider={venueProvider} />);

    fireEvent.changeText(screen.getByLabelText("Venues You've Played venue name"), "Baby's");
    await runDebounce();

    expect(venueProvider.searchGoogle).toHaveBeenCalledWith("Baby's");
    expect(screen.getByText('GOOGLE RESULTS')).toBeTruthy();
  });

  it('supports explicit Google search when local results exist', async () => {
    const venueProvider = provider();
    const screen = render(<Harness venueProvider={venueProvider} />);
    fireEvent.changeText(screen.getByLabelText("Venues You've Played venue name"), "Baby's");
    await runDebounce();

    fireEvent.press(screen.getByLabelText('Search Google'));
    await act(async () => Promise.resolve());

    expect(venueProvider.searchGoogle).toHaveBeenCalledWith("Baby's");
    expect(screen.getByText('GOOGLE RESULTS')).toBeTruthy();
  });

  it('resolves a Google selection immediately and stores the stable VenueIdentity ID', async () => {
    const venueProvider = provider({ searchLocal: jest.fn().mockResolvedValue([]) });
    const screen = render(<Harness venueProvider={venueProvider} />);
    fireEvent.changeText(screen.getByLabelText("Venues You've Played venue name"), "Baby's");
    await runDebounce();

    fireEvent.press(screen.getByLabelText("Select Baby's All Right"));
    await act(async () => Promise.resolve());

    expect(venueProvider.resolveGoogle).toHaveBeenCalledWith('place-1');
    expect(JSON.parse(screen.getByLabelText('Venue reference data').props.children)).toEqual([{
      entityType: 'VENUE',
      entityId: 'venue-identity-1',
      displayName: "Baby's All Right",
      external: true,
    }]);
  });

  it('opens the safe provider link when present', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const screen = render(<Harness venueProvider={provider()} />);
    fireEvent.changeText(screen.getByLabelText("Venues You've Played venue name"), "Baby's");
    await runDebounce();

    fireEvent.press(screen.getByLabelText("View Baby's All Right on Google"));

    expect(open).toHaveBeenCalledWith('https://maps.google.com/venue/place-1');
  });

  it('renders a remote Google photo with attribution and source-photo access', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const venueProvider = provider({
      searchLocal: jest.fn().mockResolvedValue([]),
      searchGoogle: jest.fn().mockResolvedValue([googleVenue({ photo: venuePhoto() })]),
    });
    const screen = render(<Harness venueProvider={venueProvider} />);
    fireEvent.changeText(screen.getByLabelText("Venues You've Played venue name"), "Baby's");
    await runDebounce();

    expect(screen.getByLabelText("Baby's All Right venue image").props.source).toEqual({
      uri: 'https://lh3.googleusercontent.com/venue-photo',
    });
    expect(screen.getByText('PHOTO: Venue Photographer')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Photo by Venue Photographer'));
    fireEvent.press(screen.getByLabelText('View source photo on Google Maps'));

    expect(open).toHaveBeenCalledWith('https://maps.google.com/contributor/photographer');
    expect(open).toHaveBeenCalledWith('https://maps.google.com/photo/photo-1');
  });

  it('renders the Venue placeholder when provider photo presentation is missing', async () => {
    const venueProvider = provider({ searchLocal: jest.fn().mockResolvedValue([]) });
    const screen = render(<Harness venueProvider={venueProvider} />);
    fireEvent.changeText(screen.getByLabelText("Venues You've Played venue name"), "Baby's");
    await runDebounce();

    expect(screen.getByLabelText("Baby's All Right image unavailable")).toBeTruthy();
    expect(screen.getByText('VEN')).toBeTruthy();
  });

  it('keeps a selected VenueIdentity reference valid when fresh photo metadata disappears', async () => {
    const venueProvider = provider({
      searchLocal: jest.fn().mockResolvedValue([localVenue({ photo: null })]),
    });
    const existingReference = reference("Baby's All Right", 'venue-identity-1');
    const screen = render(
      <Harness venueProvider={venueProvider} initial={[existingReference]} />,
    );
    await act(async () => Promise.resolve());

    expect(JSON.parse(screen.getByLabelText('Venue reference data').props.children))
      .toEqual([existingReference]);
    expect(screen.getByLabelText("Baby's All Right selected venue image unavailable")).toBeTruthy();
  });

  it('creates NO_MATCH manual venues after an empty Google result', async () => {
    const venueProvider = provider({
      searchLocal: jest.fn().mockResolvedValue([]),
      searchGoogle: jest.fn().mockResolvedValue([]),
    });
    const screen = render(<Harness venueProvider={venueProvider} />);
    fireEvent.changeText(screen.getByLabelText("Venues You've Played venue name"), 'Tiny Local Room');
    await runDebounce();

    fireEvent.press(screen.getByLabelText('Add Tiny Local Room manually'));
    await act(async () => Promise.resolve());

    expect(venueProvider.createFreeForm).toHaveBeenCalledWith('Tiny Local Room', 'NO_MATCH', undefined);
  });

  it('creates UNAVAILABLE manual venues after a safe provider failure', async () => {
    const unavailable = Object.assign(new Error('safe provider failure'), {
      isAxiosError: true,
      response: { data: { code: 'GOOGLE_PLACES_UNAVAILABLE' } },
    });
    const venueProvider = provider({
      searchLocal: jest.fn().mockResolvedValue([]),
      searchGoogle: jest.fn().mockRejectedValue(unavailable),
    });
    const screen = render(<Harness venueProvider={venueProvider} />);
    fireEvent.changeText(screen.getByLabelText("Venues You've Played venue name"), 'Tiny Local Room');
    await runDebounce();

    expect(screen.getByText(/GOOGLE IS TEMPORARILY UNAVAILABLE/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Add Tiny Local Room manually'));
    await act(async () => Promise.resolve());

    expect(venueProvider.createFreeForm)
      .toHaveBeenCalledWith('Tiny Local Room', 'UNAVAILABLE', undefined);
  });

  it('enforces max five and preserves removal behavior', () => {
    const screen = render(<Harness venueProvider={provider()} initial={[
      reference('One', '1'), reference('Two', '2'), reference('Three', '3'),
      reference('Four', '4'), reference('Five', '5'),
    ]} />);

    expect(screen.getByText('MAXIMUM 5 VENUES ADDED — REMOVE ONE TO CHANGE.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Remove One'));
    expect(screen.queryByText('One')).toBeNull();
    expect(screen.getByText('Two')).toBeTruthy();
  });

  it('ignores stale local search responses', async () => {
    const pending = new Map<string, (value: VenueIdentityResult[]) => void>();
    const searchLocal = jest.fn((query: string) => new Promise<VenueIdentityResult[]>((resolve) => {
      pending.set(query, resolve);
    }));
    const venueProvider = provider({ searchLocal });
    const screen = render(<Harness venueProvider={venueProvider} />);
    const input = screen.getByLabelText("Venues You've Played venue name");

    fireEvent.changeText(input, 'Old Room');
    await runDebounce();
    fireEvent.changeText(input, 'New Room');
    await runDebounce();

    await act(async () => pending.get('New Room')?.([localVenue({ id: 'new', name: 'New Room' })]));
    await act(async () => pending.get('Old Room')?.([localVenue({ id: 'old', name: 'Old Room' })]));

    expect(screen.getByText('New Room')).toBeTruthy();
    expect(screen.queryByText('Old Room')).toBeNull();
  });
});
