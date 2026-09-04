package com.mint.controllers;

import com.mint.services.OnboardingMediaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/onboarding")
public class OnboardingMediaController {

    private final OnboardingMediaService onboardingMediaService;

    public OnboardingMediaController(OnboardingMediaService onboardingMediaService) {
        this.onboardingMediaService = onboardingMediaService;
    }

    @PostMapping("/steps/{stepKey}/media/{mediaId}")
    public ResponseEntity<Void> associateMedia(
            @PathVariable String stepKey,
            @PathVariable String mediaId) {
        onboardingMediaService.associateReadyMedia(stepKey, mediaId);
        return ResponseEntity.noContent().build();
    }
}
