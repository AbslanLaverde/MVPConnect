import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export interface MenuAccent { start: string; end?: string }

/** Mounted only for a live hover, focus or press; never represents the current route. */
export const MenuInteractionHighlight = ({ accent, pressed }: { accent: MenuAccent; pressed: boolean }) => {
  const gradientId = `menu-interaction-${useId().replace(/:/g, '')}`;
  const paint = accent.end ? `url(#${gradientId})` : accent.start;
  return <View testID="menu-interaction-highlight" style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width="100%" height="100%">
      {accent.end && <Defs><LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={accent.start} /><Stop offset="100%" stopColor={accent.end} />
      </LinearGradient></Defs>}
      <Rect width="100%" height="100%" fill={paint} fillOpacity={pressed ? 0.2 : 0.12} />
      <Rect width="100%" height="100%" fill="none" stroke={paint} strokeWidth={2} />
    </Svg>
  </View>;
};
