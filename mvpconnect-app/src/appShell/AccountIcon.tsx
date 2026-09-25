import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import type { BackendPersona } from '../onboarding/onboardingTypes';
import { ONBOARDING_CONFIG, routePersonaForBackend } from '../onboarding/onboardingConfig';
import { theme } from '../theme/theme';
import { styles } from './AuthenticatedApp.styles';

export const AccountIcon = ({ persona }: { persona?: BackendPersona }) => {
  const gradientId = `account-accent-${useId().replace(/:/g, '')}`;
  const presentation = persona ? ONBOARDING_CONFIG[routePersonaForBackend(persona)] : undefined;
  const start = presentation?.accentStart ?? theme.colors.secondaryText;
  const end = presentation?.accentEnd;
  return <View testID="account-trigger-icon" style={styles.accountIcon} pointerEvents="none"
    aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {end && <Defs><LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={start} /><Stop offset="100%" stopColor={end} />
      </LinearGradient></Defs>}
      <G testID="account-icon-glyph" fill="none" stroke={end ? `url(#${gradientId})` : start}
        strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={7} r={3.5} />
        <Path d="M4 21v-2a8 6 0 0 1 16 0v2" />
      </G>
    </Svg>
  </View>;
};
