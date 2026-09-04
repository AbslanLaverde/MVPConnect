import React, { useState } from 'react';
import { NativeSyntheticEvent, TextInputFocusEventData } from 'react-native';
import { TextField, TextFieldProps } from './TextField';

export interface UrlFieldProps extends Omit<
  TextFieldProps,
  'value' | 'defaultValue' | 'onChange' | 'onChangeText' | 'keyboardType' | 'autoCapitalize' | 'autoCorrect'
> {
  value: string;
  onChange: (value: string) => void;
  normalizeOnBlur?: boolean;
}

export const normalizeHttpUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;
  return /^[^\s/]+\.[^\s/]{2,}(?:\/.*)?$/.test(trimmed) ? `https://${trimmed}` : trimmed;
};

export const validateUrlValue = (value: string, required = false): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'This field is required.' : undefined;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? undefined
      : 'Enter a valid URL beginning with http:// or https://.';
  } catch {
    return 'Enter a valid URL beginning with http:// or https://.';
  }
};

export const UrlField: React.FC<UrlFieldProps> = ({
  value,
  onChange,
  normalizeOnBlur = false,
  required,
  error,
  onBlur,
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const localError = touched ? validateUrlValue(value, required) : undefined;

  const handleBlur = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setTouched(true);
    if (normalizeOnBlur) {
      const normalized = normalizeHttpUrl(value);
      if (normalized !== value) onChange(normalized);
    }
    onBlur?.(event);
  };

  return (
    <TextField
      {...props}
      required={required}
      value={value}
      onChangeText={onChange}
      onBlur={handleBlur}
      keyboardType="url"
      autoCapitalize="none"
      autoCorrect={false}
      error={error ?? localError}
    />
  );
};
