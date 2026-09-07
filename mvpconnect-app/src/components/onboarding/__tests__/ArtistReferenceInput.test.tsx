import React, { useState } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ArtistEntityReferenceDto } from '../../../onboarding/stepTwoTypes';
import type {
  ArtistReferenceProvider,
  ExternalArtistResult,
  SpotifyArtistResult,
} from '../../../services/externalArtistService';
import { ARTIST_SEARCH_DEBOUNCE_MS, ArtistReferenceInput } from '../ArtistReferenceInput';

const localArtist = (overrides: Partial<ExternalArtistResult> = {}): ExternalArtistResult => ({
  id: 'external-1',
  name: 'Interpol',
  spotifyId: 'spotify-1',
  spotifyUrl: 'https://open.spotify.com/artist/spotify-1',
  spotifyImageUrl: 'https://images.example/interpol.jpg',
  source: 'SPOTIFY',
  resolutionStatus: 'RESOLVED',
  enrichmentStatus: 'PENDING',
  ...overrides,
});

const spotifyArtist = (overrides: Partial<SpotifyArtistResult> = {}): SpotifyArtistResult => ({
  spotifyId: 'spotify-1',
  name: 'Interpol',
  spotifyUrl: 'https://open.spotify.com/artist/spotify-1',
  spotifyImageUrl: 'https://images.example/interpol.jpg',
  ...overrides,
});

const provider = (overrides: Partial<ArtistReferenceProvider> = {}): ArtistReferenceProvider => ({
  searchLocal: jest.fn().mockResolvedValue([localArtist()]),
  searchSpotify: jest.fn().mockResolvedValue([spotifyArtist()]),
  resolveSpotify: jest.fn().mockResolvedValue(localArtist()),
  createFreeForm: jest.fn().mockResolvedValue(localArtist({
    id: 'manual-1',
    name: 'Tiny Local Band',
    spotifyId: null,
    spotifyUrl: null,
    spotifyImageUrl: null,
    source: 'FREE_FORM',
    resolutionStatus: 'UNRESOLVED',
  })),
  ...overrides,
});

const Harness = ({
  initial = [],
  artistProvider,
}: {
  initial?: ArtistEntityReferenceDto[];
  artistProvider: ArtistReferenceProvider;
}) => {
  const [references, setReferences] = useState(initial);
  return (
    <>
      <ArtistReferenceInput
        label="Sounds Like"
        value={references}
        onChange={setReferences}
        provider={artistProvider}
      />
      <Text accessibilityLabel="Artist reference data">{JSON.stringify(references)}</Text>
    </>
  );
};

const reference = (displayName: string, entityId: string): ArtistEntityReferenceDto => ({
  entityType: 'ARTIST',
  entityId,
  displayName,
  external: true,
});

const runDebounce = async () => {
  await act(async () => {
    jest.advanceTimersByTime(ARTIST_SEARCH_DEBOUNCE_MS);
  });
  await act(async () => Promise.resolve());
};

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

describe('ArtistReferenceInput', () => {
  it('searches locally first and does not call Spotify when local results exist', async () => {
    const artistProvider = provider();
    const screen = render(<Harness artistProvider={artistProvider} />);

    fireEvent.changeText(screen.getByLabelText('Sounds Like artist name'), 'Interpol');
    await runDebounce();

    expect(artistProvider.searchLocal).toHaveBeenCalledWith('Interpol');
    expect(artistProvider.searchSpotify).not.toHaveBeenCalled();
    expect(screen.getByText('MVPConnect ARTISTS')).toBeTruthy();
    expect(screen.getByLabelText('Search Spotify')).toBeTruthy();
  });

  it('automatically searches Spotify when local results are empty', async () => {
    const artistProvider = provider({ searchLocal: jest.fn().mockResolvedValue([]) });
    const screen = render(<Harness artistProvider={artistProvider} />);

    fireEvent.changeText(screen.getByLabelText('Sounds Like artist name'), 'Interpol');
    await runDebounce();

    expect(artistProvider.searchSpotify).toHaveBeenCalledWith('Interpol');
    expect(screen.getByText('SPOTIFY RESULTS')).toBeTruthy();
  });

  it('searches Spotify only after the explicit action when local results exist', async () => {
    const artistProvider = provider();
    const screen = render(<Harness artistProvider={artistProvider} />);
    fireEvent.changeText(screen.getByLabelText('Sounds Like artist name'), 'Interpol');
    await runDebounce();

    fireEvent.press(screen.getByLabelText('Search Spotify'));
    await act(async () => Promise.resolve());

    expect(artistProvider.searchSpotify).toHaveBeenCalledWith('Interpol');
    expect(screen.getByText('SPOTIFY RESULTS')).toBeTruthy();
  });

  it('stores an existing ExternalArtist ID when a local result is selected', async () => {
    const artistProvider = provider();
    const screen = render(<Harness artistProvider={artistProvider} />);
    fireEvent.changeText(screen.getByLabelText('Sounds Like artist name'), 'Interpol');
    await runDebounce();

    fireEvent.press(screen.getByLabelText('Select Interpol'));

    expect(JSON.parse(screen.getByLabelText('Artist reference data').props.children)).toEqual([{
      entityType: 'ARTIST',
      entityId: 'external-1',
      displayName: 'Interpol',
      external: true,
    }]);
  });

  it('resolves a Spotify result immediately and stores the returned ExternalArtist ID', async () => {
    const artistProvider = provider({ searchLocal: jest.fn().mockResolvedValue([]) });
    const screen = render(<Harness artistProvider={artistProvider} />);
    fireEvent.changeText(screen.getByLabelText('Sounds Like artist name'), 'Interpol');
    await runDebounce();

    fireEvent.press(screen.getByLabelText('Select Interpol'));
    await act(async () => Promise.resolve());

    expect(artistProvider.resolveSpotify).toHaveBeenCalledWith('spotify-1');
    expect(JSON.parse(screen.getByLabelText('Artist reference data').props.children)[0].entityId)
      .toBe('external-1');
  });

  it('offers unavailable manual fallback and sends the unavailable attempt state', async () => {
    const unavailableError = Object.assign(new Error('safe provider failure'), {
      isAxiosError: true,
      response: { data: { code: 'SPOTIFY_UNAVAILABLE' } },
    });
    const artistProvider = provider({
      searchLocal: jest.fn().mockResolvedValue([]),
      searchSpotify: jest.fn().mockRejectedValue(unavailableError),
    });
    const screen = render(<Harness artistProvider={artistProvider} />);
    fireEvent.changeText(screen.getByLabelText('Sounds Like artist name'), 'Tiny Local Band');
    await runDebounce();

    expect(screen.getByText(/SPOTIFY IS TEMPORARILY UNAVAILABLE/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Add Tiny Local Band manually'));
    await act(async () => Promise.resolve());

    expect(artistProvider.createFreeForm).toHaveBeenCalledWith('Tiny Local Band', 'UNAVAILABLE');
    expect(JSON.parse(screen.getByLabelText('Artist reference data').props.children)[0].entityId)
      .toBe('manual-1');
  });

  it('sends NO_MATCH when manual entry follows a successful empty Spotify search', async () => {
    const artistProvider = provider({
      searchLocal: jest.fn().mockResolvedValue([]),
      searchSpotify: jest.fn().mockResolvedValue([]),
    });
    const screen = render(<Harness artistProvider={artistProvider} />);
    fireEvent.changeText(screen.getByLabelText('Sounds Like artist name'), 'Tiny Local Band');
    await runDebounce();

    fireEvent.press(screen.getByLabelText('Add Tiny Local Band manually'));
    await act(async () => Promise.resolve());

    expect(artistProvider.createFreeForm).toHaveBeenCalledWith('Tiny Local Band', 'NO_MATCH');
  });

  it('renders Spotify imagery and a fallback when imagery is missing', async () => {
    const artistProvider = provider({
      searchLocal: jest.fn().mockResolvedValue([
        localArtist(),
        localArtist({ id: 'external-2', name: 'No Image Artist', spotifyImageUrl: null }),
      ]),
    });
    const screen = render(<Harness artistProvider={artistProvider} />);
    fireEvent.changeText(screen.getByLabelText('Sounds Like artist name'), 'artist');
    await runDebounce();

    expect(screen.getByLabelText('Interpol artist image')).toBeTruthy();
    expect(screen.getByLabelText('No Image Artist image unavailable')).toBeTruthy();
    expect(screen.getByLabelText('View Interpol on Spotify')).toBeTruthy();
  });

  it('keeps the five-reference limit and remove behavior', () => {
    const artistProvider = provider();
    const screen = render(<Harness artistProvider={artistProvider} initial={[
      reference('One', '1'), reference('Two', '2'), reference('Three', '3'),
      reference('Four', '4'), reference('Five', '5'),
    ]} />);

    expect(screen.getByText('MAXIMUM 5 ARTISTS ADDED — REMOVE ONE TO CHANGE.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Remove One'));
    expect(screen.queryByText('One')).toBeNull();
    expect(screen.getByText('Two')).toBeTruthy();
  });
});
