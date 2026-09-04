import React, { useEffect, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';
import { useGetOnboardingQuery } from './onboardingApi';
import {
  ONBOARDING_CONFIG,
  ONBOARDING_PLACEHOLDER_SAVE_BYPASS,
} from './onboardingConfig';
import { resolveOnboardingRoute } from './onboardingRoutes';
import { OnboardingHeader } from './OnboardingHeader';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingStepSession } from './OnboardingStepSession';
import { styles } from './OnboardingShell.styles';

type Props = StackScreenProps<RootStackParamList, 'Onboarding'>;

const LoadingState = () => (
  <View style={styles.statePage} accessibilityLabel="Loading onboarding">
    <View style={styles.statePanel}>
      <Text style={styles.stateEyebrow}>MVPConnect / ONBOARDING</Text>
      <Text style={styles.stateHeading}>LOADING YOUR ONBOARDING…</Text>
      <View style={styles.loadingBar} />
      <View style={[styles.loadingBar, styles.loadingBarShort]} />
    </View>
  </View>
);

export const OnboardingShell: React.FC<Props> = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = width < 768;
  const { data, isLoading, isFetching, isError, refetch } = useGetOnboardingQuery();

  const resolvedRoute = useMemo(
    () => data
      ? resolveOnboardingRoute(
        data,
        route.params.persona,
        route.params.step,
        ONBOARDING_PLACEHOLDER_SAVE_BYPASS,
      )
      : undefined,
    [data, route.params.persona, route.params.step],
  );

  useEffect(() => {
    if (!resolvedRoute?.shouldRedirect) return;
    navigation.replace('Onboarding', {
      persona: resolvedRoute.persona,
      step: resolvedRoute.step,
    });
  }, [navigation, resolvedRoute]);

  if (isLoading) return <LoadingState />;

  if (isError || !data) {
    return (
      <View style={styles.statePage} accessibilityRole="alert">
        <View style={styles.statePanel}>
          <Text style={styles.stateEyebrow}>MVPConnect / ONBOARDING</Text>
          <Text style={styles.stateHeading}>WE COULDN'T LOAD YOUR ONBOARDING.</Text>
          <Text style={styles.stateMessage}>Check your connection, then try again.</Text>
          <TouchableOpacity
            style={styles.loadRetry}
            onPress={() => refetch()}
            disabled={isFetching}
            accessibilityRole="button"
            accessibilityLabel="Try loading onboarding again"
            accessibilityState={{ disabled: isFetching, busy: isFetching }}
          >
            <Text style={styles.loadRetryText}>{isFetching ? 'LOADING…' : 'TRY AGAIN →'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (data.status === 'COMPLETED' || data.steps.length === 0) {
    return (
      <View style={styles.statePage}>
        <View style={styles.statePanel}>
          <Text style={styles.stateEyebrow}>MVPConnect / ONBOARDING</Text>
          <Text style={styles.stateHeading}>NO ACTIVE ONBOARDING DRAFT.</Text>
          <Text style={styles.stateMessage}>
            This account has already moved beyond the editable onboarding flow.
          </Text>
        </View>
      </View>
    );
  }

  if (!resolvedRoute || resolvedRoute.shouldRedirect) return <LoadingState />;

  const step = data.steps.find((candidate) => candidate.key === resolvedRoute.step);
  const config = ONBOARDING_CONFIG[resolvedRoute.persona];
  if (!step) return <LoadingState />;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
    >
      <ScrollView
        style={styles.page}
        contentContainerStyle={[
          styles.scrollContent,
          mobile && styles.scrollContentMobile,
          { paddingTop: Math.max(insets.top, theme.spacing.md) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageFrame}>
          <OnboardingHeader config={config} compact={mobile} />
          <OnboardingProgress
            state={data}
            activeStep={step}
            config={config}
            mobile={mobile}
            allowPlaceholderNavigation={ONBOARDING_PLACEHOLDER_SAVE_BYPASS}
            onSelect={(stepKey) => navigation.push('Onboarding', {
              persona: config.persona,
              step: stepKey,
            })}
          />
          <OnboardingStepSession
            key={`${config.persona}:${step.key}`}
            state={data}
            step={step}
            config={config}
            navigation={navigation}
            saveBypass={ONBOARDING_PLACEHOLDER_SAVE_BYPASS}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
