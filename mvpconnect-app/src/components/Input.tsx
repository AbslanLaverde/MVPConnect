import React, { useId, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  StyleProp,
  View,
  ViewStyle,
  TextInput,
  Text,
  TextStyle,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '../theme/theme';
import { styles } from './Input.styles';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  brandTypography?: boolean;
  focusColor?: string;
  focusGradientColors?: readonly [string, string];
  disabled?: boolean;
  readOnly?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required,
  optional,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  brandTypography = false,
  focusColor = theme.colors.brandBlue,
  focusGradientColors,
  disabled = false,
  readOnly = false,
  secureTextEntry,
  editable,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [inputSize, setInputSize] = useState({ width: 0, height: 0 });
  const gradientId = `inputFocusGradient${useId().replace(/:/g, '')}`;

  const isPassword = secureTextEntry;
  const showPassword = isPassword && isPasswordVisible;
  const showGradientFocus =
    isFocused && !error && Boolean(focusGradientColors) && inputSize.width > 0;
  const isEditable = editable !== false && !disabled && !readOnly;
  const fieldState = required ? 'required' : optional ? 'optional' : undefined;
  const resolvedAccessibilityLabel = accessibilityLabel ?? (
    label ? [label, fieldState].filter(Boolean).join(', ') : undefined
  );
  const resolvedAccessibilityHint = error ?? accessibilityHint ?? helperText;

  const handleInputLayout = (event: LayoutChangeEvent) => {
    if (!focusGradientColors) return;
    const { width, height } = event.nativeEvent.layout;
    if (width !== inputSize.width || height !== inputSize.height) {
      setInputSize({ width, height });
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, brandTypography && styles.labelBrand]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
          {!required && optional && <Text style={styles.optional}> OPTIONAL</Text>}
        </Text>
      )}
      
      <View
        onLayout={handleInputLayout}
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          isFocused && !error && { borderColor: focusColor },
          showGradientFocus && { borderColor: 'transparent' },
          Boolean(error) && styles.inputContainerError,
          !isEditable && styles.inputContainerDisabled,
          inputContainerStyle,
        ]}
      >
        {showGradientFocus && focusGradientColors ? (
          <Svg
            width={inputSize.width}
            height={inputSize.height}
            style={[styles.focusGradientBorder, { pointerEvents: 'none' }] as any}
          >
            <Defs>
              <LinearGradient
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2={inputSize.width}
                y2="0"
              >
                <Stop offset="0%" stopColor={focusGradientColors[0]} />
                <Stop offset="100%" stopColor={focusGradientColors[1]} />
              </LinearGradient>
            </Defs>
            <Rect
              x="0.5"
              y="0.5"
              width={inputSize.width - 1}
              height={inputSize.height - 1}
              rx="3"
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="1"
            />
          </Svg>
        ) : null}
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            brandTypography && styles.inputBrand,
            Boolean(leftIcon) && styles.inputWithLeftIcon,
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
            inputStyle,
          ]}
          accessibilityLabel={resolvedAccessibilityLabel}
          accessibilityHint={resolvedAccessibilityHint}
          accessibilityState={{ ...accessibilityState, disabled, readOnly } as any}
          placeholderTextColor={theme.colors.disabledText}
          editable={isEditable}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          secureTextEntry={isPassword && !showPassword}
        />
        
        {isPassword && (
          <TouchableOpacity
            style={[styles.rightIcon, !isEditable && styles.inputContainerDisabled]}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            disabled={!isEditable}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isEditable }}
          >
            <Text style={styles.passwordToggle}>
              {showPassword ? '◉' : '◎'}
            </Text>
          </TouchableOpacity>
        )}
        
        {!isPassword && rightIcon && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>
      
      {error && (
        <Text
          style={[styles.errorText, brandTypography && styles.feedbackTextBrand]}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text style={[styles.helperText, brandTypography && styles.feedbackTextBrand]}>
          {helperText}
        </Text>
      )}
    </View>
  );
};
