package com.mint.dto.response;

import com.mint.onboarding.OnboardingDraftStatus;
import com.mint.onboarding.PersonaType;

import java.time.LocalDateTime;

public record OnboardingCompletionResponse(
        PersonaType persona,
        OnboardingDraftStatus status,
        LocalDateTime onboardingCompletedAt,
        Integer onboardingVersion) {
}
