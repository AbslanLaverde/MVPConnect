import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { ArtistReferenceProvider } from '../services/externalArtistService';
import {
  useCompleteOnboardingStepMutation,
  useReopenOnboardingStepMutation,
  useSaveOnboardingStepMutation,
} from './onboardingApi';
import { configuredStepFor, routePersonaForBackend } from './onboardingConfig';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingErrorStatus } from './OnboardingErrorStatus';
import { OnboardingFooter } from './OnboardingFooter';
import { OnboardingSaveStatus } from './OnboardingSaveStatus';
import { OnboardingStepTwoForm } from './OnboardingStepTwoForm';
import {
  hydrateStepTwoData,
  normalizeStepTwoDataForPayload,
  validateStepTwoData,
} from './onboardingStepTwo';
import { previousResolvedStep, resumeStepFromState } from './onboardingRoutes';
import type { StepTwoRequest } from './stepTwoTypes';
import type {
  OnboardingSaveStatus as SaveStatus,
  OnboardingState,
  OnboardingStep,
} from './onboardingTypes';
import { styles } from './OnboardingShell.styles';

type FailedOperation = 'autosave' | 'save' | 'complete' | 'reopen';

interface OnboardingRealStepTwoSessionProps {
  state: OnboardingState;
  step: OnboardingStep;
  config: OnboardingPersonaConfig;
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
  artistProvider?: ArtistReferenceProvider;
}

const signatureFor = (data: StepTwoRequest) => JSON.stringify(data);

export const OnboardingRealStepTwoSession: React.FC<OnboardingRealStepTwoSessionProps> = ({
  state,
  step,
  config,
  navigation,
  artistProvider,
}) => {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const initialData = useMemo(
    () => hydrateStepTwoData(config.persona, step.data),
    [config.persona, step.data],
  );
  const [workingData, setWorkingData] = useState<StepTwoRequest>(initialData);
  const [persistedSignature, setPersistedSignature] = useState(() => signatureFor(initialData));
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [failedOperation, setFailedOperation] = useState<FailedOperation>();
  const [locallyReopened, setLocallyReopened] = useState(step.status !== 'COMPLETE');
  const reopenedSignature = useRef<string>();
  const savedStatusTimer = useRef<ReturnType<typeof setTimeout>>();

  const [saveStep, saveMutation] = useSaveOnboardingStepMutation();
  const [completeStep, completeMutation] = useCompleteOnboardingStepMutation();
  const [reopenStep, reopenMutation] = useReopenOnboardingStepMutation();

  const workingSignature = useMemo(() => signatureFor(workingData), [workingData]);
  const isDirty = workingSignature !== persistedSignature;
  const validation = validateStepTwoData(config.persona, workingData);
  const busy = saveMutation.isLoading || completeMutation.isLoading || reopenMutation.isLoading;
  const stepStillComplete = step.status === 'COMPLETE' && !locallyReopened;
  const stepPresentation = configuredStepFor(config.persona, step.key);
  const previousStep = previousResolvedStep(state, step.key);

  useEffect(() => () => {
    if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
  }, []);

  const showSavedBriefly = useCallback(() => {
    if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
    setSaveStatus('saved');
    savedStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 1800);
  }, []);

  const requestReopen = useCallback(async () => {
    if (reopenMutation.isLoading || locallyReopened) return true;
    setFailedOperation(undefined);
    setSaveStatus('saving');
    try {
      await reopenStep(step.key).unwrap();
      setLocallyReopened(true);
      showSavedBriefly();
      return true;
    } catch {
      setFailedOperation('reopen');
      setSaveStatus('failed');
      return false;
    }
  }, [locallyReopened, reopenMutation.isLoading, reopenStep, showSavedBriefly, step.key]);

  useEffect(() => {
    if (!stepStillComplete || !isDirty || reopenedSignature.current === workingSignature) return;
    reopenedSignature.current = workingSignature;
    void requestReopen();
  }, [isDirty, requestReopen, stepStillComplete, workingSignature]);

  const persistDraft = useCallback(async () => {
    if (!validation.valid || !isDirty || busy || stepStillComplete) return false;
    setFailedOperation(undefined);
    setSaveStatus('saving');
    const submittedSignature = workingSignature;
    const payloadData = normalizeStepTwoDataForPayload(config.persona, workingData);
    try {
      await saveStep({ stepKey: step.key, data: payloadData }).unwrap();
      setPersistedSignature(submittedSignature);
      showSavedBriefly();
      return true;
    } catch {
      setFailedOperation('autosave');
      setSaveStatus('failed');
      return false;
    }
  }, [busy, config.persona, isDirty, saveStep, showSavedBriefly, step.key, stepStillComplete, validation.valid, workingData, workingSignature]);

  useEffect(() => {
    if (!validation.valid || !isDirty || busy || stepStillComplete) return;
    const timer = setTimeout(() => void persistDraft(), 1000);
    return () => clearTimeout(timer);
  }, [busy, isDirty, persistDraft, stepStillComplete, validation.valid, workingSignature]);

  const navigateFromState = useCallback((nextState: OnboardingState) => {
    const nextStep = resumeStepFromState(nextState);
    if (!nextStep || nextStep === step.key) return;
    navigation.push('Onboarding', {
      persona: routePersonaForBackend(nextState.persona),
      step: nextStep,
    });
  }, [navigation, step.key]);

  const handleContinue = useCallback(async () => {
    setValidationAttempted(true);
    if (!validation.valid || busy) return;

    if (stepStillComplete && !(await requestReopen())) return;
    setFailedOperation(undefined);
    setSaveStatus('saving');
    const payloadData = normalizeStepTwoDataForPayload(config.persona, workingData);
    try {
      await saveStep({ stepKey: step.key, data: payloadData }).unwrap();
      setPersistedSignature(workingSignature);
    } catch {
      setFailedOperation('save');
      setSaveStatus('failed');
      return;
    }

    try {
      const nextState = await completeStep({ stepKey: step.key, data: payloadData }).unwrap();
      showSavedBriefly();
      navigateFromState(nextState);
    } catch {
      setFailedOperation('complete');
      setSaveStatus('failed');
    }
  }, [busy, completeStep, config.persona, navigateFromState, requestReopen, saveStep, showSavedBriefly, step.key, stepStillComplete, validation.valid, workingData, workingSignature]);

  const handleBack = () => {
    if (!previousStep || busy) return;
    if (validation.valid && isDirty && !stepStillComplete) void persistDraft();
    navigation.push('Onboarding', { persona: config.persona, step: previousStep });
  };

  const retryFailedOperation = () => {
    if (failedOperation === 'complete' || failedOperation === 'save') {
      void handleContinue();
    } else if (failedOperation === 'reopen') {
      reopenedSignature.current = undefined;
      void requestReopen();
    } else {
      void persistDraft();
    }
  };

  return (
    <View style={[styles.main, mobile && styles.mainMobile]}>
      <OnboardingStepTwoForm
        config={config}
        mobile={mobile}
        position={step.position}
        totalSteps={state.steps.length}
        stepLabel={stepPresentation?.label ?? step.key.toUpperCase()}
        data={workingData}
        errors={validation.errors}
        showErrors={validationAttempted}
        onChange={(nextData) => {
          setValidationAttempted(true);
          setWorkingData(nextData);
          if (failedOperation && failedOperation !== 'reopen') {
            setFailedOperation(undefined);
            setSaveStatus('idle');
          }
        }}
        artistProvider={artistProvider}
      />

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
        canContinue={validation.valid}
        busy={busy}
        backDisabled={busy}
        showBack={Boolean(previousStep)}
        showSkip={false}
        onBack={handleBack}
        onContinue={() => void handleContinue()}
        onSkip={() => undefined}
      />
    </View>
  );
};
