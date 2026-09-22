import React, { useId } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '../../theme/theme';
import { HOME_MOBILE_BREAKPOINT } from './HomeShell';

export const getGreetingForHour = (hour: number): string => {
  const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24;
  if (normalizedHour >= 5 && normalizedHour < 12) return 'GOOD MORNING';
  if (normalizedHour >= 12 && normalizedHour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
};

export const getDisplayInitials = (displayName?: string): string => {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return 'A';
  return words.slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase();
};

interface HomeHeaderProps {
  contextLabel: string;
  greeting: string;
  displayName?: string;
  profileImageUrl?: string;
  supportingCopy: string;
  loading?: boolean;
  accentStart?: string;
  accentEnd?: string;
}

const AccentRule = ({ start, end }: { start: string; end: string }) => {
  const gradientId = `homeHeaderAccent${useId().replace(/:/g, '')}`;
  return (
    <View style={styles.accentRule} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={start} />
            <Stop offset="100%" stopColor={end} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
};

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  contextLabel,
  greeting,
  displayName,
  profileImageUrl,
  supportingCopy,
  loading = false,
  accentStart = theme.personas.artist.accentStart,
  accentEnd = theme.personas.artist.accentEnd,
}) => {
  const { width } = useWindowDimensions();
  const mobile = width < HOME_MOBILE_BREAKPOINT;
  const heading = displayName ? `${greeting}, ${displayName}` : greeting;

  return (
    <View style={[styles.header, mobile && styles.headerMobile]}>
      <View style={[styles.headerRow, mobile && styles.headerRowMobile]}>
        <View style={styles.copy}>
          <Text style={[styles.context, { color: accentStart }]}>{contextLabel}</Text>
          {loading ? (
            <View
              testID="home-identity-loading"
              style={styles.loadingCopy}
              accessible
              accessibilityLabel="Loading Artist identity"
            >
              <View style={[styles.loadingBar, styles.loadingBarWide]} />
              <View style={[styles.loadingBar, styles.loadingBarShort]} />
            </View>
          ) : (
            <Text
              accessibilityRole="header"
              style={[styles.heading, mobile && styles.headingMobile]}
            >
              {heading}
            </Text>
          )}
          <AccentRule start={accentStart} end={accentEnd} />
          <Text style={[styles.supportingCopy, mobile && styles.supportingCopyMobile]}>
            {supportingCopy}
          </Text>
        </View>

        {loading ? (
          <View testID="home-avatar-loading" style={[styles.avatar, mobile && styles.avatarMobile, styles.avatarLoading]} />
        ) : profileImageUrl ? (
          <Image
            testID="artist-home-avatar"
            source={{ uri: profileImageUrl }}
            resizeMode="cover"
            style={[styles.avatar, mobile && styles.avatarMobile]}
            accessible={false}
          />
        ) : (
          <View
            testID="artist-home-avatar-fallback"
            style={[styles.avatar, mobile && styles.avatarMobile, styles.avatarFallback]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={[styles.initials, mobile && styles.initialsMobile]}>
              {getDisplayInitials(displayName)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 26,
    paddingBottom: 8,
  },
  headerMobile: {
    paddingTop: 12,
    paddingBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 32,
  },
  headerRowMobile: {
    gap: 16,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  context: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 2.2,
    marginBottom: 12,
  },
  heading: {
    maxWidth: 920,
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.displayExtraBold,
    fontSize: 58,
    lineHeight: 60,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headingMobile: {
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: 0.2,
  },
  accentRule: {
    width: 76,
    height: 3,
    marginTop: 20,
    marginBottom: 22,
    overflow: 'hidden',
  },
  supportingCopy: {
    maxWidth: 720,
    color: theme.colors.mutedText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: 17,
    lineHeight: 26,
  },
  supportingCopyMobile: {
    fontSize: 15,
    lineHeight: 23,
  },
  avatar: {
    width: 76,
    height: 76,
    borderWidth: 1,
    borderColor: theme.colors.artistBorder,
  },
  avatarMobile: {
    width: 58,
    height: 58,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.elevatedSurface,
  },
  initials: {
    color: theme.colors.brandBlue,
    fontFamily: theme.typography.fontFamily.displayBold,
    fontSize: 30,
    letterSpacing: 1,
  },
  initialsMobile: {
    fontSize: 24,
  },
  avatarLoading: {
    backgroundColor: theme.colors.inputBorder,
  },
  loadingCopy: {
    minHeight: 60,
    justifyContent: 'center',
    gap: 10,
  },
  loadingBar: {
    height: 16,
    backgroundColor: theme.colors.inputBorder,
  },
  loadingBarWide: {
    width: '72%',
    maxWidth: 620,
  },
  loadingBarShort: {
    width: '42%',
    maxWidth: 360,
  },
});
