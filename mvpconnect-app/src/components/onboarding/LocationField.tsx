import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TextField } from './TextField';
import { fieldStyles } from './OnboardingFields.styles';

export interface LocationValue {
  displayName: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  neighborhood?: string | null;
  placeId?: string | null;
}

export interface LocationSuggestionProvider {
  search(query: string): Promise<readonly LocationValue[]>;
  resolve?(suggestion: LocationValue): Promise<LocationValue>;
}

export interface LocationFieldProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  provider?: LocationSuggestionProvider;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  minimumQueryLength?: number;
  suggestionDelayMs?: number;
  mode?: 'search' | 'city' | 'address';
  focusColor?: string;
  focusGradientColors?: readonly [string, string];
  onSuggestionActivityChange?: (active: boolean) => void;
  fieldErrors?: Partial<Record<
    'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode' | 'country' | 'neighborhood',
    string
  >>;
}

export const EMPTY_LOCATION: LocationValue = {
  displayName: '',
  city: '',
  state: '',
  country: '',
};

export const LocationField: React.FC<LocationFieldProps> = ({
  value,
  onChange,
  provider,
  label = 'CITY / STATE',
  required = false,
  disabled = false,
  helperText = 'Start with a city and state. Location suggestions can be connected later.',
  error,
  minimumQueryLength = 2,
  suggestionDelayMs = 300,
  mode = 'search',
  focusColor,
  focusGradientColors,
  onSuggestionActivityChange,
  fieldErrors = {},
}) => {
  const [suggestions, setSuggestions] = useState<readonly LocationValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [providerError, setProviderError] = useState<string>();
  const resolvedQuery = useRef<string>();
  const structuredQueryEdited = useRef(false);
  const searchQuery = mode === 'search'
    ? value.displayName
    : mode === 'address'
      ? value.addressLine1 ?? ''
      : value.city;
  const suggestionsActive = loading || suggestions.length > 0;

  useEffect(() => {
    onSuggestionActivityChange?.(suggestionsActive);
  }, [onSuggestionActivityChange, suggestionsActive]);

  useEffect(() => () => {
    onSuggestionActivityChange?.(false);
  }, [onSuggestionActivityChange]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (
      !provider
      || (mode !== 'search' && !structuredQueryEdited.current)
      || query.length < minimumQueryLength
      || query === resolvedQuery.current
    ) {
      setSuggestions([]);
      setLoading(false);
      setProviderError(undefined);
      return;
    }

    let current = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setProviderError(undefined);
      try {
        const nextSuggestions = await provider.search(query);
        if (current) setSuggestions(nextSuggestions);
      } catch {
        if (current) {
          setSuggestions([]);
          setProviderError('Location suggestions are unavailable. You can keep typing.');
        }
      } finally {
        if (current) setLoading(false);
      }
    }, suggestionDelayMs);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [minimumQueryLength, provider, searchQuery, suggestionDelayMs]);

  const updateDisplayName = (displayName: string) => {
    resolvedQuery.current = undefined;
    onSuggestionActivityChange?.(
      Boolean(provider) && displayName.trim().length >= minimumQueryLength,
    );
    onChange({
      displayName,
      city: '',
      state: '',
      country: '',
      neighborhood: value.neighborhood,
    });
  };

  const selectSuggestion = async (suggestion: LocationValue) => {
    setSuggestions([]);
    setLoading(true);
    setProviderError(undefined);
    try {
      const resolved = provider?.resolve
        ? await provider.resolve(suggestion)
        : suggestion;
      resolvedQuery.current = (
        mode === 'search'
          ? resolved.displayName
          : mode === 'address'
            ? resolved.addressLine1 ?? ''
            : resolved.city
      ).trim();
      structuredQueryEdited.current = false;
      onChange({
        ...resolved,
        neighborhood: resolved.neighborhood ?? value.neighborhood,
      });
    } catch {
      setProviderError('Location suggestions are unavailable. You can enter the location manually.');
    } finally {
      setLoading(false);
    }
  };

  const structuredDisplayName = (next: LocationValue) => {
    const address = mode === 'address' ? next.addressLine1?.trim() : '';
    const locality = [next.city.trim(), next.state.trim()].filter(Boolean).join(', ');
    const postalCode = mode === 'address' ? next.postalCode?.trim() : '';
    return [address, [locality, postalCode].filter(Boolean).join(' '), next.country.trim()]
      .filter(Boolean)
      .join(', ');
  };

  const updateStructuredField = (
    key: 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode' | 'country' | 'neighborhood',
    nextValue: string,
  ) => {
    const editsSearchQuery = (mode === 'city' && key === 'city')
      || (mode === 'address' && key === 'addressLine1');
    if (editsSearchQuery) {
      resolvedQuery.current = undefined;
      structuredQueryEdited.current = true;
      onSuggestionActivityChange?.(
        Boolean(provider) && nextValue.trim().length >= minimumQueryLength,
      );
    }
    const next: LocationValue = {
      ...value,
      [key]: nextValue,
      latitude: null,
      longitude: null,
      placeId: null,
    };
    next.displayName = structuredDisplayName(next);
    onChange(next);
  };

  const suggestionList = suggestions.length > 0 ? (
    <View style={fieldStyles.locationSuggestions} accessibilityRole="list">
      {suggestions.map((suggestion) => (
        <TouchableOpacity
          key={suggestion.placeId ?? `${suggestion.displayName}:${suggestion.latitude ?? ''}`}
          style={fieldStyles.locationSuggestion}
          onPress={() => void selectSuggestion(suggestion)}
          accessibilityRole="button"
          accessibilityLabel={`Use location ${suggestion.displayName}`}
        >
          <Text style={fieldStyles.locationSuggestionText}>{suggestion.displayName}</Text>
        </TouchableOpacity>
      ))}
      <Text
        style={fieldStyles.locationAttribution}
        numberOfLines={1}
        accessibilityLabel="Google Maps"
      >
        Google Maps
      </Text>
    </View>
  ) : null;

  const providerStatus = (
    <>
      {loading ? (
        <Text style={fieldStyles.statusText} accessibilityLiveRegion="polite">
          FINDING LOCATIONS…
        </Text>
      ) : null}
      {providerError ? (
        <Text style={fieldStyles.error} accessibilityRole="alert">
          {providerError}
        </Text>
      ) : null}
    </>
  );

  if (mode !== 'search') {
    return (
      <View>
        {mode === 'address' ? (
          <>
            <TextField
              label="STREET ADDRESS"
              required
              value={value.addressLine1 ?? ''}
              onChangeText={(next) => updateStructuredField('addressLine1', next)}
              error={fieldErrors.addressLine1}
              disabled={disabled}
              focusColor={focusColor}
              focusGradientColors={focusGradientColors}
              autoCapitalize="words"
              accessibilityLabel="Street address, required"
            />
            {suggestionList}
            {providerStatus}
            <TextField
              label="ADDRESS LINE 2"
              optional
              value={value.addressLine2 ?? ''}
              onChangeText={(next) => updateStructuredField('addressLine2', next)}
              error={fieldErrors.addressLine2}
              disabled={disabled}
              focusColor={focusColor}
              focusGradientColors={focusGradientColors}
              placeholder="Suite, floor, etc."
              autoCapitalize="words"
              accessibilityLabel="Address line 2, optional"
            />
          </>
        ) : null}
        <View style={fieldStyles.locationFieldRow}>
          <TextField
            label="CITY"
            required
            value={value.city}
            onChangeText={(next) => updateStructuredField('city', next)}
            error={fieldErrors.city}
            disabled={disabled}
            focusColor={focusColor}
            focusGradientColors={focusGradientColors}
            containerStyle={fieldStyles.locationFieldGrow}
            autoCapitalize="words"
            accessibilityLabel="City, required"
          />
          <TextField
            label="STATE"
            required
            value={value.state}
            onChangeText={(next) => updateStructuredField('state', next)}
            error={fieldErrors.state}
            disabled={disabled}
            focusColor={focusColor}
            focusGradientColors={focusGradientColors}
            containerStyle={fieldStyles.locationFieldCompact}
            autoCapitalize="characters"
            accessibilityLabel="State, required"
          />
        </View>
        {mode === 'city' ? suggestionList : null}
        {mode === 'city' ? providerStatus : null}
        {mode === 'address' ? (
          <TextField
            label="POSTAL CODE"
            optional
            value={value.postalCode ?? ''}
            onChangeText={(next) => updateStructuredField('postalCode', next)}
            error={fieldErrors.postalCode}
            disabled={disabled}
            focusColor={focusColor}
            focusGradientColors={focusGradientColors}
            autoCapitalize="characters"
            accessibilityLabel="Postal code, optional"
          />
        ) : null}
        <TextField
          label="COUNTRY"
          required
          value={value.country}
          onChangeText={(next) => updateStructuredField('country', next)}
          error={fieldErrors.country ?? error}
          disabled={disabled}
          focusColor={focusColor}
          focusGradientColors={focusGradientColors}
          autoCapitalize="words"
          accessibilityLabel="Country, required"
        />
        <TextField
          label="NEIGHBORHOOD"
          optional
          value={value.neighborhood ?? ''}
          onChangeText={(next) => updateStructuredField('neighborhood', next)}
          error={fieldErrors.neighborhood}
          disabled={disabled}
          focusColor={focusColor}
          focusGradientColors={focusGradientColors}
          helperText="Optional. Useful when a neighborhood adds local context."
          autoCapitalize="words"
          accessibilityLabel="Neighborhood, optional"
        />
      </View>
    );
  }

  return (
    <View>
      <TextField
        label={label}
        required={required}
        optional={!required}
        value={value.displayName}
        onChangeText={updateDisplayName}
        disabled={disabled}
        helperText={helperText}
        error={error}
        autoCapitalize="words"
        autoCorrect={false}
        focusColor={focusColor}
        focusGradientColors={focusGradientColors}
        accessibilityLabel={`${label}, ${required ? 'required' : 'optional'}`}
      />
      {providerStatus}
      {suggestionList}
      <TextField
        label="NEIGHBORHOOD"
        optional
        value={value.neighborhood ?? ''}
        onChangeText={(neighborhood) => onChange({ ...value, neighborhood })}
        disabled={disabled}
        helperText="Optional. Useful when a neighborhood adds local context."
        autoCapitalize="words"
        focusColor={focusColor}
        focusGradientColors={focusGradientColors}
        accessibilityLabel="Neighborhood, optional"
      />
    </View>
  );
};
