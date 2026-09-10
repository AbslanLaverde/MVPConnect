package com.mint.dto.onboarding.artist;

import com.mint.dto.onboarding.shared.MediaReferenceDto;
import com.mint.dto.onboarding.shared.ArtistIdentityReferenceDto;
import com.mint.dto.onboarding.shared.ExternalConnectionReferenceDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingConstraints.URL_MAX;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record ArtistMediaStepRequest(
        @Valid MediaReferenceDto bannerImage,
        @Size(max = 8) List<@Valid MediaReferenceDto> showcaseImages,
        @Size(max = URL_MAX) String websiteUrl,
        @Valid ExternalConnectionReferenceDto bandcampConnection,
        @Valid ExternalConnectionReferenceDto instagramConnection,
        @Valid ExternalConnectionReferenceDto tiktokConnection,
        @Valid ArtistIdentityReferenceDto spotifyArtistIdentity,
        @Valid ExternalConnectionReferenceDto youtubeConnection,
        @Valid ExternalConnectionReferenceDto soundCloudConnection) {

    public ArtistMediaStepRequest {
        showcaseImages = list(showcaseImages);
        websiteUrl = string(websiteUrl);
    }

    public ArtistMediaStepRequest(
            MediaReferenceDto bannerImage,
            List<MediaReferenceDto> showcaseImages,
            String websiteUrl) {
        this(bannerImage, showcaseImages, websiteUrl, null, null, null, null, null, null);
    }
}
