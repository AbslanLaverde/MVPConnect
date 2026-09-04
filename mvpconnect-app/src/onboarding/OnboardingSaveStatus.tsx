import React from 'react';
import { Text, View } from 'react-native';
import { OnboardingSaveStatus as SaveStatus } from './onboardingTypes';
import { styles } from './OnboardingShell.styles';

const STATUS_COPY: Record<Exclude<SaveStatus, 'idle'>, string> = {
  saving: 'SAVING…',
  saved: 'SAVED',
  failed: 'SAVE FAILED',
};

export const OnboardingSaveStatus = ({ status }: { status: SaveStatus }) => {
  if (status === 'idle') return <View style={styles.saveStatusPlaceholder} />;

  return (
    <View style={styles.saveStatusPlaceholder}>
      <Text
        style={[styles.saveStatus, status === 'failed' && styles.saveStatusFailed]}
        accessibilityLiveRegion={status === 'failed' ? 'polite' : 'none'}
      >
        {STATUS_COPY[status]}
      </Text>
    </View>
  );
};
