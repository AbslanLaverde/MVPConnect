package com.mint.services;

import com.mint.exceptions.OnboardingException;
import com.mint.nodes.MediaAsset;
import com.mint.nodes.OnboardingDraft;
import com.mint.nodes.OnboardingStep;
import com.mint.onboarding.OnboardingStepRegistry;
import com.mint.repositories.OnboardingDraftRepository;
import com.mint.repositories.OnboardingStepRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;

@Service
public class OnboardingMediaService {

    private final AuthenticatedPersonaProvider authenticatedPersonaProvider;
    private final OnboardingStepRegistry stepRegistry;
    private final OnboardingDraftRepository onboardingDraftRepository;
    private final OnboardingStepRepository onboardingStepRepository;
    private final MediaService mediaService;

    public OnboardingMediaService(
            AuthenticatedPersonaProvider authenticatedPersonaProvider,
            OnboardingStepRegistry stepRegistry,
            OnboardingDraftRepository onboardingDraftRepository,
            OnboardingStepRepository onboardingStepRepository,
            MediaService mediaService) {
        this.authenticatedPersonaProvider = authenticatedPersonaProvider;
        this.stepRegistry = stepRegistry;
        this.onboardingDraftRepository = onboardingDraftRepository;
        this.onboardingStepRepository = onboardingStepRepository;
        this.mediaService = mediaService;
    }

    @Transactional
    public void associateReadyMedia(String stepKey, String mediaId) {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        if (!stepRegistry.contains(owner.persona(), stepKey)) {
            throw OnboardingException.invalidStep(stepKey, owner.persona());
        }

        OnboardingDraft draft = onboardingDraftRepository.findForOwner(
                        owner.userId(),
                        owner.persona().name(),
                        OnboardingStepRegistry.CURRENT_VERSION
                )
                .orElseThrow(() -> OnboardingException.notAvailable(
                        "An active onboarding draft is required before associating media."
                ));
        OnboardingStep step = draft.getSteps().stream()
                .filter(candidate -> stepKey.equals(candidate.getKey()))
                .findFirst()
                .orElseThrow(() -> OnboardingException.draftNotFound(stepKey));
        MediaAsset media = mediaService.validateOwnedReadyMedia(owner, mediaId);

        if (step.getMediaAssets() == null) {
            step.setMediaAssets(new ArrayList<>());
        }
        if (step.getMediaAssets().stream().noneMatch(existing -> mediaId.equals(existing.getId()))) {
            step.getMediaAssets().add(media);
            step.setUpdatedAt(LocalDateTime.now());
            onboardingStepRepository.save(step);
        }
    }
}
