package com.mint.services;

import com.mint.exceptions.MediaException;
import com.mint.exceptions.OnboardingException;
import com.mint.media.MediaStatus;
import com.mint.media.MediaType;
import com.mint.nodes.MediaAsset;
import com.mint.nodes.OnboardingDraft;
import com.mint.nodes.OnboardingStep;
import com.mint.onboarding.OnboardingStepRegistry;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.OnboardingDraftRepository;
import com.mint.repositories.OnboardingStepRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OnboardingMediaServiceTest {

    @Mock
    private AuthenticatedPersonaProvider authenticatedPersonaProvider;

    @Mock
    private OnboardingDraftRepository onboardingDraftRepository;

    @Mock
    private OnboardingStepRepository onboardingStepRepository;

    @Mock
    private MediaService mediaService;

    private final AuthenticatedPersona owner =
            new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN);
    private OnboardingMediaService onboardingMediaService;
    private OnboardingStep basics;

    @BeforeEach
    void setUp() {
        onboardingMediaService = new OnboardingMediaService(
                authenticatedPersonaProvider,
                new OnboardingStepRegistry(),
                onboardingDraftRepository,
                onboardingStepRepository,
                mediaService
        );
        basics = new OnboardingStep();
        basics.setId("step-1");
        basics.setKey("basics");
        basics.setPosition(1);
        basics.setMediaAssets(new ArrayList<>());
    }

    @Test
    void associationUsesAuthenticatedOwnerAndCreatesHasMediaRelationship() {
        MediaAsset media = readyMedia();
        when(authenticatedPersonaProvider.current()).thenReturn(owner);
        when(onboardingDraftRepository.findForOwner(
                owner.userId(),
                owner.persona().name(),
                OnboardingStepRegistry.CURRENT_VERSION
        )).thenReturn(Optional.of(draftWith(basics)));
        when(mediaService.validateOwnedReadyMedia(owner, media.getId())).thenReturn(media);

        onboardingMediaService.associateReadyMedia("basics", media.getId());

        assertEquals(List.of(media), basics.getMediaAssets());
        verify(mediaService).validateOwnedReadyMedia(owner, media.getId());
        verify(onboardingStepRepository).save(basics);
    }

    @Test
    void associationRequiresAValidPersonaStep() {
        when(authenticatedPersonaProvider.current()).thenReturn(owner);

        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> onboardingMediaService.associateReadyMedia("room", "media-1")
        );

        assertEquals(OnboardingException.INVALID_STEP, exception.getCode());
        verify(mediaService, never()).validateOwnedReadyMedia(owner, "media-1");
    }

    @Test
    void associationRejectsCrossUserMediaWithoutCreatingRelationship() {
        when(authenticatedPersonaProvider.current()).thenReturn(owner);
        when(onboardingDraftRepository.findForOwner(
                owner.userId(),
                owner.persona().name(),
                OnboardingStepRegistry.CURRENT_VERSION
        )).thenReturn(Optional.of(draftWith(basics)));
        when(mediaService.validateOwnedReadyMedia(owner, "media-2"))
                .thenThrow(MediaException.notOwned());

        MediaException exception = assertThrows(
                MediaException.class,
                () -> onboardingMediaService.associateReadyMedia("basics", "media-2")
        );

        assertEquals(MediaException.MEDIA_NOT_OWNED, exception.getCode());
        assertEquals(List.of(), basics.getMediaAssets());
        verify(onboardingStepRepository, never()).save(basics);
    }

    private OnboardingDraft draftWith(OnboardingStep step) {
        OnboardingDraft draft = new OnboardingDraft();
        draft.setSteps(List.of(step));
        return draft;
    }

    private MediaAsset readyMedia() {
        MediaAsset media = new MediaAsset();
        media.setId("media-1");
        media.setOwnerId(owner.userId());
        media.setOwnerPersona(owner.persona());
        media.setMediaType(MediaType.PROFILE_IMAGE);
        media.setStatus(MediaStatus.READY);
        return media;
    }
}
