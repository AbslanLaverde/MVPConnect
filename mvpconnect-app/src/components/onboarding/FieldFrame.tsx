import React from 'react';
import { Text, View } from 'react-native';
import { fieldStyles } from './OnboardingFields.styles';

interface FieldFrameProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
}

export const FieldFrame: React.FC<FieldFrameProps> = ({
  label,
  required = false,
  optional = false,
  helperText,
  error,
  children,
}) => (
  <View style={fieldStyles.fieldGroup}>
    <Text style={fieldStyles.label}>
      {label}
      {required ? <Text style={fieldStyles.required}> *</Text> : null}
      {!required && optional ? <Text style={fieldStyles.optional}> OPTIONAL</Text> : null}
    </Text>
    {children}
    {error ? (
      <Text style={fieldStyles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
        {error}
      </Text>
    ) : helperText ? (
      <Text style={fieldStyles.helper}>{helperText}</Text>
    ) : null}
  </View>
);
