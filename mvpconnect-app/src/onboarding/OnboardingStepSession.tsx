import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, Text, View, useWindowDimensions } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  useCompleteOnboardingStepMutation,
  useReopenOnboardingStepMutation,
  useSaveOnboardingStepMutation,
  useSkipOnboardingStepMutation,
} from './onboardingApi';
import {
  configuredStepFor,
  routePersonaForBackend,
} from './onboardingConfig';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import {
  nextStepFromState,
  previousResolvedStep,
  previousStepFromState,
  resumeStepFromState,
} from './onboardingRoutes';
import type {
  OnboardingSaveStatus as SaveStatus,
  OnboardingState,
  OnboardingStep,
  OnboardingStepData,
} from './onboardingTypes';
import { OnboardingAccentFill } from './OnboardingAccent';
import { OnboardingErrorStatus } from './OnboardingErrorStatus';
import { OnboardingFooter } from './OnboardingFooter';
import { OnboardingPlaceholderStep } from './OnboardingPlaceholderStep';
import { OnboardingSaveStatus } from './OnboardingSaveStatus';
import { isOnboardingStepValid } from './onboardingValidation';
import { styles } from './OnboardingShell.styles';

type OperationKind = 'autosave' | 'complete' | 'skip' | 'reopen';

const PLACEHOLDER_RULES = {
  frameworkConfirmed: { required: true, kind: 'booleanTrue' as const },
};

interface OnboardingStepSessionProps {
  state: OnboardingState;
  step: OnboardingStep;
  config: OnboardingPersonaConfig;
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
  saveBypass?: boolean;
}

const signatureFor = (data: OnboardingStepData) => JSON.stringify(data);

const dataForConfirmation = (
  current: OnboardingStepData,
  confirmed: boolean,
): OnboardingStepData => ({ ...current, frameworkConfirmed: confirmed });

export const OnboardingStepSession: React.FC<OnboardingStepSessionProps> = ({
  state,
  step,
  config,
  navigation,
  saveBypass = false,
}) => {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const [workingData, setWorkingData] = useState<OnboardingStepData>(() => ({ ...step.data }));
  const [persistedSignature, setPersistedSignature] = useState(() => signatureFor(step.data));
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [failedOperation, setFailedOperation] = useState<OperationKind>();
  const attemptedReopenSignature = useRef<string>();
  const savedStatusTimer = useRef<ReturnType<typeof setTimeout>>();
  const latestWorkingSignature = useRef(signatureFor(step.data));
  const headingRef = useRef<Text>(null);

  const [saveStep, saveMutation] = useSaveOnboardingStepMutation();
  const [completeStep, completeMutation] = useCompleteOnboardingStepMutation();
  const [skipStep, skipMutation] = useSkipOnboardingStepMutation();
  const [reopenStep, reopenMutation] = useReopenOnboardingStepMutation();

  const workingSignature = useMemo(() => signatureFor(workingData), [workingData]);
  latestWorkingSignature.current = workingSignature;
  const confirmed = workingData.frameworkConfirmed === true;
  const isValid = isOnboardingStepValid(workingData, PLACEHOLDER_RULES);
  const isDirty = workingSignature !== persistedSignature;
  const busy =
    saveMutation.isLoading ||
    completeMutation.isLoading ||
    skipMutation.isLoading ||
    reopenMutation.isLoading;
  const blockingNavigation =
    completeMutation.isLoading || skipMutation.isLoading || reopenMutation.isLoading;
  const stepConfig = configuredStepFor(config.persona, step.key);
  const previousStep = saveBypass
    ? previousStepFromState(state, step.key)
    : previousResolvedStep(state, step.key);

  const showSavedBriefly = useCallback(() => {
    if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
    setSaveStatus('saved');
    savedStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 1800);
  }, []);

  useEffect(() => () => {
    if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Platform.OS === 'web') {
        (headingRef.current as any)?.focus?.();
      } else {
        const node = findNodeHandle(headingRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [step.key]);

  const navigateFromState = useCallback((nextState: OnboardingState) => {
    const nextPersona = routePersonaForBackend(nextState.persona);
    const nextStep = resumeStepFromState(nextState);
    if (nextPersona !== config.persona || nextStep !== step.key) {
      navigation.push('Onboarding', { persona: nextPersona, step: nextStep });
    }
  }, [config.persona, navigation, step.key]);

  const persistDraft = useCallback(async () => {
    if (saveBypass || !isValid || !isDirty || saveMutation.isLoading) return;

    setFailedOperation(undefined);
    setSaveStatus('saving');
    const submittedSignature = workingSignature;
    try {
      const savedStep = await saveStep({ stepKey: step.key, data: workingData }).unwrap();
      setPersistedSignature(signatureFor(savedStep.data));
      if (submittedSignature === latestWorkingSignature.current) showSavedBriefly();
    } catch {
      setFailedOperation('autosave');
      setSaveStatus('failed');
    }
  }, [
    isDirty,
    isValid,
    saveMutation.isLoading,
    saveBypass,
    saveStep,
    showSavedBriefly,
    step.key,
    workingData,
    workingSignature,
  ]);

  const requestReopen = useCallback(async () => {
    if (saveBypass || reopenMutation.isLoading) return;

    attemptedReopenSignature.current = workingSignature;
    setFailedOperation(undefined);
    setSaveStatus('saving');
    try {
      await reopenStep(step.key).unwrap();
      showSavedBriefly();
    } catch {
      setFailedOperation('reopen');
      setSaveStatus('failed');
    }
  }, [reopenMutation.isLoading, reopenStep, saveBypass, showSavedBriefly, step.key, workingSignature]);

  useEffect(() => {
    const needsReopen =
      !saveBypass &&
      isDirty &&
      (step.status === 'SKIPPED' || (step.status === 'COMPLETE' && !isValid));
    if (needsReopen && attemptedReopenSignature.current !== workingSignature) {
      void requestReopen();
    }
  }, [isDirty, isValid, requestReopen, saveBypass, step.status, workingSignature]);

  useEffect(() => {
    const canAutosave =
      !saveBypass &&
      isValid &&
      isDirty &&
      !busy &&
      step.status !== 'SKIPPED' &&
      failedOperation !== 'reopen';
    if (!canAutosave) return;

    const timer = setTimeout(() => void persistDraft(), 1000);
    return () => clearTimeout(timer);
  }, [busy, failedOperation, isDirty, isValid, persistDraft, saveBypass, step.status, workingSignature]);

  const handleChange = (nextConfirmed: boolean) => {
    setValidationAttempted(true);
    setWorkingData((current) => dataForConfirmation(current, nextConfirmed));
    if (failedOperation && failedOperation !== 'reopen') {
      setFailedOperation(undefined);
      setSaveStatus('idle');
    }
  };

  const handleContinue = useCallback(async () => {
    setValidationAttempted(true);
    const isStillValid = isOnboardingStepValid(workingData, PLACEHOLDER_RULES);
    if (!isStillValid || (!saveBypass && busy)) return;

    if (saveBypass) {
      const nextStep = nextStepFromState(state, step.key);
      if (nextStep) {
        navigation.push('Onboarding', { persona: config.persona, step: nextStep });
      }
      return;
    }

    setFailedOperation(undefined);
    setSaveStatus('saving');
    try {
      const nextState = await completeStep({ stepKey: step.key, data: workingData }).unwrap();
      setPersistedSignature(workingSignature);
      showSavedBriefly();
      navigateFromState(nextState);
    } catch {
      setFailedOperation('complete');
      setSaveStatus('failed');
    }
  }, [
    busy,
    completeStep,
    config.persona,
    navigateFromState,
    navigation,
    saveBypass,
    showSavedBriefly,
    step.key,
    state,
    workingData,
    workingSignature,
  ]);

  const handleSkip = useCallback(async () => {
    if (step.required || (!saveBypass && busy)) return;

    if (saveBypass) {
      const nextStep = nextStepFromState(state, step.key);
      if (nextStep) {
        navigation.push('Onboarding', { persona: config.persona, step: nextStep });
      }
      return;
    }

    setFailedOperation(undefined);
    setSaveStatus('saving');
    try {
      const nextState = await skipStep(step.key).unwrap();
      showSavedBriefly();
      navigateFromState(nextState);
    } catch {
      setFailedOperation('skip');
      setSaveStatus('failed');
    }
  }, [
    busy,
    config.persona,
    navigateFromState,
    navigation,
    saveBypass,
    showSavedBriefly,
    skipStep,
    step.key,
    step.required,
    state,
  ]);

  const handleBack = () => {
    if (!previousStep || (!saveBypass && blockingNavigation)) return;
    if (!saveBypass && isValid && isDirty && step.status !== 'SKIPPED' && !saveMutation.isLoading) {
      void persistDraft();
    }
    navigation.push('Onboarding', { persona: config.persona, step: previousStep });
  };

  const retryFailedOperation = () => {
    switch (failedOperation) {
      case 'complete':
        void handleContinue();
        break;
      case 'skip':
        void handleSkip();
        break;
      case 'reopen':
        attemptedReopenSignature.current = undefined;
        void requestReopen();
        break;
      default:
        void persistDraft();
    }
  };

  return (
    <View style={[styles.main, mobile && styles.mainMobile]}>
      <Text style={[styles.stepMeta, { color: config.accentEnd ?? config.accentStart }]}>
        {`${config.label} / ${step.required ? 'REQUIRED STEP' : 'OPTIONAL STEP'}`}
      </Text>
      <Text
        ref={headingRef}
        accessibilityRole="header"
        // @ts-ignore: tabIndex enables programmatic web focus after route changes.
        tabIndex={-1}
        style={[
          styles.stepHeading,
          mobile && styles.stepHeadingMobile,
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
        ]}
      >
        {stepConfig?.label ?? step.key}
      </Text>
      <View style={styles.headingRule}>
        <OnboardingAccentFill config={config} style={styles.accentFill} />
      </View>

      <OnboardingPlaceholderStep
        title={stepConfig?.placeholderTitle ?? `${config.label} ${step.key} Placeholder`}
        config={config}
        confirmed={confirmed}
        showError={validationAttempted && !isValid}
        onChange={handleChange}
      />

      {state.status === 'READY' ? (
        <View style={styles.readyBanner} accessible accessibilityLabel="Onboarding is ready">
          <Text style={styles.readyText}>ONBOARDING IS READY — FINAL COMPLETION COMES NEXT.</Text>
        </View>
      ) : null}

      <OnboardingSaveStatus status={saveStatus} />
      {failedOperation ? (
        <OnboardingErrorStatus
          title={failedOperation === 'reopen'
            ? "WE COULDN'T UPDATE THIS STEP'S STATUS."
            : "WE COULDN'T SAVE YOUR CHANGES."}
          onRetry={retryFailedOperation}
        />
      ) : null}

      <OnboardingFooter
        config={config}
        mobile={mobile}
        canContinue={isValid}
        busy={!saveBypass && busy}
        backDisabled={!saveBypass && blockingNavigation}
        showBack={Boolean(previousStep)}
        showSkip={!step.required}
        onBack={handleBack}
        onContinue={() => void handleContinue()}
        onSkip={() => void handleSkip()}
      />
    </View>
  );
};
