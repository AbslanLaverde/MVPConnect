package com.mint.dto.onboarding.shared;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record PerformanceMediaReferenceDto(
        @NotBlank @Size(max = 255) String mediaId,
        LocalDate date,
        @Valid EntityReferenceDto venue,
        @Valid LocationDto location,
        @Size(max = 5) List<@Valid EntityReferenceDto> artists) {

    public PerformanceMediaReferenceDto {
        mediaId = string(mediaId);
        artists = list(artists);
    }
}
