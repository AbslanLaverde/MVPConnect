import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TextField } from './TextField';
import { fieldStyles } from './OnboardingFields.styles';

export interface LocationValue {
  displayName: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
  placeId?: string;
}

export interface LocationSuggestionProvider {
  search(query: string): Promise<readonly LocationValue[]>;
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
}) => {
  const [suggestions, setSuggestions] = useState<readonly LocationValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [providerError, setProviderError] = useState<string>();
  const resolvedDisplayName = useRef<string>();

  useEffect(() => {
    const query = value.displayName.trim();
    if (!provider || query.length < minimumQueryLength || query === resolvedDisplayName.current) {
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
  }, [minimumQueryLength, provider, suggestionDelayMs, value.displayName]);

  const updateDisplayName = (displayName: string) => {
    resolvedDisplayName.current = undefined;
    onChange({
      displayName,
      city: '',
      state: '',
      country: '',
      neighborhood: value.neighborhood,
    });
  };

  const selectSuggestion = (suggestion: LocationValue) => {
    resolvedDisplayName.current = suggestion.displayName.trim();
    setSuggestions([]);
    onChange({
      ...suggestion,
      neighborhood: suggestion.neighborhood ?? value.neighborhood,
    });
  };

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
        accessibilityLabel={`${label}, ${required ? 'required' : 'optional'}`}
      />
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
      {suggestions.length > 0 ? (
        <View style={fieldStyles.locationSuggestions} accessibilityRole="list">
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.placeId ?? `${suggestion.displayName}:${suggestion.latitude ?? ''}`}
              style={fieldStyles.locationSuggestion}
              onPress={() => selectSuggestion(suggestion)}
              accessibilityRole="button"
              accessibilityLabel={`Use location ${suggestion.displayName}`}
            >
              <Text style={fieldStyles.locationSuggestionText}>{suggestion.displayName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <TextField
        label="NEIGHBORHOOD"
        optional
        value={value.neighborhood ?? ''}
        onChangeText={(neighborhood) => onChange({ ...value, neighborhood })}
        disabled={disabled}
        helperText="Optional. Useful when a neighborhood adds local context."
        autoCapitalize="words"
        accessibilityLabel="Neighborhood, optional"
      />
    </View>
  );
};
