import React, { useEffect, useState } from 'react';
import { NativeSyntheticEvent, Text, TextInputFocusEventData } from 'react-native';
import { TextField, TextFieldProps } from './TextField';
import { fieldStyles } from './OnboardingFields.styles';

export interface NumberFieldProps extends Omit<
  TextFieldProps,
  'value' | 'defaultValue' | 'onChange' | 'onChangeText' | 'keyboardType' | 'leftIcon' | 'rightIcon'
> {
  value?: number;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  integerOnly?: boolean;
  prefix?: string;
  suffix?: string;
}

export const validateNumberFieldValue = (
  rawValue: string,
  { required = false, min, max, integerOnly = false }: Pick<
    NumberFieldProps,
    'required' | 'min' | 'max' | 'integerOnly'
  >,
): string | undefined => {
  const trimmed = rawValue.trim();
  if (!trimmed) return required ? 'This field is required.' : undefined;
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return 'Enter a valid number.';
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return 'Enter a valid number.';
  if (integerOnly && !Number.isInteger(parsed)) return 'Enter a whole number.';
  if (min !== undefined && parsed < min) return `Enter a value of ${min} or more.`;
  if (max !== undefined && parsed > max) return `Enter a value of ${max} or less.`;
  return undefined;
};

export const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onChange,
  min,
  max,
  integerOnly = false,
  prefix,
  suffix,
  required,
  error,
  onBlur,
  ...props
}) => {
  const [rawValue, setRawValue] = useState(value === undefined ? '' : String(value));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setRawValue(value === undefined ? '' : String(value));
  }, [value]);

  const localError = touched
    ? validateNumberFieldValue(rawValue, { required, min, max, integerOnly })
    : undefined;

  const handleChange = (nextValue: string) => {
    setRawValue(nextValue);
    if (!nextValue.trim()) {
      onChange(undefined);
      return;
    }
    if (!validateNumberFieldValue(nextValue, { min, max, integerOnly })) {
      onChange(Number(nextValue));
    }
  };

  const handleBlur = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setTouched(true);
    onBlur?.(event);
  };

  return (
    <TextField
      {...props}
      required={required}
      value={rawValue}
      onChangeText={handleChange}
      onBlur={handleBlur}
      keyboardType={integerOnly ? 'number-pad' : 'decimal-pad'}
      error={error ?? localError}
      leftIcon={prefix ? <Text style={fieldStyles.inputAdornment}>{prefix}</Text> : undefined}
      rightIcon={suffix ? <Text style={fieldStyles.inputAdornment}>{suffix}</Text> : undefined}
    />
  );
};
