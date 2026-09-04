import React from 'react';
import { Text, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import { styles } from './OnboardingShell.styles';

interface OnboardingHeaderProps {
  config: OnboardingPersonaConfig;
  compact: boolean;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({ config, compact }) => (
  <View style={styles.header}>
    <View style={styles.headerBrandRow}>
      <BrandLogo width={compact ? 152 : 184} height={compact ? 32 : 39} />
      <Text style={[styles.personaLabel, { color: config.accentEnd ?? config.accentStart }]}>
        {`${config.label} ONBOARDING`}
      </Text>
    </View>
    <View style={styles.headerRule}>
      <OnboardingAccentFill config={config} style={styles.accentFill} />
    </View>
  </View>
);
