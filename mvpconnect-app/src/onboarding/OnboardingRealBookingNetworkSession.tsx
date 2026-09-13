import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { LocationSuggestionProvider } from '../components/onboarding/LocationField';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { ArtistReferenceProvider } from '../services/externalArtistService';
import type { VenueReferenceProvider } from '../services/venueIdentityService';
import { cityLocationProvider } from '../services/locationService';
import {
  useCompleteOnboardingStepMutation,
  useReopenOnboardingStepMutation,
  useSaveOnboardingStepMutation,
} from './onboardingApi';
import type { BookingNetworkFormData } from './bookingNetworkTypes';
import { configuredStepFor, routePersonaForBackend } from './onboardingConfig';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingBookingNetworkForm } from './OnboardingBookingNetworkForm';
import { OnboardingErrorStatus } from './OnboardingErrorStatus';
import { OnboardingFooter } from './OnboardingFooter';
import {
  hydrateBookingNetworkData,
  normalizeBookingNetworkForPayload,
  validateBookingNetworkData,
} from './onboardingBookingNetwork';
import { previousResolvedStep, resumeStepFromState } from './onboardingRoutes';
import { OnboardingSaveStatus } from './OnboardingSaveStatus';
import { styles } from './OnboardingShell.styles';
import { useOnboardingSignOut } from './useOnboardingSignOut';
import type {
  OnboardingSaveStatus as SaveStatus,
  OnboardingState,
  OnboardingStep,
  OnboardingStepData,
} from './onboardingTypes';

type FailedOperation = 'autosave' | 'save' | 'complete' | 'reopen';

interface OnboardingRealBookingNetworkSessionProps {
  state: OnboardingState;
  step: OnboardingStep;
  config: OnboardingPersonaConfig;
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
  artistProvider?: ArtistReferenceProvider;
  venueProvider?: VenueReferenceProvider;
  locationProvider?: LocationSuggestionProvider;
}

const signatureFor = (data: BookingNetworkFormData) => JSON.stringify(data);

export const OnboardingRealBookingNetworkSession: React.FC<OnboardingRealBookingNetworkSessionProps> = ({
  state,
  step,
  config,
  navigation,
  artistProvider,
  venueProvider,
  locationProvider,
}) => {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const persona = config.persona === 'venue' ? 'venue' : 'promoter';
  const initialData = useMemo(
    () => hydrateBookingNetworkData(persona, step.data),
    [persona, step.data],
  );
  const [workingData, setWorkingData] = useState<BookingNetworkFormData>(initialData);
  const [persistedSignature, setPersistedSignature] = useState(() => signatureFor(initialData));
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [failedOperation, setFailedOperation] = useState<FailedOperation>();
  const [locallyReopened, setLocallyReopened] = useState(step.status !== 'COMPLETE');
  const reopenRequest = useRef<Promise<boolean>>();
  const completedEditVersion = useRef(0);
  const savedStatusTimer = useRef<ReturnType<typeof setTimeout>>();

  const [saveStep, saveMutation] = useSaveOnboardingStepMutation();
  const [completeStep, completeMutation] = useCompleteOnboardingStepMutation();
  const [reopenStep, reopenMutation] = useReopenOnboardingStepMutation();

  const workingSignature = useMemo(() => signatureFor(workingData), [workingData]);
  const isDirty = workingSignature !== persistedSignature;
  const validation = validateBookingNetworkData(persona, workingData);
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
    if (locallyReopened) return true;
    if (reopenRequest.current) return reopenRequest.current;
    const pending = (async () => {
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
      } finally {
        reopenRequest.current = undefined;
      }
    })();
    reopenRequest.current = pending;
    return pending;
  }, [locallyReopened, reopenStep, showSavedBriefly, step.key]);

  const payload = useCallback((): OnboardingStepData =>
    normalizeBookingNetworkForPayload(persona, workingData) as unknown as OnboardingStepData,
  [persona, workingData]);

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
  }, [busy, completeStep, navigateFromState, payload, requestReopen, saveStep, showSavedBriefly, signOut, step.key, stepStillComplete, validation.valid, workingSignature]);

  const handleBack = () => {
    if (!previousStep || busy) return;
    if (validation.valid && isDirty && !stepStillComplete) void persistDraft();
    navigation.push('Onboarding', { persona: config.persona, step: previousStep });
  };

  const persistCompletedEdit = useCallback(async (nextData: BookingNetworkFormData) => {
    const editVersion = completedEditVersion.current + 1;
    completedEditVersion.current = editVersion;
    if (!(await requestReopen()) || completedEditVersion.current !== editVersion) return;

    const nextValidation = validateBookingNetworkData(persona, nextData);
    if (!nextValidation.valid) return;
    const nextSignature = signatureFor(nextData);
    setFailedOperation(undefined);
    setSaveStatus('saving');
    try {
      const nextPayload = normalizeBookingNetworkForPayload(
        persona,
        nextData,
      ) as unknown as OnboardingStepData;
      await saveStep({ stepKey: step.key, data: nextPayload }).unwrap();
      if (completedEditVersion.current === editVersion) {
        setPersistedSignature(nextSignature);
        showSavedBriefly();
      }
    } catch {
      setFailedOperation('autosave');
      setSaveStatus('failed');
    }
  }, [persona, requestReopen, saveStep, showSavedBriefly, step.key]);

  const retryFailedOperation = () => {
    if (failedOperation === 'complete' || failedOperation === 'save') {
      void handleContinue();
    } else if (failedOperation === 'reopen') {
      void persistCompletedEdit(workingData);
    } else {
      void persistDraft();
    }
  };

  return (
    <View style={[styles.main, mobile && styles.mainMobile]} pointerEvents={signOut.signingOut ? 'none' : 'auto'}>
      <OnboardingBookingNetworkForm
        config={config}
        mobile={mobile}
        position={step.position}
        totalSteps={state.steps.length}
        stepLabel={stepPresentation?.label ?? step.key.toUpperCase()}
        data={workingData}
        errors={validation.errors}
        showErrors={validationAttempted}
        onChange={(nextData) => {
          const wasComplete = stepStillComplete;
          setValidationAttempted(true);
          setWorkingData(nextData);
          if (failedOperation && failedOperation !== 'reopen') {
            setFailedOperation(undefined);
            setSaveStatus('idle');
          }
          if (wasComplete) void persistCompletedEdit(nextData);
        }}
        artistProvider={artistProvider}
        venueProvider={venueProvider}
        locationProvider={locationProvider ?? cityLocationProvider}
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
        signOut={signOut}
      />
    </View>
  );
};
