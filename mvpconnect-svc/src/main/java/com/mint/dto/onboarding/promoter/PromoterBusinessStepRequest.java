package com.mint.dto.onboarding.promoter;

import com.mint.dto.onboarding.shared.LocationDto;
import com.mint.dto.onboarding.shared.MediaReferenceDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import static com.mint.dto.onboarding.shared.OnboardingConstraints.BIO_MAX;
import static com.mint.dto.onboarding.shared.OnboardingConstraints.PHONE_MAX;
import static com.mint.dto.onboarding.shared.OnboardingConstraints.URL_MAX;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record PromoterBusinessStepRequest(
        @NotNull @Valid MediaReferenceDto profileImage,
        @Size(max = BIO_MAX) String bio,
        @NotNull @Valid LocationDto location,
        @Size(max = URL_MAX) String websiteUrl,
        @Size(max = PHONE_MAX) String phone) {

    public PromoterBusinessStepRequest {
        bio = string(bio);
        websiteUrl = string(websiteUrl);
        phone = string(phone);
    }
}
