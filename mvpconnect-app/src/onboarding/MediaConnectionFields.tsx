import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import { FieldFrame, TextField } from '../components/onboarding';
import { fieldStyles } from '../components/onboarding/OnboardingFields.styles';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import type {
  ExternalConnectionSummary,
  ExternalProvider,
} from '../services/externalConnectionService';
import {
  externalArtistProvider,
  type ArtistReferenceProvider,
  type ExternalArtistResult,
  type SpotifyArtistResult,
} from '../services/externalArtistService';
import { mediaStepStyles } from './OnboardingMediaStep.styles';

const PROVIDER_LABELS: Record<ExternalProvider, string> = {
  SPOTIFY: 'Spotify',
  YOUTUBE: 'YouTube',
  SOUNDCLOUD: 'SoundCloud',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  BANDCAMP: 'Bandcamp',
  FACEBOOK: 'Facebook',
};

export interface ProviderConnectionCardProps {
  provider: 'YOUTUBE' | 'SOUNDCLOUD';
  connection?: ExternalConnectionSummary;
  busy?: boolean;
  error?: string;
  accentColor: string;
  onConnect: () => Promise<void> | void;
  onDisconnect: () => Promise<void> | void;
}

interface ProviderConnectionVisualProps {
  provider: 'YOUTUBE' | 'SOUNDCLOUD';
  displayName?: string | null;
  providerImageUrl?: string | null;
  connectionUpdatedAt?: string | null;
  connected: boolean;
  accentColor: string;
}

const ProviderConnectionVisual: React.FC<ProviderConnectionVisualProps> = ({
  provider,
  displayName,
  providerImageUrl,
  connectionUpdatedAt,
  connected,
  accentColor,
}) => {
  const imageUrl = connected ? providerImageUrl?.trim() : undefined;
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    setFailedImageUrl(undefined);
    setLoadAttempt(0);
  }, [connectionUpdatedAt, imageUrl]);

  useEffect(() => {
    if (!imageUrl || failedImageUrl !== imageUrl || loadAttempt > 0) return undefined;
    const retry = setTimeout(() => {
      setLoadAttempt(1);
      setFailedImageUrl(undefined);
    }, 750);
    return () => clearTimeout(retry);
  }, [failedImageUrl, imageUrl, loadAttempt]);

  return (
    <View style={mediaStepStyles.connectionIcon}>
      {imageUrl && failedImageUrl !== imageUrl ? (
        <Image
          key={`${imageUrl}:${loadAttempt}`}
          source={{ uri: imageUrl }}
          style={mediaStepStyles.connectionAvatar}
          resizeMode="cover"
          onError={() => setFailedImageUrl(imageUrl)}
          accessibilityRole="image"
          accessibilityLabel={`${displayName ?? PROVIDER_LABELS[provider]} ${PROVIDER_LABELS[provider]} profile image`}
        />
      ) : (
        <View
          accessibilityRole="image"
          accessibilityLabel={`${PROVIDER_LABELS[provider]} provider icon`}
        >
          <Text style={[mediaStepStyles.connectionIconText, { color: accentColor }]}>
            {provider === 'YOUTUBE' ? '▶' : '◉'}
          </Text>
        </View>
      )}
    </View>
  );
};

export const ProviderConnectionCard: React.FC<ProviderConnectionCardProps> = ({
  provider,
  connection,
  busy = false,
  error,
  accentColor,
  onConnect,
  onDisconnect,
}) => {
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const connected = Boolean(connection?.connectionId && connection.status === 'CONNECTED');
  const disabled = busy || working;
  const toggle = async () => {
    if (disabled) return;
    setWorking(true);
    setActionError(undefined);
    try {
      await (connected ? onDisconnect() : onConnect());
    } catch {
      setActionError(`We couldn't ${connected ? 'disconnect' : 'connect'} ${PROVIDER_LABELS[provider]}.`);
    } finally {
      setWorking(false);
    }
  };
  return (
    <View
      style={[mediaStepStyles.connectionCard, connected && { borderColor: accentColor }]}
      accessibilityLabel={`${PROVIDER_LABELS[provider]} ${connected ? 'connected' : 'not connected'}`}
    >
      <ProviderConnectionVisual
        provider={provider}
        displayName={connection?.displayName}
        providerImageUrl={connection?.providerImageUrl}
        connectionUpdatedAt={connection?.updatedAt}
        connected={connected}
        accentColor={accentColor}
      />
      <View style={mediaStepStyles.connectionCopy}>
        <Text style={mediaStepStyles.connectionProvider}>{PROVIDER_LABELS[provider]}</Text>
        <Text style={mediaStepStyles.connectionDetail} numberOfLines={1}>
          {connection?.displayName ?? (connected ? 'CONNECTED' : 'Connect your account')}
        </Text>
        {connection?.profileUrl ? (
          <TouchableOpacity
            onPress={() => void Linking.openURL(connection.profileUrl!)}
            accessibilityRole="link"
            accessibilityLabel={`Open ${PROVIDER_LABELS[provider]} profile`}
          >
            <Text style={[mediaStepStyles.connectionLink, { color: accentColor }]}>VIEW PROFILE ↗</Text>
          </TouchableOpacity>
        ) : null}
        {error || actionError ? (
          <Text style={mediaStepStyles.connectionError}>{error ?? actionError}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[mediaStepStyles.connectionAction, disabled && mediaStepStyles.disabled]}
        onPress={() => void toggle()}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${connected ? 'Disconnect' : 'Connect'} ${PROVIDER_LABELS[provider]}`}
        accessibilityState={{ disabled, busy: disabled, selected: connected }}
      >
        <Text style={[
          mediaStepStyles.connectionActionText,
          { color: connected ? '#ef4444' : accentColor },
        ]}>
          {disabled ? 'WORKING…' : connected ? 'DISCONNECT' : 'CONNECT →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export interface UrlProviderConnectionFieldProps {
  provider: 'INSTAGRAM' | 'TIKTOK' | 'BANDCAMP' | 'FACEBOOK';
  connection?: ExternalConnectionSummary;
  accentColor: string;
  placeholder: string;
  disabled?: boolean;
  onSave: (value: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export const UrlProviderConnectionField: React.FC<UrlProviderConnectionFieldProps> = ({
  provider,
  connection,
  accentColor,
  placeholder,
  disabled = false,
  onSave,
  onDisconnect,
}) => {
  const [value, setValue] = useState(connection?.profileUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const connected = Boolean(connection?.connectionId);

  useEffect(() => setValue(connection?.profileUrl ?? ''), [connection?.profileUrl]);

  const save = async () => {
    if (!value.trim() || saving || disabled) return;
    setSaving(true);
    setError(undefined);
    try {
      await onSave(value.trim());
    } catch {
      setError(`Enter a valid ${PROVIDER_LABELS[provider]} profile${provider === 'INSTAGRAM' || provider === 'TIKTOK' ? ' URL or handle' : ' URL'}.`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (saving || disabled) return;
    setSaving(true);
    setError(undefined);
    try {
      await onDisconnect();
      setValue('');
    } catch {
      setError(`We couldn't remove this ${PROVIDER_LABELS[provider]} connection.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[mediaStepStyles.urlConnectionCard, connected && { borderColor: accentColor }]}>
      <Text style={mediaStepStyles.connectionProvider}>{PROVIDER_LABELS[provider]}</Text>
      <TextField
        value={value}
        onChangeText={setValue}
        onSubmitEditing={() => void save()}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        disabled={disabled || saving}
        focusColor={accentColor}
        accessibilityLabel={`${PROVIDER_LABELS[provider]} profile URL or handle`}
        containerStyle={mediaStepStyles.connectionInput}
        error={error}
      />
      <View style={mediaStepStyles.urlConnectionActions}>
        <TouchableOpacity
          style={[mediaStepStyles.connectionAction, (!value.trim() || saving || disabled) && mediaStepStyles.disabled]}
          onPress={() => void save()}
          disabled={!value.trim() || saving || disabled}
          accessibilityRole="button"
          accessibilityLabel={`Save ${PROVIDER_LABELS[provider]} connection`}
          accessibilityState={{ disabled: !value.trim() || saving || disabled, busy: saving }}
        >
          <Text style={[mediaStepStyles.connectionActionText, { color: accentColor }]}>
            {saving ? 'SAVING…' : connected ? 'SAVE CHANGES →' : 'ADD PROFILE →'}
          </Text>
        </TouchableOpacity>
        {connected ? (
          <TouchableOpacity
            style={mediaStepStyles.connectionAction}
            onPress={() => void remove()}
            disabled={saving || disabled}
            accessibilityRole="button"
            accessibilityLabel={`Disconnect ${PROVIDER_LABELS[provider]}`}
            accessibilityState={{ disabled: saving || disabled }}
          >
            <Text style={[mediaStepStyles.connectionActionText, mediaStepStyles.removeText]}>REMOVE</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

type ArtistSearchResult =
  | { kind: 'local'; artist: ExternalArtistResult }
  | { kind: 'spotify'; artist: SpotifyArtistResult };

export interface ArtistIdentityFieldProps {
  identity?: ExternalArtistResult | null;
  config: OnboardingPersonaConfig;
  disabled?: boolean;
  provider?: ArtistReferenceProvider;
  onAttach: (artist: ExternalArtistResult) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export const ArtistIdentityField: React.FC<ArtistIdentityFieldProps> = ({
  identity,
  config,
  disabled = false,
  provider = externalArtistProvider,
  onAttach,
  onDisconnect,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [replace, setReplace] = useState(false);
  const [message, setMessage] = useState<string>();
  const sequence = useRef(0);
  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  const accent = config.accentEnd ?? config.accentStart;

  useEffect(() => {
    const request = ++sequence.current;
    if (normalizedQuery.length < 2 || disabled || working) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setMessage(undefined);
    const timer = setTimeout(async () => {
      try {
        const local = await provider.searchLocal(normalizedQuery);
        if (request !== sequence.current) return;
        if (local.length) {
          setResults(local.map((artist) => ({ kind: 'local', artist })));
          setLoading(false);
          return;
        }
        const spotify = await provider.searchSpotify(normalizedQuery);
        if (request !== sequence.current) return;
        setResults(spotify.map((artist) => ({ kind: 'spotify', artist })));
        if (!spotify.length) setMessage('NO SPOTIFY ARTIST RESULTS FOUND.');
      } catch {
        if (request === sequence.current) setMessage('ARTIST SEARCH IS TEMPORARILY UNAVAILABLE.');
      } finally {
        if (request === sequence.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [disabled, normalizedQuery, provider, working]);

  const searchSpotify = async () => {
    const request = ++sequence.current;
    setLoading(true);
    setMessage(undefined);
    try {
      const spotify = await provider.searchSpotify(normalizedQuery);
      if (request === sequence.current) {
        setResults(spotify.map((artist) => ({ kind: 'spotify', artist })));
        if (!spotify.length) setMessage('NO SPOTIFY ARTIST RESULTS FOUND.');
      }
    } catch {
      if (request === sequence.current) setMessage('SPOTIFY SEARCH IS TEMPORARILY UNAVAILABLE.');
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  };

  const select = async (result: ArtistSearchResult) => {
    if (working || disabled) return;
    setWorking(true);
    setMessage(undefined);
    try {
      const artist = result.kind === 'local'
        ? result.artist
        : await provider.resolveSpotify(result.artist.spotifyId);
      await onAttach(artist);
      setQuery('');
      setResults([]);
      setReplace(false);
    } catch {
      setMessage("WE COULDN'T ATTACH THIS ARTIST IDENTITY.");
    } finally {
      setWorking(false);
    }
  };

  const disconnect = async () => {
    if (working || disabled) return;
    setWorking(true);
    setMessage(undefined);
    try {
      await onDisconnect();
    } catch {
      setMessage("WE COULDN'T DISCONNECT THIS ARTIST IDENTITY.");
    } finally {
      setWorking(false);
    }
  };

  const currentCard = identity && !replace ? (
    <View style={[mediaStepStyles.identityCard, { borderColor: config.accentStart }]}>
      {identity.spotifyImageUrl ? (
        <Image
          source={{ uri: identity.spotifyImageUrl }}
          style={mediaStepStyles.identityImage}
          accessibilityLabel={`${identity.name} Spotify artist image`}
        />
      ) : <View style={mediaStepStyles.identityImageFallback}><Text style={mediaStepStyles.identityFallbackText}>ARTIST</Text></View>}
      <View style={mediaStepStyles.identityCopy}>
        <Text style={mediaStepStyles.identityName}>{identity.name}</Text>
        <Text style={[mediaStepStyles.identityState, { color: accent }]}>IDENTIFIED ON SPOTIFY</Text>
        {identity.spotifyUrl ? (
          <TouchableOpacity onPress={() => void Linking.openURL(identity.spotifyUrl!)} accessibilityRole="link">
            <Text style={[mediaStepStyles.connectionLink, { color: accent }]}>VIEW ON SPOTIFY ↗</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={mediaStepStyles.identityActions}>
        <TouchableOpacity
          style={mediaStepStyles.connectionAction}
          onPress={() => setReplace(true)}
          disabled={disabled || working}
          accessibilityRole="button"
          accessibilityLabel="Replace Spotify artist identity"
        >
          <Text style={[mediaStepStyles.connectionActionText, { color: accent }]}>REPLACE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={mediaStepStyles.connectionAction}
          onPress={() => void disconnect()}
          disabled={disabled || working}
          accessibilityRole="button"
          accessibilityLabel={`Disconnect ${identity.name} Spotify artist identity`}
        >
          <Text style={[mediaStepStyles.connectionActionText, mediaStepStyles.removeText]}>DISCONNECT</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  return (
    <FieldFrame
      label="SPOTIFY ARTIST IDENTITY"
      helperText="Search for your public Artist page. This identifies you; it does not verify account ownership."
      helperBefore
    >
      {currentCard ?? (
        <View>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search for your Artist identity"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            disabled={disabled || working}
            focusColor={config.accentStart}
            focusGradientColors={config.accentEnd ? [config.accentStart, config.accentEnd] : undefined}
            accessibilityLabel="Search for your Spotify Artist identity"
          />
          {loading ? <Text style={fieldStyles.statusText}>SEARCHING…</Text> : null}
          {results.length ? (
            <View style={mediaStepStyles.identityResults}>
              {results.map((result) => {
                const artist = result.artist;
                const key = result.kind === 'local' ? result.artist.id : result.artist.spotifyId;
                const imageUrl = artist.spotifyImageUrl;
                return (
                  <View key={`${result.kind}:${key}`} style={mediaStepStyles.identityResult}>
                    {imageUrl ? <Image source={{ uri: imageUrl }} style={mediaStepStyles.identityResultImage} /> : null}
                    <View style={mediaStepStyles.identityCopy}>
                      <Text style={mediaStepStyles.identityName}>{artist.name}</Text>
                      <Text style={mediaStepStyles.connectionDetail}>
                        {result.kind === 'local' ? 'MVPConnect / Spotify' : 'Spotify result'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={mediaStepStyles.identityThisIsMe}
                      onPress={() => void select(result)}
                      disabled={disabled || working}
                      accessibilityRole="button"
                      accessibilityLabel={`This is me: ${artist.name}`}
                    >
                      <Text style={[mediaStepStyles.connectionActionText, { color: accent }]}>THIS IS ME →</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              {results[0]?.kind === 'local' ? (
                <TouchableOpacity
                  style={mediaStepStyles.spotifySearchAction}
                  onPress={() => void searchSpotify()}
                  disabled={!normalizedQuery || loading}
                  accessibilityRole="button"
                  accessibilityLabel="Search Spotify instead"
                >
                  <Text style={[mediaStepStyles.connectionActionText, { color: accent }]}>SEARCH SPOTIFY →</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          {identity ? (
            <TouchableOpacity
              style={mediaStepStyles.connectionAction}
              onPress={() => setReplace(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel replacing Spotify artist identity"
            >
              <Text style={mediaStepStyles.connectionActionText}>CANCEL</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {message ? <Text style={mediaStepStyles.connectionError}>{message}</Text> : null}
    </FieldFrame>
  );
};
