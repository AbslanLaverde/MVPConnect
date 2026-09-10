import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { fieldStyles } from './OnboardingFields.styles';

interface FieldFrameProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  helperText?: string;
  helperBefore?: boolean;
  error?: string;
  children: React.ReactNode;
  headerAccessory?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FieldFrame: React.FC<FieldFrameProps> = ({
  label,
  required = false,
  optional = false,
  helperText,
  helperBefore = false,
  error,
  children,
  headerAccessory,
  containerStyle,
}) => (
  <View style={[fieldStyles.fieldGroup, containerStyle]}>
    {label || headerAccessory ? (
      <View style={fieldStyles.labelRow}>
        {label ? (
          <Text style={[fieldStyles.label, fieldStyles.labelInRow]}>
            {label}
            {required ? <Text style={fieldStyles.required}> *</Text> : null}
            {!required && optional ? <Text style={fieldStyles.optional}> OPTIONAL</Text> : null}
          </Text>
        ) : <View />}
        {headerAccessory}
      </View>
    ) : null}
    {helperBefore && helperText ? <Text style={fieldStyles.helperBefore}>{helperText}</Text> : null}
    {children}
    {error ? (
      <Text style={fieldStyles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
        {error}
      </Text>
    ) : !helperBefore && helperText ? (
      <Text style={fieldStyles.helper}>{helperText}</Text>
    ) : null}
  </View>
);
