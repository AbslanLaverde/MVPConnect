import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BrandLogo } from '../components/BrandLogo';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useGetOnboardingQuery, useGetSelfAccountQuery } from '../onboarding/onboardingApi';
import { resolveAuthenticatedEntryRoute } from '../onboarding/onboardingRoutes';
import { theme } from '../theme/theme';
import { welcomeStyles } from './WelcomeScreen.styles';
import { resolveAuthenticatedHomeRoute } from '../navigation/authenticatedRoutes';

type Props = StackScreenProps<RootStackParamList, 'Welcome'>;

const welcomeDesktopBackground = require('../../assets/welcome/welcome-background-desktop.png');
const welcomeMobileBackground = require('../../assets/welcome/welcome-background-mobile.png');
const welcomeRevealMark = require('../../assets/branding/mvpconnect-mark-native.png');

export const WELCOME_BACKGROUND_BREAKPOINT = 768;
export type WelcomeBackgroundVariant = 'desktop' | 'mobile';

export const getWelcomeBackgroundVariant = (width: number, height: number): WelcomeBackgroundVariant => (
  width < WELCOME_BACKGROUND_BREAKPOINT || height > width ? 'mobile' : 'desktop'
);

export const getWelcomeRevealMarkSize = (width: number, compact: boolean): number => (
  compact
    ? Math.max(112, Math.min(width * 0.32, 144))
    : Math.max(200, Math.min(width * 0.14, 280))
);

export const WELCOME_TRANSITION_TIMING = {
  logoDelayMs: 400,
  logoFadeInMs: 1100,
  logoHoldMs: 900,
  logoFadeOutMs: 1000,
  finalFadeInMs: 800,
} as const;

const BrandGradient = () => (
  <Svg width="100%" height="100%" style={welcomeStyles.brandGradient}>
    <Defs>
      <LinearGradient id="welcomeBrandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={theme.colors.brandBlue} />
        <Stop offset="100%" stopColor={theme.colors.brandViolet} />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#welcomeBrandGradient)" />
  </Svg>
);

const WelcomeBackground = ({ variant }: { variant: WelcomeBackgroundVariant }) => (
  <View
    testID="welcome-background"
    style={welcomeStyles.background}
    aria-hidden
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    pointerEvents="none"
  >
    <Image
      testID={`welcome-background-${variant}`}
      source={variant === 'mobile' ? welcomeMobileBackground : welcomeDesktopBackground}
      style={welcomeStyles.backgroundImage}
      resizeMode="cover"
      accessible={false}
    />
  </View>
);

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const backgroundVariant = getWelcomeBackgroundVariant(width, height);
  const compact = backgroundVariant === 'mobile';
  const compactHeight = height < 700;
  const revealMarkSize = getWelcomeRevealMarkSize(width, compact);
  const selfQuery = useGetSelfAccountQuery();
  const onboardingQuery = useGetOnboardingQuery(undefined, { refetchOnMountOrArgChange: true });
  const introOpacity = useRef(new Animated.Value(0)).current;
  const finalOpacity = useRef(new Animated.Value(0)).current;
  const [motionPreferenceLoaded, setMotionPreferenceLoaded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [finalReady, setFinalReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!active) return;
      setReduceMotion(enabled);
      setMotionPreferenceLoaded(true);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
      setMotionPreferenceLoaded(true);
    });
    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (onboardingQuery.isLoading || onboardingQuery.isFetching || !onboardingQuery.data) return;
    if (onboardingQuery.data.status === 'COMPLETED') return;
    const destination = resolveAuthenticatedEntryRoute(onboardingQuery.data);
    if (destination.screen === 'onboarding') {
      navigation.replace('Onboarding', {
        persona: destination.persona,
        step: destination.step,
      });
    }
  }, [navigation, onboardingQuery.data, onboardingQuery.isFetching, onboardingQuery.isLoading]);

  useEffect(() => {
    if (!motionPreferenceLoaded) return undefined;
    introOpacity.stopAnimation();
    finalOpacity.stopAnimation();
    if (reduceMotion) {
      introOpacity.setValue(0);
      finalOpacity.setValue(1);
      setFinalReady(true);
      return undefined;
    }

    setFinalReady(false);
    introOpacity.setValue(0);
    finalOpacity.setValue(0);
    const sequence = Animated.sequence([
      Animated.delay(WELCOME_TRANSITION_TIMING.logoDelayMs),
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: WELCOME_TRANSITION_TIMING.logoFadeInMs,
        useNativeDriver: true,
      }),
      Animated.delay(WELCOME_TRANSITION_TIMING.logoHoldMs),
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: WELCOME_TRANSITION_TIMING.logoFadeOutMs,
        useNativeDriver: true,
      }),
      Animated.timing(finalOpacity, {
        toValue: 1,
        duration: WELCOME_TRANSITION_TIMING.finalFadeInMs,
        useNativeDriver: true,
      }),
    ]);
    sequence.start(({ finished }) => {
      if (finished) setFinalReady(true);
    });
    return () => sequence.stop();
  }, [finalOpacity, introOpacity, motionPreferenceLoaded, reduceMotion]);

  const onboardingComplete = onboardingQuery.data?.status === 'COMPLETED';
  const enterDisabled = !finalReady
    || selfQuery.isLoading
    || onboardingQuery.isLoading
    || onboardingQuery.isFetching
    || !selfQuery.data
    || !onboardingComplete;
  const enter = () => {
    if (enterDisabled || !selfQuery.data) return;
    const home = resolveAuthenticatedHomeRoute({
      id: selfQuery.data.id,
      displayName: selfQuery.data.displayName,
      persona: selfQuery.data.persona,
    });
    navigation.replace(home.name);
  };

  return (
    <View style={welcomeStyles.screen}>
      <Animated.View
        testID="welcome-intro"
        style={[welcomeStyles.intro, { opacity: introOpacity }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          testID="welcome-reveal-mark"
          source={welcomeRevealMark}
          style={{ width: revealMarkSize, height: revealMarkSize }}
          resizeMode="contain"
          accessible={false}
        />
      </Animated.View>

      <Animated.View
        testID="welcome-final"
        style={[welcomeStyles.finalScene, { opacity: finalOpacity }]}
        pointerEvents={finalReady ? 'auto' : 'none'}
        accessibilityElementsHidden={!finalReady}
        importantForAccessibility={finalReady ? 'auto' : 'no-hide-descendants'}
      >
        <WelcomeBackground variant={backgroundVariant} />
        <View style={[
          welcomeStyles.center,
          compact && welcomeStyles.centerMobile,
          compactHeight && welcomeStyles.centerShort,
        ]}>
          <View style={welcomeStyles.logoWrap}>
            <BrandLogo width={compact ? 220 : 340} height={compact ? 47 : 72} />
          </View>
          <View style={welcomeStyles.rule}><BrandGradient /></View>
          <Text accessibilityRole="header" style={[welcomeStyles.heading, compact && welcomeStyles.headingMobile]}>
            ONBOARDING COMPLETE.
          </Text>
          <Text style={[welcomeStyles.subtitle, compact && welcomeStyles.subtitleMobile]}>
            Welcome to MVPConnect.
          </Text>
          <Pressable
            style={({ pressed }) => [
              welcomeStyles.enterButton,
              pressed && welcomeStyles.enterPressed,
              enterDisabled && welcomeStyles.enterDisabled,
            ]}
            onPress={enter}
            disabled={enterDisabled}
            accessibilityRole="button"
            accessibilityLabel="Enter MVPConnect"
            accessibilityState={{ disabled: enterDisabled, busy: selfQuery.isLoading }}
          >
            <BrandGradient />
            <View style={welcomeStyles.enterButtonSurface} pointerEvents="none" />
            <Text style={welcomeStyles.enterText}>ENTER →</Text>
          </Pressable>
          {selfQuery.isError || onboardingQuery.isError ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading account"
              onPress={() => {
                if (selfQuery.isError) void selfQuery.refetch();
                if (onboardingQuery.isError) void onboardingQuery.refetch();
              }}
            >
              <Text style={welcomeStyles.loadError}>WE COULDN'T LOAD YOUR ACCOUNT. RETRY →</Text>
            </Pressable>
          ) : null}
          <Text style={[welcomeStyles.tagline, compact && welcomeStyles.taglineMobile]}>
            MUSIC  PEOPLE  PLACES  OPPORTUNITIES
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};
