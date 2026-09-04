package com.mint.dto.onboarding.venue;

import com.mint.dto.onboarding.shared.MediaReferenceDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingConstraints.URL_MAX;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record VenueMediaStepRequest(
        @Valid MediaReferenceDto bannerImage,
        @Size(max = URL_MAX) String websiteUrl,
        List<@Valid MediaReferenceDto> galleryImages) {

    public VenueMediaStepRequest {
        websiteUrl = string(websiteUrl);
        galleryImages = list(galleryImages);
    }
}
