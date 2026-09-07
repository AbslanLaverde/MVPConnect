import React, { useMemo } from 'react';
import type { ArtistEntityReferenceDto } from '../../onboarding/stepTwoTypes';
import type { OnboardingPersonaConfig } from '../../onboarding/onboardingConfig';
import {
  externalArtistProvider,
  isSpotifyUnavailableError,
  type ArtistReferenceProvider,
} from '../../services/externalArtistService';
import {
  ENTITY_REFERENCE_SEARCH_DEBOUNCE_MS,
  EntityReferenceResolverInput,
  type EntityReferenceResolverProvider,
} from './EntityReferenceResolverInput';

export const MAX_ARTIST_REFERENCES = 5;
export const ARTIST_SEARCH_DEBOUNCE_MS = ENTITY_REFERENCE_SEARCH_DEBOUNCE_MS;

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

export const ArtistReferenceInput: React.FC<ArtistReferenceInputProps> = ({
  provider = externalArtistProvider,
  ...props
}) => {
  const resolverProvider = useMemo<EntityReferenceResolverProvider>(() => ({
    searchLocal: async (query) => (await provider.searchLocal(query)).map((artist) => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.spotifyImageUrl,
      externalUrl: artist.spotifyUrl,
    })),
    searchProvider: async (query) => (await provider.searchSpotify(query)).map((artist) => ({
      providerId: artist.spotifyId,
      name: artist.name,
      imageUrl: artist.spotifyImageUrl,
      externalUrl: artist.spotifyUrl,
    })),
    resolveProvider: async (providerId) => {
      const artist = await provider.resolveSpotify(providerId);
      return {
        id: artist.id,
        name: artist.name,
        imageUrl: artist.spotifyImageUrl,
        externalUrl: artist.spotifyUrl,
      };
    },
    createFreeForm: async (displayName, attemptStatus) => {
      const artist = await provider.createFreeForm(displayName, attemptStatus);
      return {
        id: artist.id,
        name: artist.name,
        imageUrl: artist.spotifyImageUrl,
        externalUrl: artist.spotifyUrl,
      };
    },
    isUnavailableError: isSpotifyUnavailableError,
  }), [provider]);

  return (
    <EntityReferenceResolverInput
      {...props}
      provider={resolverProvider}
      maxSelections={MAX_ARTIST_REFERENCES}
      labels={{
        entityName: 'artist',
        entityNamePlural: 'artists',
        entityTypeLabel: 'ARTIST',
        localResultLabel: 'MVPConnect ARTISTS',
        selectedLabel: 'SELECTED ARTISTS',
        providerName: 'Spotify',
        providerResultLabel: 'SPOTIFY RESULTS',
        providerLinkLabel: 'SPOTIFY',
        fallbackImageLabel: 'ART',
      }}
      toReference={(artist) => ({
        entityType: 'ARTIST',
        entityId: artist.id,
        displayName: artist.name,
        external: true,
      })}
    />
  );
};
