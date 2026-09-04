package com.mint.dto.onboarding.venue;

import com.mint.dto.onboarding.shared.LocationDto;
import com.mint.dto.onboarding.shared.MediaReferenceDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import static com.mint.dto.onboarding.shared.OnboardingConstraints.BIO_MAX;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record VenueRoomStepRequest(
        @NotNull @Valid MediaReferenceDto profileImage,
        @Size(max = BIO_MAX) String description,
        @NotNull @Valid LocationDto location,
        @NotNull @Positive @Max(100000) Integer capacity) {

    public VenueRoomStepRequest {
        description = string(description);
    }
}
