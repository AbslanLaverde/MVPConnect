package com.mint.dto.onboarding.shared;

import com.mint.onboarding.taxonomy.EntityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import static com.mint.dto.onboarding.shared.OnboardingConstraints.ENTITY_DISPLAY_NAME_MAX;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record EntityReferenceDto(
        @NotNull EntityType entityType,
        @Size(max = 255) String entityId,
        @NotBlank @Size(max = ENTITY_DISPLAY_NAME_MAX) String displayName,
        Boolean external) {

    public EntityReferenceDto {
        entityId = string(entityId);
        displayName = string(displayName);
    }
}
