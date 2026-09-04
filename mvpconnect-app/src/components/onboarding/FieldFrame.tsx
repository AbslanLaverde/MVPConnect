import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { fieldStyles } from './OnboardingFields.styles';

interface FieldFrameProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FieldFrame: React.FC<FieldFrameProps> = ({
  label,
  required = false,
  optional = false,
  helperText,
  error,
  children,
  containerStyle,
}) => (
  <View style={[fieldStyles.fieldGroup, containerStyle]}>
    {label ? (
      <Text style={fieldStyles.label}>
        {label}
        {required ? <Text style={fieldStyles.required}> *</Text> : null}
        {!required && optional ? <Text style={fieldStyles.optional}> OPTIONAL</Text> : null}
      </Text>
    ) : null}
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
