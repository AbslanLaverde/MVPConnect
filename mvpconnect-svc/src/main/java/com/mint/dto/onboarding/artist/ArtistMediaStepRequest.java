package com.mint.dto.onboarding.artist;

import com.mint.dto.onboarding.shared.MediaReferenceDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import static com.mint.dto.onboarding.shared.OnboardingConstraints.URL_MAX;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record ArtistMediaStepRequest(
        @Valid MediaReferenceDto bannerImage,
        @Size(max = URL_MAX) String websiteUrl) {

    public ArtistMediaStepRequest {
        websiteUrl = string(websiteUrl);
    }
}
