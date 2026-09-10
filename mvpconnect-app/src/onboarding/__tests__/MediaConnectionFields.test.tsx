import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import {
  ArtistIdentityField,
  ProviderConnectionCard,
  UrlProviderConnectionField,
} from '../MediaConnectionFields';
import type { ArtistReferenceProvider, ExternalArtistResult } from '../../services/externalArtistService';

const IDENTITY: ExternalArtistResult = {
  id: 'external-artist-1',
  name: 'Interpol',
  spotifyId: 'spotify-interpol',
  spotifyUrl: 'https://open.spotify.com/artist/interpol',
  spotifyImageUrl: 'https://images.example/interpol.jpg',
  source: 'SPOTIFY',
  resolutionStatus: 'RESOLVED',
  enrichmentStatus: 'PENDING',
};

const provider = (overrides: Partial<ArtistReferenceProvider> = {}): ArtistReferenceProvider => ({
  searchLocal: jest.fn().mockResolvedValue([]),
  searchSpotify: jest.fn().mockResolvedValue([]),
  resolveSpotify: jest.fn().mockResolvedValue(IDENTITY),
  createFreeForm: jest.fn(),
  ...overrides,
});

describe('Media connection fields', () => {
  beforeEach(() => jest.useFakeTimers());

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('shows accessible OAuth connection state and contains rejected provider actions', async () => {
    const onDisconnect = jest.fn().mockRejectedValue(new Error('offline'));
    const screen = render(
      <ProviderConnectionCard
        provider="YOUTUBE"
        connection={{
          connectionId: 'youtube-1',
          provider: 'YOUTUBE',
          connectionMethod: 'OAUTH',
          status: 'CONNECTED',
          displayName: 'Glass Houses',
        }}
        accentColor="#10b8f4"
        onConnect={jest.fn()}
        onDisconnect={onDisconnect}
      />,
    );

    expect(screen.getByLabelText('YouTube connected')).toBeTruthy();
    expect(screen.getByText('YouTube')).toBeTruthy();
    expect(screen.getByText('Glass Houses')).toBeTruthy();
    expect(screen.queryByText('YOUTUBE · CONNECTED')).toBeNull();
    fireEvent.press(screen.getByLabelText('Disconnect YouTube'));
    await waitFor(() => expect(onDisconnect).toHaveBeenCalled());
    expect(await screen.findByText("We couldn't disconnect YouTube.")).toBeTruthy();
  });

  it.each([
    ['YOUTUBE' as const, 'YouTube', 'Glass Houses', 'https://yt3.example/channel.jpg'],
    ['SOUNDCLOUD' as const, 'SoundCloud', 'Glass Houses Audio', 'https://i1.sndcdn.com/avatar.jpg'],
  ])('shows the connected %s provider avatar', (providerName, label, displayName, providerImageUrl) => {
    const screen = render(
      <ProviderConnectionCard
        provider={providerName}
        connection={{
          connectionId: `${providerName.toLowerCase()}-1`,
          provider: providerName,
          connectionMethod: 'OAUTH',
          status: 'CONNECTED',
          displayName,
          providerImageUrl,
        }}
        accentColor="#10b8f4"
        onConnect={jest.fn()}
        onDisconnect={jest.fn()}
      />,
    );

    expect(screen.getByLabelText(`${displayName} ${label} profile image`)).toBeTruthy();
    expect(screen.queryByLabelText(`${label} provider icon`)).toBeNull();
  });

  it('falls back to the provider icon for missing and failed remote images', () => {
    const connection = {
      connectionId: 'youtube-1',
      provider: 'YOUTUBE' as const,
      connectionMethod: 'OAUTH' as const,
      status: 'CONNECTED' as const,
      displayName: 'Glass Houses',
      providerImageUrl: 'https://yt3.example/channel.jpg',
    };
    const screen = render(
      <ProviderConnectionCard
        provider="YOUTUBE"
        connection={connection}
        accentColor="#10b8f4"
        onConnect={jest.fn()}
        onDisconnect={jest.fn()}
      />,
    );

    fireEvent(screen.getByLabelText('Glass Houses YouTube profile image'), 'error');
    expect(screen.getByLabelText('YouTube provider icon')).toBeTruthy();

    act(() => jest.advanceTimersByTime(750));
    expect(screen.getByLabelText('Glass Houses YouTube profile image')).toBeTruthy();
    fireEvent(screen.getByLabelText('Glass Houses YouTube profile image'), 'error');
    expect(screen.getByLabelText('YouTube provider icon')).toBeTruthy();

    screen.rerender(
      <ProviderConnectionCard
        provider="YOUTUBE"
        connection={{ ...connection, providerImageUrl: null }}
        accentColor="#10b8f4"
        onConnect={jest.fn()}
        onDisconnect={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('YouTube provider icon')).toBeTruthy();
  });

  it('retries a previously failed avatar when refreshed connection data arrives', () => {
    const baseConnection = {
      connectionId: 'youtube-1',
      provider: 'YOUTUBE' as const,
      connectionMethod: 'OAUTH' as const,
      status: 'CONNECTED' as const,
      displayName: 'Glass Houses',
      providerImageUrl: 'https://yt3.example/channel.jpg',
      updatedAt: '2026-09-09T14:00:00',
    };
    const props = {
      provider: 'YOUTUBE' as const,
      accentColor: '#10b8f4',
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
    };
    const screen = render(<ProviderConnectionCard {...props} connection={baseConnection} />);
    fireEvent(screen.getByLabelText('Glass Houses YouTube profile image'), 'error');
    act(() => jest.advanceTimersByTime(750));
    fireEvent(screen.getByLabelText('Glass Houses YouTube profile image'), 'error');
    expect(screen.getByLabelText('YouTube provider icon')).toBeTruthy();

    screen.rerender(
      <ProviderConnectionCard
        {...props}
        connection={{ ...baseConnection, updatedAt: '2026-09-09T14:01:00' }}
      />,
    );
    expect(screen.getByLabelText('Glass Houses YouTube profile image')).toBeTruthy();
  });

  it('hydrates an avatar and returns to the provider icon when disconnected', () => {
    const props = {
      provider: 'SOUNDCLOUD' as const,
      accentColor: '#10b8f4',
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
    };
    const screen = render(<ProviderConnectionCard {...props} />);
    expect(screen.getByLabelText('SoundCloud provider icon')).toBeTruthy();

    screen.rerender(
      <ProviderConnectionCard
        {...props}
        connection={{
          connectionId: 'soundcloud-1',
          provider: 'SOUNDCLOUD',
          connectionMethod: 'OAUTH',
          status: 'CONNECTED',
          displayName: 'Glass Houses Audio',
          providerImageUrl: 'https://i1.sndcdn.com/avatar.jpg',
        }}
      />,
    );
    expect(screen.getByLabelText('Glass Houses Audio SoundCloud profile image')).toBeTruthy();

    screen.rerender(<ProviderConnectionCard {...props} />);
    expect(screen.getByLabelText('SoundCloud provider icon')).toBeTruthy();
  });

  it('searches local identities first and attaches the selected identity', async () => {
    const searchLocal = jest.fn().mockResolvedValue([IDENTITY]);
    const searchSpotify = jest.fn().mockResolvedValue([]);
    const onAttach = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <ArtistIdentityField
        config={ONBOARDING_CONFIG.artist}
        provider={provider({ searchLocal, searchSpotify })}
        onAttach={onAttach}
        onDisconnect={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Search for your Spotify Artist identity'), 'Interpol');
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByLabelText('This is me: Interpol')).toBeTruthy();
    expect(searchLocal).toHaveBeenCalledWith('Interpol');
    expect(searchSpotify).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('This is me: Interpol'));
    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(IDENTITY));
  });

  it('supports disconnect and replacement through Spotify fallback without claiming verification', async () => {
    const replacement = { ...IDENTITY, id: 'external-artist-2', name: 'The National' };
    const searchLocal = jest.fn().mockResolvedValue([]);
    const searchSpotify = jest.fn().mockResolvedValue([{
      spotifyId: 'spotify-national',
      name: 'The National',
      spotifyUrl: 'https://open.spotify.com/artist/the-national',
    }]);
    const resolveSpotify = jest.fn().mockResolvedValue(replacement);
    const onAttach = jest.fn().mockResolvedValue(undefined);
    const onDisconnect = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <ArtistIdentityField
        identity={IDENTITY}
        config={ONBOARDING_CONFIG.artist}
        provider={provider({ searchLocal, searchSpotify, resolveSpotify })}
        onAttach={onAttach}
        onDisconnect={onDisconnect}
      />,
    );

    expect(screen.getByText('IDENTIFIED ON SPOTIFY')).toBeTruthy();
    expect(screen.getByLabelText('Interpol Spotify artist image')).toBeTruthy();
    expect(screen.queryByText(/verified/i)).toBeNull();
    fireEvent.press(screen.getByLabelText('Disconnect Interpol Spotify artist identity'));
    await waitFor(() => expect(onDisconnect).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Replace Spotify artist identity'));
    fireEvent.changeText(screen.getByLabelText('Search for your Spotify Artist identity'), 'The National');
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.press(await screen.findByLabelText('This is me: The National'));
    await waitFor(() => expect(resolveSpotify).toHaveBeenCalledWith('spotify-national'));
    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(replacement));
  });

  it('leaves URL-first provider presentation unchanged', () => {
    const screen = render(
      <UrlProviderConnectionField
        provider="INSTAGRAM"
        accentColor="#10b8f4"
        placeholder="https://instagram.com/yourname"
        onSave={jest.fn()}
        onDisconnect={jest.fn()}
      />,
    );

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByLabelText('Instagram profile URL or handle')).toBeTruthy();
  });
});
