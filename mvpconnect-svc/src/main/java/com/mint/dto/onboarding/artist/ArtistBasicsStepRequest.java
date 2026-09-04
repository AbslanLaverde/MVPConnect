package com.mint.dto.onboarding.artist;

import com.mint.dto.onboarding.shared.LocationDto;
import com.mint.dto.onboarding.shared.MediaReferenceDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import static com.mint.dto.onboarding.shared.OnboardingConstraints.BIO_MAX;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record ArtistBasicsStepRequest(
        @NotNull @Valid MediaReferenceDto profileImage,
        @Size(max = BIO_MAX) String bio,
        @NotNull @Valid LocationDto location) {

    public ArtistBasicsStepRequest {
        bio = string(bio);
    }
}
