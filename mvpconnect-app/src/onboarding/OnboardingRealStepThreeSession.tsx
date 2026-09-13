import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { VenueReferenceProvider } from '../services/venueIdentityService';
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
import { OnboardingStepThreeForm } from './OnboardingStepThreeForm';
import {
  hydrateStepThreeData,
  normalizeStepThreeDataForPayload,
  validateStepThreeData,
} from './onboardingStepThree';
import { previousResolvedStep, resumeStepFromState } from './onboardingRoutes';
import type { StepThreeFormData } from './stepThreeTypes';
import type {
  OnboardingSaveStatus as SaveStatus,
  OnboardingState,
  OnboardingStep,
  OnboardingStepData,
} from './onboardingTypes';
import { styles } from './OnboardingShell.styles';
import { useOnboardingSignOut } from './useOnboardingSignOut';

type FailedOperation = 'autosave' | 'save' | 'complete' | 'reopen';

interface OnboardingRealStepThreeSessionProps {
  state: OnboardingState;
  step: OnboardingStep;
  config: OnboardingPersonaConfig;
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
  venueProvider?: VenueReferenceProvider;
}

const signatureFor = (data: StepThreeFormData) => JSON.stringify(data);

export const OnboardingRealStepThreeSession: React.FC<OnboardingRealStepThreeSessionProps> = ({
  state,
  step,
  config,
  navigation,
  venueProvider,
}) => {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const persona = config.persona === 'venue' ? 'venue' : 'artist';
  const initialData = useMemo(
    () => hydrateStepThreeData(persona, step.data),
    [persona, step.data],
  );
  const [workingData, setWorkingData] = useState<StepThreeFormData>(initialData);
  const [persistedSignature, setPersistedSignature] = useState(() => signatureFor(initialData));
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [interactiveValid, setInteractiveValid] = useState(true);
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
  const dataValidation = validateStepThreeData(persona, workingData);
  const isValid = dataValidation.valid && interactiveValid;
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

  const payload = useCallback((): OnboardingStepData =>
    normalizeStepThreeDataForPayload(persona, workingData) as unknown as OnboardingStepData,
  [persona, workingData]);

  const persistDraft = useCallback(async () => {
    if (!isValid || !isDirty || busy || stepStillComplete) return false;
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
  }, [busy, isDirty, isValid, payload, saveStep, showSavedBriefly, step.key, stepStillComplete, workingSignature]);

  const flushValidDraft = useCallback(async () => {
    if (!isValid) return false;
    if (stepStillComplete && !(await requestReopen())) return false;
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
  }, [isValid, payload, requestReopen, saveStep, showSavedBriefly, step.key, stepStillComplete, workingSignature]);

  const signOut = useOnboardingSignOut({
    navigation,
    dirty: isDirty,
    valid: isValid,
    persistenceBusy: busy,
    flushValidDraft,
  });

  useEffect(() => {
    if (!isValid || !isDirty || busy || signOut.signingOut || stepStillComplete) return;
    const timer = setTimeout(() => void persistDraft(), 1000);
    return () => clearTimeout(timer);
  }, [busy, isDirty, isValid, persistDraft, signOut.signingOut, stepStillComplete, workingSignature]);

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
    if (!isValid || busy) return;

    if (stepStillComplete && !(await requestReopen())) return;
    setFailedOperation(undefined);
    setSaveStatus('saving');
    const payloadData = payload();
    try {
      await saveStep({ stepKey: step.key, data: payloadData }).unwrap();
      setPersistedSignature(workingSignature);
      if (signOut.isSignOutPending()) return;
    } catch {
      setFailedOperation('save');
      setSaveStatus('failed');
      return;
    }

    try {
      const nextState = await completeStep({ stepKey: step.key, data: payloadData }).unwrap();
      showSavedBriefly();
      if (signOut.isSignOutPending()) return;
      navigateFromState(nextState);
    } catch {
      setFailedOperation('complete');
      setSaveStatus('failed');
    }
  }, [busy, completeStep, isValid, navigateFromState, payload, requestReopen, saveStep, showSavedBriefly, signOut, step.key, stepStillComplete, workingSignature]);

  const handleBack = () => {
    if (!previousStep || busy) return;
    if (isValid && isDirty && !stepStillComplete) void persistDraft();
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
    <View style={[styles.main, mobile && styles.mainMobile]} pointerEvents={signOut.signingOut ? 'none' : 'auto'}>
      <OnboardingStepThreeForm
        config={config}
        mobile={mobile}
        position={step.position}
        totalSteps={state.steps.length}
        stepLabel={stepPresentation?.label ?? step.key.toUpperCase()}
        data={workingData}
        errors={dataValidation.errors}
        showErrors={validationAttempted}
        onChange={(nextData) => {
          setValidationAttempted(true);
          setWorkingData(nextData);
          if (failedOperation && failedOperation !== 'reopen') {
            setFailedOperation(undefined);
            setSaveStatus('idle');
          }
        }}
        onInteractiveValidityChange={setInteractiveValid}
        venueProvider={venueProvider}
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
        canContinue={isValid}
        busy={busy}
        backDisabled={busy}
        showBack={Boolean(previousStep)}
        showSkip={false}
        onBack={handleBack}
        onContinue={() => void handleContinue()}
        onSkip={() => undefined}
        signOut={signOut}
      />
    </View>
  );
};
