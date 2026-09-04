import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import { styles } from './OnboardingShell.styles';

interface OnboardingPlaceholderStepProps {
  title: string;
  config: OnboardingPersonaConfig;
  confirmed: boolean;
  showError: boolean;
  onChange: (confirmed: boolean) => void;
}

export const OnboardingPlaceholderStep: React.FC<OnboardingPlaceholderStepProps> = ({
  title,
  config,
  confirmed,
  showError,
  onChange,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.placeholderPanel}>
      <Text style={[styles.placeholderEyebrow, { color: config.accentEnd ?? config.accentStart }]}>
        DEVELOPMENT PLACEHOLDER
      </Text>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderBody}>
        Final profile fields will replace this panel. This temporary control exercises shared
        validation, autosave, completion, resume, and route behavior without inventing product fields.
      </Text>

      <Pressable
        style={[
          styles.confirmationControl,
          focused && { borderColor: config.accentStart },
          showError && styles.confirmationControlError,
        ]}
        onPress={() => onChange(!confirmed)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityRole="checkbox"
        accessibilityLabel="Framework placeholder is ready"
        accessibilityHint="Temporary required control used to exercise onboarding behavior"
        accessibilityState={{ checked: confirmed }}
      >
        <View style={[styles.checkbox, confirmed && { borderColor: config.accentStart }]}>
          {confirmed ? <OnboardingAccentFill config={config} style={styles.accentFill} /> : null}
          <Text style={styles.checkboxMark}>{confirmed ? '✓' : ''}</Text>
        </View>
        <View style={styles.confirmationCopy}>
          <Text style={styles.confirmationLabel}>FRAMEWORK STEP READY *</Text>
          <Text style={styles.confirmationHelp}>Required temporarily to enable Continue.</Text>
        </View>
      </Pressable>
      {showError ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          Confirm this placeholder step before continuing.
        </Text>
      ) : null}
    </View>
  );
};
