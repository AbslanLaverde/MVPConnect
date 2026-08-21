import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../theme/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      ...styles[`button_${variant}`],
      ...styles[`button_${size}`],
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    if (disabled) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    return {
      ...styles.text,
      ...styles[`text_${variant}`],
      ...styles[`text_${size}`],
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? theme.colors.white : theme.colors.primaryAccent}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  // Variants
  button_primary: {
    backgroundColor: theme.colors.primaryAccent,
  },
  button_secondary: {
    backgroundColor: theme.colors.secondaryAccent,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primaryAccent,
  },
  button_text: {
    backgroundColor: 'transparent',
  },
  
  // Sizes
  button_small: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 36,
  },
  button_medium: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 48,
  },
  button_large: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 56,
  },
  
  // Text styles
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: theme.colors.white,
  },
  text_secondary: {
    color: theme.colors.white,
  },
  text_outline: {
    color: theme.colors.primaryAccent,
  },
  text_text: {
    color: theme.colors.primaryAccent,
  },
  text_small: {
    fontSize: theme.fontSizes.bodySmall,
  },
  text_medium: {
    fontSize: theme.fontSizes.bodyRegular,
  },
  text_large: {
    fontSize: theme.fontSizes.bodyLarge,
  },
});
