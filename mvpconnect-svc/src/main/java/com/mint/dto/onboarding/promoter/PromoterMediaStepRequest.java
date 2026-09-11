package com.mint.dto.onboarding.promoter;

import com.mint.dto.onboarding.shared.MediaReferenceDto;
import com.mint.dto.onboarding.shared.ExternalConnectionReferenceDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record PromoterMediaStepRequest(
        @Valid MediaReferenceDto bannerImage,
        @Size(max = 10) List<@Valid MediaReferenceDto> galleryImages,
        @Valid ExternalConnectionReferenceDto instagramConnection,
        @Valid ExternalConnectionReferenceDto facebookConnection,
        @Valid ExternalConnectionReferenceDto tiktokConnection) {

    public PromoterMediaStepRequest {
        galleryImages = list(galleryImages);
    }

    public PromoterMediaStepRequest(
            MediaReferenceDto bannerImage,
            List<MediaReferenceDto> galleryImages) {
        this(bannerImage, galleryImages, null, null, null);
    }
}
