import React, { useId } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { OnboardingPersonaConfig } from './onboardingConfig';

interface OnboardingAccentFillProps {
  config: OnboardingPersonaConfig;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const OnboardingAccentFill: React.FC<OnboardingAccentFillProps> = ({
  config,
  style,
  testID,
}) => {
  const gradientId = `onboardingAccent${useId().replace(/:/g, '')}`;

  if (!config.accentEnd) {
    return (
      <View
        testID={testID}
        style={[
          { backgroundColor: config.accentStart },
          { pointerEvents: 'none' } as ViewStyle,
          style,
        ]}
      />
    );
  }

  return (
    <Svg
      testID={testID}
      width="100%"
      height="100%"
      style={[{ pointerEvents: 'none' }, style] as any}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={config.accentStart} />
          <Stop offset="100%" stopColor={config.accentEnd} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
    </Svg>
  );
};
