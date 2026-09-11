package com.mint.dto.onboarding.shared;

import com.mint.externalconnection.ExternalProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record ExternalConnectionReferenceDto(
        @NotBlank @Size(max = 255) String connectionId,
        @NotNull ExternalProvider provider) {

    public ExternalConnectionReferenceDto {
        connectionId = string(connectionId);
    }
}
