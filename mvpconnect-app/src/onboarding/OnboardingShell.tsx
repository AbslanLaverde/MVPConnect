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
import {
  useGetOnboardingQuery,
  useGetOwnedMediaQuery,
  useGetSelfAccountQuery,
} from './onboardingApi';
import {
  ONBOARDING_CONFIG,
  ONBOARDING_PLACEHOLDER_SAVE_BYPASS,
} from './onboardingConfig';
import { resolveOnboardingRoute } from './onboardingRoutes';
import { OnboardingHeader } from './OnboardingHeader';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingStepSession } from './OnboardingStepSession';
import { styles } from './OnboardingShell.styles';
import { stepOneMediaId } from './onboardingStepOne';

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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = width < 768;
  const { data, isLoading, isFetching, isError, refetch } = useGetOnboardingQuery();
  const selfQuery = useGetSelfAccountQuery();
  const firstStep = data?.steps.find((candidate) => candidate.position === 1);
  const firstStepResolved = firstStep?.status === 'COMPLETE' || firstStep?.status === 'SKIPPED';
  const allowPlaceholderNavigation = ONBOARDING_PLACEHOLDER_SAVE_BYPASS && firstStepResolved;
  const profileMediaId = firstStep ? stepOneMediaId(firstStep.data) : undefined;
  const profileMediaQuery = useGetOwnedMediaQuery(profileMediaId ?? '', { skip: !profileMediaId });

  const resolvedRoute = useMemo(
    () => data
      ? resolveOnboardingRoute(
        data,
        route.params.persona,
        route.params.step,
        allowPlaceholderNavigation,
      )
      : undefined,
    [allowPlaceholderNavigation, data, route.params.persona, route.params.step],
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
      style={[
        styles.keyboardView,
        Platform.OS === 'web' && { height, maxHeight: height },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
    >
      <ScrollView
        testID="onboarding-scroll-view"
        style={[
          styles.page,
          Platform.OS === 'web' && { height, maxHeight: height },
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          mobile && styles.scrollContentMobile,
          { paddingTop: Math.max(insets.top, theme.spacing.md) },
        ]}
        scrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View style={styles.pageFrame}>
          <OnboardingHeader
            config={config}
            compact={mobile}
            identity={step.position > 1 && (profileMediaQuery.data?.url || selfQuery.data?.profileImage?.url)
              ? {
                  displayName: selfQuery.data?.displayName ?? config.label,
                  imageUrl: profileMediaQuery.data?.url ?? selfQuery.data?.profileImage?.url,
                }
              : undefined}
          />
          <OnboardingProgress
            state={data}
            activeStep={step}
            config={config}
            mobile={mobile}
            allowPlaceholderNavigation={allowPlaceholderNavigation}
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
            displayName={selfQuery.data?.displayName}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
