import React from 'react';
import { Image, Text, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import { styles } from './OnboardingShell.styles';

interface OnboardingHeaderProps {
  config: OnboardingPersonaConfig;
  compact: boolean;
  identity?: {
    displayName: string;
    imageUrl?: string;
  };
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({ config, compact, identity }) => (
  <View style={styles.header}>
    <View style={styles.headerBrandRow}>
      <BrandLogo width={compact ? 152 : 184} height={compact ? 32 : 39} />
      {identity?.imageUrl ? (
        <View style={styles.headerIdentity} accessibilityLabel={`${identity.displayName}, ${config.label}`}>
          <Image
            source={{ uri: identity.imageUrl }}
            style={[styles.headerIdentityImage, compact && styles.headerIdentityImageCompact]}
            resizeMode="cover"
            accessibilityLabel={`${identity.displayName} profile image`}
          />
          <View style={styles.headerIdentityCopy}>
            <Text style={styles.headerIdentityName} numberOfLines={1}>{identity.displayName}</Text>
            <Text style={[styles.headerIdentityPersona, { color: config.accentEnd ?? config.accentStart }]}>
              {config.label}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.personaLabel, { color: config.accentEnd ?? config.accentStart }]}>
          {`${config.label} ONBOARDING`}
        </Text>
      )}
    </View>
    <View style={styles.headerRule}>
      <OnboardingAccentFill config={config} style={styles.accentFill} />
    </View>
  </View>
);
