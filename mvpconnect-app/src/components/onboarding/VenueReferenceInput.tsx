import React, { useMemo } from 'react';
import type { VenueEntityReferenceDto } from '../../onboarding/stepTwoTypes';
import type { OnboardingPersonaConfig } from '../../onboarding/onboardingConfig';
import {
  isGooglePlacesUnavailableError,
  venueIdentityProvider,
  type FreeFormVenueLocation,
  type VenueIdentityLocation,
  type VenueReferenceProvider,
} from '../../services/venueIdentityService';
import {
  EntityReferenceResolverInput,
  type EntityReferenceResolverProvider,
} from './EntityReferenceResolverInput';

export const MAX_VENUE_REFERENCES = 5;

export interface VenueReferenceInputProps {
  label: string;
  value: readonly VenueEntityReferenceDto[];
  onChange: (value: VenueEntityReferenceDto[]) => void;
  optional?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  placeholder?: string;
  provider?: VenueReferenceProvider;
  accentConfig?: OnboardingPersonaConfig;
  showCounter?: boolean;
  manualLocation?: FreeFormVenueLocation;
}

const locationText = (location?: VenueIdentityLocation | null): string | null => {
  if (!location) return null;
  const cityState = [location.city, location.state].filter(Boolean).join(', ');
  return cityState || location.displayName || location.addressLine1 || null;
};

const photoFields = (photo: {
  url: string;
  googleMapsUri?: string | null;
  authorAttributions: Array<{
    displayName?: string | null;
    uri?: string | null;
    photoUri?: string | null;
  }>;
} | null | undefined) => photo ? {
  imageUrl: photo.url,
  imageSourceUrl: photo.googleMapsUri,
  imageAttributions: photo.authorAttributions,
} : {};

export const VenueReferenceInput: React.FC<VenueReferenceInputProps> = ({
  provider = venueIdentityProvider,
  manualLocation,
  ...props
}) => {
  const resolverProvider = useMemo<EntityReferenceResolverProvider>(() => ({
    searchLocal: async (query) => (await provider.searchLocal(query)).map((venue) => ({
      id: venue.id,
      name: venue.name,
      externalUrl: venue.googleMapsUri ?? venue.providerWebsiteUrl,
      secondaryText: locationText(venue.location),
      ...photoFields(venue.photo),
    })),
    searchProvider: async (query) => (await provider.searchGoogle(query)).map((venue) => ({
      providerId: venue.providerPlaceId,
      name: venue.name,
      externalUrl: venue.googleMapsUri ?? venue.providerWebsiteUrl,
      secondaryText: locationText(venue.location),
      ...photoFields(venue.photo),
    })),
    resolveProvider: async (providerId) => {
      const venue = await provider.resolveGoogle(providerId);
      return {
        id: venue.id,
        name: venue.name,
        externalUrl: venue.googleMapsUri ?? venue.providerWebsiteUrl,
        secondaryText: locationText(venue.location),
        ...photoFields(venue.photo),
      };
    },
    createFreeForm: async (displayName, attemptStatus) => {
      const venue = await provider.createFreeForm(displayName, attemptStatus, manualLocation);
      return {
        id: venue.id,
        name: venue.name,
        externalUrl: venue.googleMapsUri ?? venue.providerWebsiteUrl,
        secondaryText: locationText(venue.location),
        ...photoFields(venue.photo),
      };
    },
    isUnavailableError: isGooglePlacesUnavailableError,
  }), [manualLocation, provider]);

  return (
    <EntityReferenceResolverInput
      {...props}
      provider={resolverProvider}
      maxSelections={MAX_VENUE_REFERENCES}
      labels={{
        entityName: 'venue',
        entityNamePlural: 'venues',
        entityTypeLabel: 'VENUE',
        localResultLabel: 'MVPConnect VENUES',
        selectedLabel: 'SELECTED VENUES',
        providerName: 'Google',
        providerResultLabel: 'GOOGLE RESULTS',
        providerLinkLabel: 'MAP',
        fallbackImageLabel: 'VEN',
      }}
      toReference={(venue) => ({
        entityType: 'VENUE',
        entityId: venue.id,
        displayName: venue.name,
        external: true,
      })}
    />
  );
};
