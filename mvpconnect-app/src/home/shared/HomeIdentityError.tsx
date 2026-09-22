import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { theme } from '../../theme/theme';

interface HomeIdentityErrorProps {
  personaLabel: string;
  retrying: boolean;
  onRetry: () => void;
}

export const HomeIdentityError: React.FC<HomeIdentityErrorProps> = ({
  personaLabel,
  retrying,
  onRetry,
}) => (
  <View style={styles.errorState} accessible accessibilityRole="alert">
    <Text style={styles.errorTitle}>WE COULDN’T LOAD YOUR HOME</Text>
    <Text style={styles.errorBody}>Try again.</Text>
    <Button
      title="RETRY"
      onPress={onRetry}
      loading={retrying}
      disabled={retrying}
      accessibilityLabel={`Retry loading ${personaLabel} Home`}
      style={styles.retry}
      brandTypography
    />
  </View>
);

const styles = StyleSheet.create({
  errorState: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
    padding: 18,
  },
  errorTitle: {
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.displayBold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 0.8,
  },
  errorBody: {
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  retry: {
    alignSelf: 'flex-start',
    minHeight: 48,
    marginTop: 14,
  },
});
