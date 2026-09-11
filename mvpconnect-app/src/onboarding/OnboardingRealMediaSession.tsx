import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Text, View, useWindowDimensions } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MediaUploadAdapter, MediaUploaderState, UploadedMedia } from '../components/onboarding';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  externalConnectionService,
  startExternalOAuth,
  type ExternalConnectionSummary,
  type ExternalProvider,
  type OAuthConnectionStart,
} from '../services/externalConnectionService';
import {
  artistIdentityService,
  type ExternalArtistResult,
} from '../services/externalArtistService';
import {
  useCompleteOnboardingStepMutation,
  useReopenOnboardingStepMutation,
  useSaveOnboardingStepMutation,
  useSkipOnboardingStepMutation,
} from './onboardingApi';
import { configuredStepFor, routePersonaForBackend } from './onboardingConfig';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingErrorStatus } from './OnboardingErrorStatus';
import { OnboardingFooter } from './OnboardingFooter';
import { OnboardingMediaForm } from './OnboardingMediaForm';
import { mediaStepStyles } from './OnboardingMediaStep.styles';
import { OnboardingSaveStatus } from './OnboardingSaveStatus';
import {
  createOnboardingBannerAdapter,
  createOnboardingGalleryAdapter,
  fetchOwnedMedia,
  onboardingMediaContexts,
  pickOnboardingImage,
  type OwnedMediaResponse,
} from './onboardingMedia';
import {
  galleryReferences,
  galleryStates as toGalleryStates,
  hydrateGallery,
} from './mediaFoundation';
import {
  galleryForMediaData,
  hydrateMediaStepData,
  normalizeMediaStepForPayload,
  validateMediaStepData,
  withCanonicalMediaConnections,
  withMediaReferences,
  type MediaStepRequest,
} from './onboardingMediaStep';
import { previousResolvedStep, resumeStepFromState } from './onboardingRoutes';
import { MEDIA_GALLERY_LIMITS } from './mediaStepTypes';
import type {
  OnboardingSaveStatus as SaveStatus,
  OnboardingState,
  OnboardingStep,
} from './onboardingTypes';
import { styles } from './OnboardingShell.styles';

type FailedOperation = 'hydrate' | 'autosave' | 'save' | 'complete' | 'skip' | 'reopen';

interface OnboardingRealMediaSessionProps {
  state: OnboardingState;
  step: OnboardingStep;
  config: OnboardingPersonaConfig;
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
}

const EMPTY_MEDIA: MediaUploaderState = { status: 'EMPTY' };
const signatureFor = (persona: OnboardingPersonaConfig['persona'], data: MediaStepRequest) =>
  JSON.stringify(normalizeMediaStepForPayload(persona, data));

const uploadedMedia = (media: OwnedMediaResponse): UploadedMedia => ({
  id: media.id,
  url: media.url ?? '',
  fileName: media.originalFileName,
  mimeType: media.mimeType,
  width: media.width,
  height: media.height,
});

const stateMediaId = (state: MediaUploaderState): string | undefined =>
  'media' in state && state.media ? state.media.id : undefined;

const mediaInteractionActive = (state: MediaUploaderState): boolean =>
  state.status === 'SELECTED_LOCAL' || state.status === 'UPLOADING' || state.status === 'REMOVING';

const replaceConnection = (
  connections: readonly ExternalConnectionSummary[],
  next: ExternalConnectionSummary,
): ExternalConnectionSummary[] => [
  ...connections.filter((connection) => connection.provider !== next.provider),
  next,
];

export const OnboardingRealMediaSession: React.FC<OnboardingRealMediaSessionProps> = ({
  state,
  step,
  config,
  navigation,
}) => {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const initialData = useMemo(
    () => hydrateMediaStepData(config.persona, step.data),
    [config.persona, step.data],
  );
  const initialDataRef = useRef(initialData);
  const [workingData, setWorkingData] = useState<MediaStepRequest>(initialData);
  const [persistedSignature, setPersistedSignature] = useState(() => signatureFor(config.persona, initialData));
  const [bannerState, setBannerState] = useState<MediaUploaderState>(EMPTY_MEDIA);
  const [galleryStates, setGalleryStates] = useState<MediaUploaderState[]>([]);
  const [connections, setConnections] = useState<ExternalConnectionSummary[]>([]);
  const [artistIdentity, setArtistIdentity] = useState<ExternalArtistResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [hydrateVersion, setHydrateVersion] = useState(0);
  const [providerOperationCount, setProviderOperationCount] = useState(0);
  const [oauthAttempt, setOAuthAttempt] = useState<OAuthConnectionStart>();
  const [oauthErrors, setOAuthErrors] = useState<Partial<Record<'YOUTUBE' | 'SOUNDCLOUD', string>>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [failedOperation, setFailedOperation] = useState<FailedOperation>();
  const [locallyReopened, setLocallyReopened] = useState(step.status !== 'COMPLETE');
  const reopenedSignature = useRef<string>();
  const reopenPromise = useRef<Promise<boolean>>();
  const savedStatusTimer = useRef<ReturnType<typeof setTimeout>>();

  const [saveStep, saveMutation] = useSaveOnboardingStepMutation();
  const [completeStep, completeMutation] = useCompleteOnboardingStepMutation();
  const [skipStep, skipMutation] = useSkipOnboardingStepMutation();
  const [reopenStep, reopenMutation] = useReopenOnboardingStepMutation();

  const galleryLimit = MEDIA_GALLERY_LIMITS[config.persona];
  const workingSignature = useMemo(
    () => signatureFor(config.persona, workingData),
    [config.persona, workingData],
  );
  const validation = validateMediaStepData(config.persona, workingData);
  const isDirty = workingSignature !== persistedSignature;
  const mediaBusy = mediaInteractionActive(bannerState) || galleryStates.some(mediaInteractionActive);
  const providerBusy = providerOperationCount > 0 || Boolean(oauthAttempt);
  const apiBusy = saveMutation.isLoading
    || completeMutation.isLoading
    || skipMutation.isLoading
    || reopenMutation.isLoading;
  const busy = apiBusy || mediaBusy || providerBusy || !hydrated;
  const stepStillComplete = step.status === 'COMPLETE' && !locallyReopened;
  const previousStep = previousResolvedStep(state, step.key);
  const stepPresentation = configuredStepFor(config.persona, step.key);
  const mediaContexts = onboardingMediaContexts(config.persona);
  const rawBannerAdapter = useMemo(
    () => createOnboardingBannerAdapter(step.key, mediaContexts.banner),
    [mediaContexts.banner, step.key],
  );
  const rawGalleryAdapter = useMemo(
    () => createOnboardingGalleryAdapter(step.key, mediaContexts.gallery),
    [mediaContexts.gallery, step.key],
  );

  const showSavedBriefly = useCallback(() => {
    if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
    setSaveStatus('saved');
    savedStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 1800);
  }, []);

  useEffect(() => () => {
    if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
  }, []);

  const refreshConnections = useCallback(async () => {
    const [nextConnections, nextIdentity] = await Promise.all([
      externalConnectionService.list(),
      config.persona === 'artist' ? artistIdentityService.current() : Promise.resolve(null),
    ]);
    setConnections(nextConnections);
    setArtistIdentity(nextIdentity);
    setWorkingData((current) => withCanonicalMediaConnections(
      config.persona,
      current,
      nextConnections,
      nextIdentity,
    ));
    return nextConnections;
  }, [config.persona]);

  useEffect(() => {
    let active = true;
    setHydrated(false);
    setFailedOperation(undefined);
    void (async () => {
      try {
        const sourceData = initialDataRef.current;
        const bannerId = sourceData.bannerImage?.mediaId;
        const galleryIds = galleryForMediaData(sourceData).map((item) => item.mediaId);
        const [banner, gallery, nextConnections, nextIdentity] = await Promise.all([
          bannerId ? fetchOwnedMedia(bannerId) : Promise.resolve(undefined),
          Promise.all(galleryIds.map(fetchOwnedMedia)),
          externalConnectionService.list(),
          config.persona === 'artist' ? artistIdentityService.current() : Promise.resolve(null),
        ]);
        if (!active) return;
        setBannerState(banner ? { status: 'UPLOADED', media: uploadedMedia(banner) } : EMPTY_MEDIA);
        setGalleryStates(toGalleryStates(hydrateGallery(gallery.map((item) => ({
          mediaId: item.id,
          url: item.url ?? '',
          mimeType: item.mimeType,
          width: item.width,
          height: item.height,
        })))));
        setConnections(nextConnections);
        setArtistIdentity(nextIdentity);
        setWorkingData(withCanonicalMediaConnections(
          config.persona,
          sourceData,
          nextConnections,
          nextIdentity,
        ));
        setHydrated(true);
      } catch {
        if (!active) return;
        setFailedOperation('hydrate');
        setSaveStatus('failed');
      }
    })();
    return () => {
      active = false;
    };
  }, [config.persona, hydrateVersion, step.key]);

  useEffect(() => {
    if (!hydrated) return;
    const bannerId = stateMediaId(bannerState);
    const gallery = galleryReferences(galleryStates, galleryLimit);
    setWorkingData((current) => withMediaReferences(
      config.persona,
      current,
      bannerId ? { mediaId: bannerId } : null,
      gallery,
    ));
  }, [bannerState, config.persona, galleryLimit, galleryStates, hydrated]);

  const requestReopen = useCallback(async () => {
    if (locallyReopened) return true;
    if (reopenPromise.current) return reopenPromise.current;
    const pending = (async () => {
      setProviderOperationCount((count) => count + 1);
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
        setProviderOperationCount((count) => Math.max(0, count - 1));
      }
    })();
    reopenPromise.current = pending;
    try {
      return await pending;
    } finally {
      reopenPromise.current = undefined;
    }
  }, [locallyReopened, reopenStep, showSavedBriefly, step.key]);

  useEffect(() => {
    if (!hydrated || !stepStillComplete || !isDirty || reopenedSignature.current === workingSignature) return;
    reopenedSignature.current = workingSignature;
    void requestReopen();
  }, [hydrated, isDirty, requestReopen, stepStillComplete, workingSignature]);

  const protectCompletedStepMedia = useCallback((adapter: MediaUploadAdapter): MediaUploadAdapter => ({
    upload: async (file, onProgress) => {
      if (stepStillComplete && !(await requestReopen())) {
        throw new Error('The completed Media step could not be reopened.');
      }
      return adapter.upload(file, onProgress);
    },
    remove: async (mediaId) => {
      if (stepStillComplete && !(await requestReopen())) {
        throw new Error('The completed Media step could not be reopened.');
      }
      return adapter.remove(mediaId);
    },
  }), [requestReopen, stepStillComplete]);

  const bannerAdapter = useMemo(
    () => protectCompletedStepMedia(rawBannerAdapter),
    [protectCompletedStepMedia, rawBannerAdapter],
  );
  const galleryAdapter = useMemo(
    () => protectCompletedStepMedia(rawGalleryAdapter),
    [protectCompletedStepMedia, rawGalleryAdapter],
  );

  const payload = useCallback(
    () => normalizeMediaStepForPayload(config.persona, workingData),
    [config.persona, workingData],
  );

  const persistDraft = useCallback(async () => {
    if (!hydrated || !validation.valid || !isDirty || busy || stepStillComplete) return false;
    const submittedSignature = workingSignature;
    setFailedOperation(undefined);
    setSaveStatus('saving');
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
  }, [busy, hydrated, isDirty, payload, saveStep, showSavedBriefly, step.key, stepStillComplete, validation.valid, workingSignature]);

  useEffect(() => {
    if (!hydrated || !validation.valid || !isDirty || busy || stepStillComplete) return;
    const timer = setTimeout(() => void persistDraft(), 1000);
    return () => clearTimeout(timer);
  }, [busy, hydrated, isDirty, persistDraft, stepStillComplete, validation.valid, workingSignature]);

  const navigateFromState = useCallback((nextState: OnboardingState) => {
    const nextStep = resumeStepFromState(nextState);
    if (!nextStep || nextStep === step.key) return;
    navigation.push('Onboarding', {
      persona: routePersonaForBackend(nextState.persona),
      step: nextStep,
    });
  }, [navigation, step.key]);

  const handleContinue = useCallback(async () => {
    if (!hydrated || !validation.valid || busy) return;
    if (stepStillComplete && !(await requestReopen())) return;
    const payloadData = payload();
    setFailedOperation(undefined);
    setSaveStatus('saving');
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
  }, [busy, completeStep, hydrated, navigateFromState, payload, requestReopen, saveStep, showSavedBriefly, step.key, stepStillComplete, validation.valid, workingSignature]);

  const handleSkip = useCallback(async () => {
    if (step.required || busy) return;
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
  }, [busy, navigateFromState, showSavedBriefly, skipStep, step.key, step.required]);

  const handleBack = () => {
    if (!previousStep || busy) return;
    if (validation.valid && isDirty && !stepStillComplete) void persistDraft();
    navigation.push('Onboarding', { persona: config.persona, step: previousStep });
  };

  const runProviderOperation = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setProviderOperationCount((count) => count + 1);
    try {
      if (stepStillComplete && !(await requestReopen())) {
        throw new Error('The completed Media step could not be reopened.');
      }
      return await operation();
    } finally {
      setProviderOperationCount((count) => Math.max(0, count - 1));
    }
  }, [requestReopen, stepStillComplete]);

  const saveUrlConnection = async (provider: ExternalProvider, value: string) => {
    const next = await runProviderOperation(() => externalConnectionService.upsertUrl(provider, value));
    const nextConnections = replaceConnection(connections, next);
    setConnections(nextConnections);
    setWorkingData((current) => withCanonicalMediaConnections(
      config.persona,
      current,
      nextConnections,
      artistIdentity,
    ));
  };

  const removeConnection = async (provider: ExternalProvider) => {
    await runProviderOperation(() => externalConnectionService.remove(provider));
    const nextConnections = connections.filter((connection) => connection.provider !== provider);
    setConnections(nextConnections);
    setWorkingData((current) => withCanonicalMediaConnections(
      config.persona,
      current,
      nextConnections,
      artistIdentity,
    ));
  };

  const attachIdentity = async (identity: ExternalArtistResult) => {
    const attached = await runProviderOperation(() => artistIdentityService.attach(identity.id));
    setArtistIdentity(attached);
    setWorkingData((current) => withCanonicalMediaConnections(config.persona, current, connections, attached));
  };

  const disconnectIdentity = async () => {
    await runProviderOperation(() => artistIdentityService.disconnect());
    setArtistIdentity(null);
    setWorkingData((current) => withCanonicalMediaConnections(config.persona, current, connections, null));
  };

  const beginOAuth = async (provider: 'YOUTUBE' | 'SOUNDCLOUD') => {
    setOAuthErrors((current) => ({ ...current, [provider]: undefined }));
    try {
      const attempt = await runProviderOperation(() => startExternalOAuth(provider));
      setOAuthAttempt(attempt);
    } catch {
      setOAuthErrors((current) => ({ ...current, [provider]: 'AUTHORIZATION COULD NOT BE STARTED.' }));
    }
  };

  useEffect(() => {
    if (!oauthAttempt) return undefined;
    let active = true;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const result = await externalConnectionService.status(oauthAttempt.attemptId);
        if (!active) return;
        if (result.status === 'PENDING') {
          if (Date.parse(result.expiresAt) <= Date.now()) {
            setOAuthErrors((current) => ({
              ...current,
              [oauthAttempt.provider]: 'AUTHORIZATION EXPIRED. TRY AGAIN.',
            }));
            setOAuthAttempt(undefined);
          }
          return;
        }
        if (result.status === 'SUCCEEDED') {
          await refreshConnections();
        } else {
          setOAuthErrors((current) => ({
            ...current,
            [oauthAttempt.provider]: result.errorCode ?? 'AUTHORIZATION FAILED.',
          }));
        }
        setOAuthAttempt(undefined);
      } catch {
        if (active) setOAuthErrors((current) => ({
          ...current,
          [oauthAttempt.provider]: 'CONNECTION STATUS COULD NOT BE REFRESHED.',
        }));
      } finally {
        polling = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 1500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [oauthAttempt, refreshConnections]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && hydrated) void refreshConnections();
    });
    return () => subscription.remove();
  }, [hydrated, refreshConnections]);

  const retryFailedOperation = () => {
    if (failedOperation === 'hydrate') setHydrateVersion((value) => value + 1);
    else if (failedOperation === 'complete' || failedOperation === 'save') void handleContinue();
    else if (failedOperation === 'skip') void handleSkip();
    else if (failedOperation === 'reopen') {
      reopenedSignature.current = undefined;
      void requestReopen();
    } else void persistDraft();
  };

  return (
    <View style={[styles.main, mobile && styles.mainMobile]}>
      {hydrated ? (
        <OnboardingMediaForm
          config={config}
          mobile={mobile}
          position={step.position}
          totalSteps={state.steps.length}
          stepLabel={stepPresentation?.label ?? step.key.toUpperCase()}
          data={workingData}
          bannerState={bannerState}
          galleryStates={galleryStates}
          connections={connections}
          artistIdentity={artistIdentity}
          interactionBusy={providerBusy}
          errors={validation.errors}
          bannerAdapter={bannerAdapter}
          galleryAdapter={galleryAdapter}
          onPickImage={() => pickOnboardingImage()}
          onBannerChange={setBannerState}
          onGalleryChange={setGalleryStates}
          onWebsiteChange={(websiteUrl) => setWorkingData((current) => (
            'websiteUrl' in current ? { ...current, websiteUrl } : current
          ))}
          onUrlConnectionSave={saveUrlConnection}
          onConnectionRemove={removeConnection}
          onOAuthConnect={beginOAuth}
          onArtistIdentityAttach={attachIdentity}
          onArtistIdentityDisconnect={disconnectIdentity}
          oauthErrors={oauthErrors}
        />
      ) : (
        <View style={mediaStepStyles.hydrationState}>
          <Text style={mediaStepStyles.hydrationText}>LOADING YOUR MEDIA…</Text>
        </View>
      )}

      <OnboardingSaveStatus status={saveStatus} />
      {failedOperation ? (
        <OnboardingErrorStatus
          title={failedOperation === 'hydrate'
            ? "WE COULDN'T LOAD YOUR MEDIA."
            : failedOperation === 'reopen'
              ? "WE COULDN'T UPDATE THIS STEP'S STATUS."
              : "WE COULDN'T SAVE YOUR CHANGES."}
          onRetry={retryFailedOperation}
        />
      ) : null}
      <OnboardingFooter
        config={config}
        mobile={mobile}
        canContinue={hydrated && validation.valid && !mediaBusy && !providerBusy}
        busy={busy}
        backDisabled={busy}
        showBack={Boolean(previousStep)}
        showSkip={!step.required}
        onBack={handleBack}
        onContinue={() => void handleContinue()}
        onSkip={() => void handleSkip()}
      />
    </View>
  );
};
