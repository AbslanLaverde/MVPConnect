package com.mint.dto.onboarding.shared;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record MediaReferenceDto(@NotBlank @Size(max = 255) String mediaId) {

    public MediaReferenceDto {
        mediaId = string(mediaId);
    }
}
