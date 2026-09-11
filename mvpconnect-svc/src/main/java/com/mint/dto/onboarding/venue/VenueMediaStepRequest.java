package com.mint.dto.onboarding.venue;

import com.mint.dto.onboarding.shared.MediaReferenceDto;
import com.mint.dto.onboarding.shared.ExternalConnectionReferenceDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingConstraints.URL_MAX;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record VenueMediaStepRequest(
        @Valid MediaReferenceDto bannerImage,
        @Size(max = URL_MAX) String websiteUrl,
        @Size(max = 10) List<@Valid MediaReferenceDto> galleryImages,
        @Valid ExternalConnectionReferenceDto instagramConnection,
        @Valid ExternalConnectionReferenceDto facebookConnection,
        @Valid ExternalConnectionReferenceDto tiktokConnection) {

    public VenueMediaStepRequest {
        websiteUrl = string(websiteUrl);
        galleryImages = list(galleryImages);
    }

    public VenueMediaStepRequest(
            MediaReferenceDto bannerImage,
            String websiteUrl,
            List<MediaReferenceDto> galleryImages) {
        this(bannerImage, websiteUrl, galleryImages, null, null, null);
    }
}
