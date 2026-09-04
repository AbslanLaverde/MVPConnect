import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { MediaUploaderState } from '../components/onboarding/MediaUploader';
import {
  useCompleteOnboardingStepMutation,
  useGetOwnedMediaQuery,
  useReopenOnboardingStepMutation,
  useSaveOnboardingStepMutation,
} from './onboardingApi';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import {
  createOnboardingMediaAdapter,
  pickOnboardingProfileImage,
} from './onboardingMedia';
import { OnboardingErrorStatus } from './OnboardingErrorStatus';
import { OnboardingFooter } from './OnboardingFooter';
import { OnboardingSaveStatus } from './OnboardingSaveStatus';
import { OnboardingStepOneForm } from './OnboardingStepOneForm';
import {
  hydrateStepOneData,
  normalizeStepOneDataForPayload,
  stepOneMediaId,
  validateStepOneData,
} from './onboardingStepOne';
import type { StepOneData } from './onboardingStepOne';
import { configuredStepFor, routePersonaForBackend } from './onboardingConfig';
import { resumeStepFromState } from './onboardingRoutes';
import type {
  OnboardingSaveStatus as SaveStatus,
  OnboardingState,
  OnboardingStep,
} from './onboardingTypes';
import { styles } from './OnboardingShell.styles';
import {
  addressLocationProvider,
  cityLocationProvider,
} from '../services/locationService';

type FailedOperation = 'autosave' | 'save' | 'complete' | 'reopen';

interface OnboardingRealStepSessionProps {
  state: OnboardingState;
  step: OnboardingStep;
  config: OnboardingPersonaConfig;
  displayName?: string;
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
}

const signatureFor = (data: StepOneData) => JSON.stringify(data);

export const OnboardingRealStepSession: React.FC<OnboardingRealStepSessionProps> = ({
  state,
  step,
  config,
  displayName = '',
  navigation,
}) => {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const initialData = useMemo(
    () => hydrateStepOneData(config.persona, step.data),
    [config.persona, step.data],
  );
  const [workingData, setWorkingData] = useState<StepOneData>(initialData);
  const [persistedSignature, setPersistedSignature] = useState(() => signatureFor(initialData));
  const [mediaState, setMediaState] = useState<MediaUploaderState>({ status: 'EMPTY' });
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [failedOperation, setFailedOperation] = useState<FailedOperation>();
  const [locallyReopened, setLocallyReopened] = useState(step.status !== 'COMPLETE');
  const [locationSuggestionsActive, setLocationSuggestionsActive] = useState(false);
  const reopenedSignature = useRef<string>();
  const savedStatusTimer = useRef<ReturnType<typeof setTimeout>>();

  const persistedMediaId = stepOneMediaId(workingData);
  const mediaQuery = useGetOwnedMediaQuery(persistedMediaId ?? '', { skip: !persistedMediaId });
  const mediaAdapter = useMemo(() => createOnboardingMediaAdapter(step.key), [step.key]);
  const [saveStep, saveMutation] = useSaveOnboardingStepMutation();
  const [completeStep, completeMutation] = useCompleteOnboardingStepMutation();
  const [reopenStep, reopenMutation] = useReopenOnboardingStepMutation();

  const workingSignature = useMemo(() => signatureFor(workingData), [workingData]);
  const isDirty = workingSignature !== persistedSignature;
  const mediaReady = mediaState.status === 'UPLOADED'
    && mediaState.media.id === persistedMediaId;
  const validation = validateStepOneData(config.persona, workingData, mediaReady);
  const busy = saveMutation.isLoading || completeMutation.isLoading || reopenMutation.isLoading;
  const stepStillComplete = step.status === 'COMPLETE' && !locallyReopened;
  const stepPresentation = configuredStepFor(config.persona, step.key);

  useEffect(() => () => {
    if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
  }, []);

  useEffect(() => {
    if (!persistedMediaId || !mediaQuery.data) return;
    const currentLocalUpload = mediaState.status === 'SELECTED_LOCAL'
      || mediaState.status === 'UPLOADING'
      || mediaState.status === 'REMOVING'
      || (mediaState.status === 'ERROR' && Boolean(mediaState.file || mediaState.media));
    if (currentLocalUpload || mediaQuery.data.status !== 'READY' || !mediaQuery.data.url) return;
    if (mediaState.status === 'UPLOADED' && mediaState.media.id === persistedMediaId) return;
    setMediaState({
      status: 'UPLOADED',
      media: {
        id: persistedMediaId,
        url: mediaQuery.data.url,
        fileName: mediaQuery.data.originalFileName,
        mimeType: mediaQuery.data.mimeType,
        width: mediaQuery.data.width,
        height: mediaQuery.data.height,
      },
    });
  }, [mediaQuery.data, mediaState, persistedMediaId]);

  useEffect(() => {
    if (!persistedMediaId || !mediaQuery.isError || mediaState.status !== 'EMPTY') return;
    setMediaState({ status: 'ERROR', error: "We couldn't load your saved image." });
  }, [mediaQuery.isError, mediaState.status, persistedMediaId]);

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
    if (
      locationSuggestionsActive
      || !stepStillComplete
      || !isDirty
      || reopenedSignature.current === workingSignature
    ) return;
    reopenedSignature.current = workingSignature;
    void requestReopen();
  }, [isDirty, locationSuggestionsActive, requestReopen, stepStillComplete, workingSignature]);

  const persistDraft = useCallback(async () => {
    if (
      locationSuggestionsActive
      || !validation.valid
      || !isDirty
      || busy
      || stepStillComplete
    ) return false;
    setFailedOperation(undefined);
    setSaveStatus('saving');
    const submittedSignature = workingSignature;
    const payloadData = normalizeStepOneDataForPayload(config.persona, workingData);
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
  }, [busy, config.persona, isDirty, locationSuggestionsActive, saveStep, showSavedBriefly, step.key, stepStillComplete, validation.valid, workingData, workingSignature]);

  useEffect(() => {
    if (
      locationSuggestionsActive
      || !validation.valid
      || !isDirty
      || busy
      || stepStillComplete
    ) return;
    const timer = setTimeout(() => void persistDraft(), 1000);
    return () => clearTimeout(timer);
  }, [busy, isDirty, locationSuggestionsActive, persistDraft, stepStillComplete, validation.valid, workingSignature]);

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
    const payloadData = normalizeStepOneDataForPayload(config.persona, workingData);
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

  const handleMediaStateChange = (nextState: MediaUploaderState) => {
    setValidationAttempted(true);
    setMediaState(nextState);
    if (nextState.status === 'UPLOADED') {
      setWorkingData((current) => ({
        ...current,
        profileImage: { mediaId: nextState.media.id },
      }));
    } else if (nextState.status === 'EMPTY') {
      setWorkingData((current) => {
        const next = { ...current };
        delete next.profileImage;
        return next;
      });
    }
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
      <OnboardingStepOneForm
        config={config}
        mobile={mobile}
        position={step.position}
        totalSteps={state.steps.length}
        stepLabel={stepPresentation?.label ?? step.key.toUpperCase()}
        displayName={displayName}
        data={workingData}
        errors={validation.errors}
        showErrors={validationAttempted}
        mediaState={mediaState}
        onMediaStateChange={handleMediaStateChange}
        onSelectImage={pickOnboardingProfileImage}
        mediaAdapter={mediaAdapter}
        locationProvider={config.persona === 'venue'
          ? addressLocationProvider
          : cityLocationProvider}
        onLocationSuggestionActivityChange={setLocationSuggestionsActive}
        onChange={(nextData) => {
          setValidationAttempted(true);
          setWorkingData(nextData);
        }}
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
        showBack={false}
        showSkip={false}
        onBack={() => undefined}
        onContinue={() => void handleContinue()}
        onSkip={() => undefined}
      />
    </View>
  );
};
