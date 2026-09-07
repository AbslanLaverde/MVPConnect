import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import type { ArtistEntityReferenceDto } from '../../onboarding/stepTwoTypes';
import type { OnboardingPersonaConfig } from '../../onboarding/onboardingConfig';
import {
  externalArtistProvider,
  isSpotifyUnavailableError,
  type ArtistReferenceProvider,
  type ExternalArtistResult,
  type SpotifyArtistResult,
  type SpotifyAttemptStatus,
} from '../../services/externalArtistService';
import { TextField } from './TextField';
import { FieldFrame } from './FieldFrame';
import { fieldStyles } from './OnboardingFields.styles';

export const MAX_ARTIST_REFERENCES = 5;
export const ARTIST_SEARCH_DEBOUNCE_MS = 300;

export interface ArtistReferenceInputProps {
  label: string;
  value: readonly ArtistEntityReferenceDto[];
  onChange: (value: ArtistEntityReferenceDto[]) => void;
  optional?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  placeholder?: string;
  provider?: ArtistReferenceProvider;
  accentConfig?: OnboardingPersonaConfig;
  showCounter?: boolean;
}

export const normalizeArtistReferenceDisplayName = (displayName: string): string =>
  displayName.trim().replace(/\s+/g, ' ').toLowerCase();

const referenceIdentity = (reference: ArtistEntityReferenceDto): string =>
  reference.entityId
    ? `${reference.entityType}:id:${reference.entityId}`
    : `${reference.entityType}:name:${normalizeArtistReferenceDisplayName(reference.displayName)}`;

const toReference = (artist: ExternalArtistResult): ArtistEntityReferenceDto => ({
  entityType: 'ARTIST',
  entityId: artist.id,
  displayName: artist.name,
  external: true,
});

export const ArtistReferenceInput: React.FC<ArtistReferenceInputProps> = ({
  label,
  value,
  onChange,
  optional = true,
  disabled = false,
  helperText,
  error,
  placeholder = 'Search for an artist',
  provider = externalArtistProvider,
  accentConfig,
  showCounter = false,
}) => {
  const [input, setInput] = useState('');
  const [localResults, setLocalResults] = useState<ExternalArtistResult[]>([]);
  const [spotifyResults, setSpotifyResults] = useState<SpotifyArtistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [spotifyAttempt, setSpotifyAttempt] = useState<SpotifyAttemptStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [artistDetails, setArtistDetails] = useState<Record<string, ExternalArtistResult>>({});
  const requestSequence = useRef(0);
  const hydrationAttempts = useRef(new Set<string>());
  const trimmedInput = input.trim().replace(/\s+/g, ' ');
  const existingIdentities = useMemo(
    () => new Set(value.map(referenceIdentity)),
    [value],
  );
  const duplicate = trimmedInput.length > 0 && value.some(
    (reference) => normalizeArtistReferenceDisplayName(reference.displayName)
      === normalizeArtistReferenceDisplayName(trimmedInput),
  );
  const limitReached = value.length >= MAX_ARTIST_REFERENCES;
  const focusGradientColors = accentConfig?.accentEnd
    ? [accentConfig.accentStart, accentConfig.accentEnd] as const
    : undefined;

  useEffect(() => {
    let active = true;
    const unresolvedDetails = value.filter((reference) => {
      const id = reference.entityId?.trim();
      if (!id || artistDetails[id] || hydrationAttempts.current.has(id)) return false;
      hydrationAttempts.current.add(id);
      return true;
    });
    if (!unresolvedDetails.length) return undefined;

    void Promise.all(unresolvedDetails.map(async (reference) => {
      try {
        const candidates = await provider.searchLocal(reference.displayName);
        return candidates.find((candidate) => candidate.id === reference.entityId);
      } catch {
        return undefined;
      }
    })).then((results) => {
      if (!active) return;
      setArtistDetails((current) => {
        const next = { ...current };
        results.forEach((artist) => {
          if (artist) next[artist.id] = artist;
        });
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [artistDetails, provider, value]);

  const resetSearch = useCallback(() => {
    setLocalResults([]);
    setSpotifyResults([]);
    setSpotifyAttempt(null);
    setStatusMessage(null);
  }, []);

  const searchSpotify = useCallback(async (query: string, sequence: number) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const results = await provider.searchSpotify(query);
      if (requestSequence.current !== sequence) return;
      setSpotifyResults(results);
      setSpotifyAttempt('NO_MATCH');
      if (!results.length) setStatusMessage('NO SPOTIFY RESULTS FOUND.');
    } catch (error) {
      if (requestSequence.current !== sequence) return;
      setSpotifyResults([]);
      if (isSpotifyUnavailableError(error)) {
        setSpotifyAttempt('UNAVAILABLE');
        setStatusMessage('SPOTIFY IS TEMPORARILY UNAVAILABLE. YOU CAN STILL ADD THIS ARTIST.');
      } else {
        setSpotifyAttempt(null);
        setStatusMessage('ARTIST SEARCH COULD NOT BE COMPLETED. PLEASE TRY AGAIN.');
      }
    } finally {
      if (requestSequence.current === sequence) setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    if (trimmedInput.length < 2 || disabled || limitReached) {
      setLoading(false);
      resetSearch();
      return undefined;
    }

    setLoading(true);
    resetSearch();
    const timeout = setTimeout(async () => {
      try {
        const results = await provider.searchLocal(trimmedInput);
        if (requestSequence.current !== sequence) return;
        setLocalResults(results);
        if (!results.length) {
          await searchSpotify(trimmedInput, sequence);
        } else {
          setLoading(false);
        }
      } catch {
        if (requestSequence.current !== sequence) return;
        setLocalResults([]);
        await searchSpotify(trimmedInput, sequence);
      }
    }, ARTIST_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [disabled, limitReached, provider, resetSearch, searchSpotify, trimmedInput]);

  const addResolvedReference = (artist: ExternalArtistResult) => {
    const reference = toReference(artist);
    if (disabled || limitReached || existingIdentities.has(referenceIdentity(reference))) return;
    setArtistDetails((current) => ({ ...current, [artist.id]: artist }));
    onChange([...value, reference]);
    setInput('');
    resetSearch();
  };

  const selectSpotify = async (artist: SpotifyArtistResult) => {
    if (disabled || limitReached || resolvingKey) return;
    setResolvingKey(artist.spotifyId);
    setStatusMessage(null);
    try {
      addResolvedReference(await provider.resolveSpotify(artist.spotifyId));
    } catch {
      setStatusMessage('THIS ARTIST COULD NOT BE RESOLVED. TRY AGAIN OR ADD MANUALLY.');
    } finally {
      setResolvingKey(null);
    }
  };

  const addManual = async () => {
    if (!spotifyAttempt || !trimmedInput || disabled || limitReached || duplicate || resolvingKey) return;
    setResolvingKey('manual');
    setStatusMessage(null);
    try {
      addResolvedReference(await provider.createFreeForm(trimmedInput, spotifyAttempt));
    } catch {
      setStatusMessage('THE ARTIST COULD NOT BE ADDED. PLEASE TRY AGAIN.');
    } finally {
      setResolvingKey(null);
    }
  };

  const removeReference = (index: number) => {
    if (disabled) return;
    onChange(value.filter((_, candidateIndex) => candidateIndex !== index));
  };

  const runExplicitSpotifySearch = () => {
    const sequence = ++requestSequence.current;
    setSpotifyResults([]);
    setSpotifyAttempt(null);
    void searchSpotify(trimmedInput, sequence);
  };

  const openSpotify = (url?: string | null) => {
    if (url) void Linking.openURL(url);
  };

  return (
    <FieldFrame
      label={label}
      optional={optional}
      helperText={helperText}
      helperBefore
      error={error}
      headerAccessory={showCounter ? (
        <Text
          testID={`${label}-selection-count`}
          style={fieldStyles.selectionCounter}
          accessibilityLabel={`${value.length} of ${MAX_ARTIST_REFERENCES} artists selected`}
        >
          {`${value.length} / ${MAX_ARTIST_REFERENCES}`}
        </Text>
      ) : undefined}
    >
      <TextField
        value={input}
        onChangeText={setInput}
        onSubmitEditing={spotifyAttempt ? addManual : undefined}
        placeholder={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        disabled={disabled || limitReached}
        accessibilityLabel={`${label} artist name`}
        containerStyle={fieldStyles.referenceInput}
        focusColor={accentConfig?.accentStart}
        focusGradientColors={focusGradientColors}
      />

      {loading ? <Text style={fieldStyles.statusText}>SEARCHING...</Text> : null}

      {localResults.length ? (
        <View style={fieldStyles.referenceSearchPanel}>
          <Text style={fieldStyles.referenceResultGroupLabel}>MVPConnect ARTISTS</Text>
          {localResults.map((artist) => (
            <ArtistResultRow
              key={artist.id}
              name={artist.name}
              imageUrl={artist.spotifyImageUrl}
              spotifyUrl={artist.spotifyUrl}
              onSelect={() => addResolvedReference(artist)}
              onOpenSpotify={openSpotify}
              disabled={disabled || limitReached}
            />
          ))}
          {!spotifyAttempt ? (
            <TouchableOpacity
              style={fieldStyles.referenceProviderAction}
              onPress={runExplicitSpotifySearch}
              accessibilityRole="button"
              accessibilityLabel="Search Spotify"
            >
              <Text style={[
                fieldStyles.referenceProviderActionLabel,
                accentConfig && { color: accentConfig.accentEnd ?? accentConfig.accentStart },
              ]}>SEARCH SPOTIFY →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {spotifyResults.length ? (
        <View style={fieldStyles.referenceSearchPanel}>
          <Text style={fieldStyles.referenceResultGroupLabel}>SPOTIFY RESULTS</Text>
          {spotifyResults.map((artist) => (
            <ArtistResultRow
              key={artist.spotifyId}
              name={artist.name}
              imageUrl={artist.spotifyImageUrl}
              spotifyUrl={artist.spotifyUrl}
              onSelect={() => void selectSpotify(artist)}
              onOpenSpotify={openSpotify}
              disabled={disabled || limitReached || resolvingKey === artist.spotifyId}
            />
          ))}
        </View>
      ) : null}

      {statusMessage ? (
        <Text style={fieldStyles.referenceFeedback} accessibilityLiveRegion="polite">
          {statusMessage}
        </Text>
      ) : null}

      {spotifyAttempt && trimmedInput && !duplicate ? (
        <TouchableOpacity
          style={[
            fieldStyles.referenceManualAction,
            accentConfig && { borderColor: accentConfig.accentStart },
          ]}
          onPress={() => void addManual()}
          disabled={disabled || limitReached || Boolean(resolvingKey)}
          accessibilityRole="button"
          accessibilityLabel={`Add ${trimmedInput} manually`}
        >
          <Text style={[
            fieldStyles.referenceProviderActionLabel,
            accentConfig && { color: accentConfig.accentEnd ?? accentConfig.accentStart },
          ]}>
            ADD “{trimmedInput}” MANUALLY →
          </Text>
        </TouchableOpacity>
      ) : null}

      {value.length ? (
        <View style={fieldStyles.referenceList}>
          <Text style={fieldStyles.referenceResultGroupLabel}>SELECTED ARTISTS</Text>
          {value.map((reference, index) => {
            const details = reference.entityId ? artistDetails[reference.entityId] : undefined;
            return (
            <View key={`${referenceIdentity(reference)}:${index}`} style={fieldStyles.referenceEntry}>
              {details?.spotifyImageUrl ? (
                <Image
                  source={{ uri: details.spotifyImageUrl }}
                  style={fieldStyles.referenceSelectedImage}
                  accessibilityLabel={`${reference.displayName} selected artist image`}
                />
              ) : (
                <View
                  style={fieldStyles.referenceSelectedImageFallback}
                  accessibilityLabel={`${reference.displayName} selected artist image unavailable`}
                >
                  <Text style={fieldStyles.referenceResultImageFallbackLabel}>ART</Text>
                </View>
              )}
              <View style={fieldStyles.referenceSelectedCopy}>
                <Text style={fieldStyles.referenceName}>{reference.displayName}</Text>
                <Text style={fieldStyles.referenceSelectedType}>ARTIST</Text>
              </View>
              <TouchableOpacity
                style={fieldStyles.referenceRemoveAction}
                onPress={() => removeReference(index)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${reference.displayName}`}
                accessibilityState={{ disabled }}
              >
                <Text style={fieldStyles.referenceRemoveLabel}>REMOVE ×</Text>
              </TouchableOpacity>
            </View>
          );})}
        </View>
      ) : null}

      {duplicate ? (
        <Text style={fieldStyles.referenceFeedback} accessibilityLiveRegion="polite">
          THAT ARTIST IS ALREADY ON THE LIST.
        </Text>
      ) : limitReached ? (
        <Text style={fieldStyles.limitText} accessibilityLiveRegion="polite">
          MAXIMUM 5 ARTISTS ADDED — REMOVE ONE TO CHANGE.
        </Text>
      ) : null}
    </FieldFrame>
  );
};

interface ArtistResultRowProps {
  name: string;
  imageUrl?: string | null;
  spotifyUrl?: string | null;
  onSelect: () => void;
  onOpenSpotify: (url?: string | null) => void;
  disabled: boolean;
}

const ArtistResultRow: React.FC<ArtistResultRowProps> = ({
  name,
  imageUrl,
  spotifyUrl,
  onSelect,
  onOpenSpotify,
  disabled,
}) => (
  <View style={fieldStyles.referenceResultRow}>
    {imageUrl ? (
      <Image
        source={{ uri: imageUrl }}
        style={fieldStyles.referenceResultImage}
        accessibilityLabel={`${name} artist image`}
      />
    ) : (
      <View
        style={fieldStyles.referenceResultImageFallback}
        accessibilityLabel={`${name} image unavailable`}
      >
        <Text style={fieldStyles.referenceResultImageFallbackLabel}>ART</Text>
      </View>
    )}
    <TouchableOpacity
      style={fieldStyles.referenceResultSelect}
      onPress={onSelect}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Select ${name}`}
    >
      <Text style={fieldStyles.referenceName}>{name}</Text>
      <Text style={fieldStyles.referenceSelectLabel}>SELECT →</Text>
    </TouchableOpacity>
    {spotifyUrl ? (
      <TouchableOpacity
        style={fieldStyles.referenceSpotifyLink}
        onPress={() => onOpenSpotify(spotifyUrl)}
        accessibilityRole="link"
        accessibilityLabel={`View ${name} on Spotify`}
      >
        <Text style={fieldStyles.referenceSpotifyLinkLabel}>SPOTIFY ↗</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);
