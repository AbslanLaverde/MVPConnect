import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './OnboardingShell.styles';

interface OnboardingErrorStatusProps {
  title: string;
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
  retryAccessibilityLabel?: string;
}

export const OnboardingErrorStatus: React.FC<OnboardingErrorStatusProps> = ({
  title,
  message = 'Your information is still here.\nPlease try again.',
  onRetry,
  retryLabel = 'TRY AGAIN',
  retryAccessibilityLabel = 'Try again',
}) => (
  <View style={styles.errorPanel} accessibilityRole="alert">
    <Text style={styles.errorTitle}>{title}</Text>
    <Text style={styles.errorMessage}>{message}</Text>
    <TouchableOpacity
      onPress={onRetry}
      style={styles.retryButton}
      accessibilityRole="button"
      accessibilityLabel={retryAccessibilityLabel}
    >
      <Text style={styles.retryButtonText}>{retryLabel}</Text>
    </TouchableOpacity>
  </View>
);
