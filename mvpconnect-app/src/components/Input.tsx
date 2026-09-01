import React, { useId, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '../theme/theme';
import { styles } from './Input.styles';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: any;
  brandTypography?: boolean;
  focusColor?: string;
  focusGradientColors?: readonly [string, string];
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  brandTypography = false,
  focusColor = theme.colors.brandBlue,
  focusGradientColors,
  secureTextEntry,
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
          style={[
            styles.input,
            brandTypography && styles.inputBrand,
            Boolean(leftIcon) && styles.inputWithLeftIcon,
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
          ]}
          accessibilityLabel={textInputProps.accessibilityLabel || label}
          placeholderTextColor={theme.colors.disabledText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...textInputProps}
        />
        
        {isPassword && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
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
