import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { OnboardingPersonaConfig } from '../../onboarding/onboardingConfig';
import {
  emptyMarketLocation,
  marketIdentity,
  marketsAreSame,
  MAX_ADDITIONAL_MARKETS,
} from '../../onboarding/onboardingBookingNetwork';
import type { OnboardingLocationData } from '../../onboarding/onboardingStepOne';
import type { LocationSuggestionProvider, LocationValue } from './LocationField';
import { LocationField } from './LocationField';
import { FieldFrame } from './FieldFrame';
import { fieldStyles } from './OnboardingFields.styles';

export interface MarketListInputProps {
  label: string;
  helperText?: string;
  value: readonly OnboardingLocationData[];
  onChange: (value: OnboardingLocationData[]) => void;
  provider?: LocationSuggestionProvider;
  accentConfig: OnboardingPersonaConfig;
  disabled?: boolean;
  error?: string;
  showCounter?: boolean;
}

const conciseMarketName = (market: OnboardingLocationData): string =>
  [market.city, market.state].filter(Boolean).join(', ') || market.displayName;

export const MarketListInput: React.FC<MarketListInputProps> = ({
  label,
  helperText,
  value,
  onChange,
  provider,
  accentConfig,
  disabled = false,
  error,
  showCounter = true,
}) => {
  const [draft, setDraft] = useState<OnboardingLocationData>(emptyMarketLocation);
  const [duplicateError, setDuplicateError] = useState<string>();
  const atLimit = value.length >= MAX_ADDITIONAL_MARKETS;

  const handleDraftChange = (next: LocationValue) => {
    const nextDraft: OnboardingLocationData = {
      displayName: next.displayName,
      addressLine1: next.addressLine1 ?? null,
      addressLine2: next.addressLine2 ?? null,
      city: next.city,
      state: next.state,
      postalCode: next.postalCode ?? null,
      country: next.country,
      latitude: next.latitude ?? null,
      longitude: next.longitude ?? null,
      neighborhood: next.neighborhood ?? null,
      placeId: next.placeId ?? null,
    };
    setDraft(nextDraft);
    setDuplicateError(undefined);
    const resolved = Boolean(
      nextDraft.displayName.trim()
      && nextDraft.city.trim()
      && nextDraft.state.trim()
      && nextDraft.country.trim(),
    );
    if (!resolved || atLimit) return;
    if (value.some((market) => marketsAreSame(market, nextDraft))) {
      setDuplicateError('That market is already in your list.');
      setDraft(emptyMarketLocation());
      return;
    }
    onChange([...value, nextDraft]);
    setDraft(emptyMarketLocation());
  };

  return (
    <FieldFrame
      label={label}
      optional
      helperText={helperText}
      helperBefore
      error={duplicateError ?? error}
      headerAccessory={showCounter ? (
        <Text style={fieldStyles.selectionCounter}>{`${value.length} / ${MAX_ADDITIONAL_MARKETS}`}</Text>
      ) : undefined}
    >
      <LocationField
        label="SEARCH FOR A CITY / MARKET"
        value={draft}
        onChange={handleDraftChange}
        provider={provider}
        disabled={disabled || atLimit}
        mode="search"
        helperText={atLimit ? 'Remove a market before adding another.' : ''}
        focusColor={accentConfig.accentStart}
        focusGradientColors={accentConfig.accentEnd
          ? [accentConfig.accentStart, accentConfig.accentEnd]
          : undefined}
        showNeighborhood={false}
      />
      <View style={fieldStyles.marketList} accessibilityRole="list">
        {value.map((market, index) => {
          const name = conciseMarketName(market);
          return (
            <View
              key={`${marketIdentity(market)}:${index}`}
              style={[fieldStyles.marketEntry, { borderColor: accentConfig.accentStart }]}
            >
              <Text style={fieldStyles.marketName}>{name}</Text>
              <TouchableOpacity
                style={fieldStyles.marketRemove}
                onPress={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${name}`}
                accessibilityState={{ disabled }}
              >
                <Text style={fieldStyles.marketRemoveText}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </FieldFrame>
  );
};
