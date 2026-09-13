import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  useCompleteOnboardingMutation,
  useCompleteOnboardingStepMutation,
  useReopenOnboardingStepMutation,
  useSaveOnboardingStepMutation,
} from './onboardingApi';
import { configuredStepFor } from './onboardingConfig';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import type { GoalsStepRequest } from './goalTypes';
import { OnboardingErrorStatus } from './OnboardingErrorStatus';
import { OnboardingFooter } from './OnboardingFooter';
import { OnboardingGoalsForm } from './OnboardingGoalsForm';
import {
  hydrateGoalsData,
  normalizeGoalsForPayload,
  validateGoalsData,
} from './onboardingGoals';
import { previousResolvedStep } from './onboardingRoutes';
import { OnboardingSaveStatus } from './OnboardingSaveStatus';
import { styles } from './OnboardingShell.styles';
import { useOnboardingSignOut } from './useOnboardingSignOut';
import type {
  OnboardingSaveStatus as SaveStatus,
  OnboardingState,
  OnboardingStep,
  OnboardingStepData,
} from './onboardingTypes';

type FailedOperation = 'autosave' | 'save' | 'stepComplete' | 'onboardingComplete' | 'reopen';
type FinishCheckpoint = 'save' | 'step' | 'onboarding';

interface OnboardingRealGoalsSessionProps {
  state: OnboardingState;
  step: OnboardingStep;
  config: OnboardingPersonaConfig;
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
}

const signatureFor = (persona: OnboardingPersonaConfig['persona'], data: GoalsStepRequest) =>
  JSON.stringify(normalizeGoalsForPayload(persona, data));

export const OnboardingRealGoalsSession: React.FC<OnboardingRealGoalsSessionProps> = ({
  state,
  step,
  config,
  navigation,
}) => {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const initialData = useMemo(
    () => hydrateGoalsData(config.persona, step.data),
    [config.persona, step.data],
  );
  const [workingData, setWorkingData] = useState<GoalsStepRequest>(initialData);
  const [persistedSignature, setPersistedSignature] = useState(() => signatureFor(config.persona, initialData));
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [failedOperation, setFailedOperation] = useState<FailedOperation>();
  const [locallyReopened, setLocallyReopened] = useState(step.status !== 'COMPLETE');
  const [finishCheckpoint, setFinishCheckpoint] = useState<FinishCheckpoint>(
    step.status === 'COMPLETE' ? 'onboarding' : 'save',
  );
  const reopenRequest = useRef<Promise<boolean>>();
  const completedEditVersion = useRef(0);
  const graduationStepComplete = useRef(step.status === 'COMPLETE');
  const savedStatusTimer = useRef<ReturnType<typeof setTimeout>>();

  const [saveStep, saveMutation] = useSaveOnboardingStepMutation();
  const [completeStep, completeStepMutation] = useCompleteOnboardingStepMutation();
  const [completeOnboarding, completeOnboardingMutation] = useCompleteOnboardingMutation();
  const [reopenStep, reopenMutation] = useReopenOnboardingStepMutation();

  const workingSignature = useMemo(
    () => signatureFor(config.persona, workingData),
    [config.persona, workingData],
  );
  const isDirty = workingSignature !== persistedSignature;
  const validation = validateGoalsData(config.persona, workingData);
  const busy = saveMutation.isLoading
    || completeStepMutation.isLoading
    || completeOnboardingMutation.isLoading
    || reopenMutation.isLoading;
  const stepStillComplete = (step.status === 'COMPLETE' && !locallyReopened)
    || graduationStepComplete.current;
  const previousStep = previousResolvedStep(state, step.key);
  const stepPresentation = configuredStepFor(config.persona, step.key);

  useEffect(() => () => {
    if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
  }, []);

  const showSavedBriefly = useCallback(() => {
    if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
    setSaveStatus('saved');
    savedStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 1800);
  }, []);

  const requestReopen = useCallback(async (force = false) => {
    if (locallyReopened && !force) return true;
    if (reopenRequest.current) return reopenRequest.current;
    const pending = (async () => {
      setFailedOperation(undefined);
      setSaveStatus('saving');
      try {
        await reopenStep(step.key).unwrap();
        graduationStepComplete.current = false;
        setLocallyReopened(true);
        setFinishCheckpoint('save');
        showSavedBriefly();
        return true;
      } catch {
        setFailedOperation('reopen');
        setSaveStatus('failed');
        return false;
      } finally {
        reopenRequest.current = undefined;
      }
    })();
    reopenRequest.current = pending;
    return pending;
  }, [locallyReopened, reopenStep, showSavedBriefly, step.key]);

  const payload = useCallback((): OnboardingStepData =>
    normalizeGoalsForPayload(config.persona, workingData) as unknown as OnboardingStepData,
  [config.persona, workingData]);

  const persistDraft = useCallback(async () => {
    if (!validation.valid || !isDirty || busy || stepStillComplete) return false;
    setFailedOperation(undefined);
    setSaveStatus('saving');
    const submittedSignature = workingSignature;
    try {
      await saveStep({ stepKey: step.key, data: payload() }).unwrap();
      setPersistedSignature(submittedSignature);
      showSavedBriefly();
      return true;
    } catch {
      setFailedOperation('autosave');
      setSaveStatus('failed');
      return false;
    }
  }, [busy, isDirty, payload, saveStep, showSavedBriefly, step.key, stepStillComplete, validation.valid, workingSignature]);

  const flushValidDraft = useCallback(async () => {
    if (!validation.valid) return false;
    if (stepStillComplete && !(await requestReopen(graduationStepComplete.current))) return false;
    setFailedOperation(undefined);
    setSaveStatus('saving');
    const submittedSignature = workingSignature;
    try {
      await saveStep({ stepKey: step.key, data: payload() }).unwrap();
      setPersistedSignature(submittedSignature);
      setFinishCheckpoint('save');
      showSavedBriefly();
      return true;
    } catch {
      setFailedOperation('autosave');
      setSaveStatus('failed');
      return false;
    }
  }, [payload, requestReopen, saveStep, showSavedBriefly, step.key, stepStillComplete, validation.valid, workingSignature]);

  const signOut = useOnboardingSignOut({
    navigation,
    dirty: isDirty,
    valid: validation.valid,
    persistenceBusy: busy,
    flushValidDraft,
  });

  useEffect(() => {
    if (!validation.valid || !isDirty || busy || signOut.signingOut || stepStillComplete) return;
    const timer = setTimeout(() => void persistDraft(), 1000);
    return () => clearTimeout(timer);
  }, [busy, isDirty, persistDraft, signOut.signingOut, stepStillComplete, validation.valid, workingSignature]);

  const handleFinish = useCallback(async () => {
    setValidationAttempted(true);
    if (!validation.valid || busy) return;

    let checkpoint = finishCheckpoint;
    const payloadData = payload();
    setFailedOperation(undefined);
    setSaveStatus('saving');

    if (checkpoint === 'save') {
      if (stepStillComplete && !(await requestReopen())) return;
      try {
        await saveStep({ stepKey: step.key, data: payloadData }).unwrap();
        setPersistedSignature(workingSignature);
        checkpoint = 'step';
        setFinishCheckpoint('step');
        if (signOut.isSignOutPending()) return;
      } catch {
        setFailedOperation('save');
        setSaveStatus('failed');
        return;
      }
    }

    if (checkpoint === 'step') {
      try {
        await completeStep({ stepKey: step.key, data: payloadData }).unwrap();
        graduationStepComplete.current = true;
        checkpoint = 'onboarding';
        setFinishCheckpoint('onboarding');
        if (signOut.isSignOutPending()) return;
      } catch {
        setFailedOperation('stepComplete');
        setSaveStatus('failed');
        return;
      }
    }

    try {
      await completeOnboarding().unwrap();
      if (signOut.isSignOutPending()) return;
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    } catch {
      setFailedOperation('onboardingComplete');
      setSaveStatus('failed');
    }
  }, [busy, completeOnboarding, completeStep, finishCheckpoint, navigation, payload, requestReopen, saveStep, signOut, step.key, stepStillComplete, validation.valid, workingSignature]);

  const persistCompletedEdit = useCallback(async (nextData: GoalsStepRequest, forceReopen: boolean) => {
    const editVersion = completedEditVersion.current + 1;
    completedEditVersion.current = editVersion;
    if (!(await requestReopen(forceReopen)) || completedEditVersion.current !== editVersion) return;
    const nextValidation = validateGoalsData(config.persona, nextData);
    if (!nextValidation.valid) return;
    const nextSignature = signatureFor(config.persona, nextData);
    setFailedOperation(undefined);
    setSaveStatus('saving');
    try {
      const nextPayload = normalizeGoalsForPayload(config.persona, nextData) as unknown as OnboardingStepData;
      await saveStep({ stepKey: step.key, data: nextPayload }).unwrap();
      if (completedEditVersion.current === editVersion) {
        setPersistedSignature(nextSignature);
        showSavedBriefly();
      }
    } catch {
      setFailedOperation('autosave');
      setSaveStatus('failed');
    }
  }, [config.persona, requestReopen, saveStep, showSavedBriefly, step.key]);

  const handleChange = (nextData: GoalsStepRequest) => {
    const wasComplete = stepStillComplete;
    const needsForcedReopen = graduationStepComplete.current;
    setValidationAttempted(true);
    setWorkingData(nextData);
    setFinishCheckpoint('save');
    if (failedOperation && failedOperation !== 'reopen') {
      setFailedOperation(undefined);
      setSaveStatus('idle');
    }
    if (wasComplete) void persistCompletedEdit(nextData, needsForcedReopen);
  };

  const handleBack = () => {
    if (!previousStep || busy) return;
    if (validation.valid && isDirty && !stepStillComplete) void persistDraft();
    navigation.push('Onboarding', { persona: config.persona, step: previousStep });
  };

  const retryFailedOperation = () => {
    if (failedOperation === 'reopen') {
      void persistCompletedEdit(workingData, graduationStepComplete.current);
    } else if (failedOperation === 'autosave') {
      void persistDraft();
    } else {
      void handleFinish();
    }
  };

  return (
    <View style={[styles.main, mobile && styles.mainMobile]} pointerEvents={signOut.signingOut ? 'none' : 'auto'}>
      <OnboardingGoalsForm
        config={config}
        mobile={mobile}
        position={step.position}
        totalSteps={state.steps.length}
        stepLabel={stepPresentation?.label ?? step.key.toUpperCase()}
        data={workingData}
        error={validation.error}
        showError={validationAttempted}
        disabled={busy || signOut.signingOut}
        onChange={handleChange}
      />

      <OnboardingSaveStatus status={saveStatus} />
      {failedOperation ? (
        <OnboardingErrorStatus
          title={failedOperation === 'onboardingComplete'
            ? "WE COULDN'T COMPLETE YOUR ONBOARDING."
            : failedOperation === 'reopen'
              ? "WE COULDN'T UPDATE THIS STEP'S STATUS."
              : "WE COULDN'T SAVE YOUR CHANGES."}
          onRetry={retryFailedOperation}
        />
      ) : null}
      <OnboardingFooter
        config={config}
        mobile={mobile}
        canContinue={validation.valid}
        busy={busy}
        backDisabled={busy}
        showBack={Boolean(previousStep)}
        showSkip={false}
        onBack={handleBack}
        onContinue={() => void handleFinish()}
        onSkip={() => undefined}
        continueLabel="FINISH →"
        savingLabel="FINISHING…"
        continueAccessibilityLabel="Finish onboarding"
        savingAccessibilityLabel="Completing onboarding"
        signOut={signOut}
      />
    </View>
  );
};
