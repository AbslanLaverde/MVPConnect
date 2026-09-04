package com.mint.controllers;

import com.mint.dto.request.SaveOnboardingStepRequest;
import com.mint.dto.response.OnboardingCompletionResponse;
import com.mint.dto.response.OnboardingStateResponse;
import com.mint.dto.response.OnboardingStepResponse;
import com.mint.services.OnboardingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/onboarding")
public class OnboardingController {

    private final OnboardingService onboardingService;

    public OnboardingController(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    @GetMapping
    public ResponseEntity<OnboardingStateResponse> getOnboarding() {
        return ResponseEntity.ok(onboardingService.getOnboarding());
    }

    @PutMapping("/steps/{stepKey}")
    public ResponseEntity<OnboardingStepResponse> saveStep(
            @PathVariable String stepKey,
            @Valid @RequestBody SaveOnboardingStepRequest request) {
        return ResponseEntity.ok(onboardingService.saveStep(stepKey, request));
    }

    @PostMapping("/steps/{stepKey}/complete")
    public ResponseEntity<OnboardingStateResponse> completeStep(
            @PathVariable String stepKey,
            @Valid @RequestBody SaveOnboardingStepRequest request) {
        return ResponseEntity.ok(onboardingService.completeStep(stepKey, request));
    }

    @PostMapping("/steps/{stepKey}/skip")
    public ResponseEntity<OnboardingStateResponse> skipStep(@PathVariable String stepKey) {
        return ResponseEntity.ok(onboardingService.skipStep(stepKey));
    }

    @PostMapping("/steps/{stepKey}/reopen")
    public ResponseEntity<OnboardingStateResponse> reopenStep(@PathVariable String stepKey) {
        return ResponseEntity.ok(onboardingService.reopenStep(stepKey));
    }

    @PostMapping("/complete")
    public ResponseEntity<OnboardingCompletionResponse> completeOnboarding() {
        return ResponseEntity.ok(onboardingService.completeOnboarding());
    }
}
