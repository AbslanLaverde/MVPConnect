package com.mint.dto.onboarding.shared;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import static com.mint.dto.onboarding.shared.OnboardingConstraints.ADDRESS_LINE_MAX;
import static com.mint.dto.onboarding.shared.OnboardingConstraints.CITY_MAX;
import static com.mint.dto.onboarding.shared.OnboardingConstraints.COUNTRY_MAX;
import static com.mint.dto.onboarding.shared.OnboardingConstraints.LOCATION_DISPLAY_MAX;
import static com.mint.dto.onboarding.shared.OnboardingConstraints.NEIGHBORHOOD_MAX;
import static com.mint.dto.onboarding.shared.OnboardingConstraints.POSTAL_CODE_MAX;
import static com.mint.dto.onboarding.shared.OnboardingConstraints.STATE_MAX;
import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record LocationDto(
        @NotBlank @Size(max = LOCATION_DISPLAY_MAX) String displayName,
        @Size(max = ADDRESS_LINE_MAX) String addressLine1,
        @Size(max = ADDRESS_LINE_MAX) String addressLine2,
        @NotBlank @Size(max = CITY_MAX) String city,
        @NotBlank @Size(max = STATE_MAX) String state,
        @Size(max = POSTAL_CODE_MAX) String postalCode,
        @NotBlank @Size(max = COUNTRY_MAX) String country,
        @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
        @Size(max = NEIGHBORHOOD_MAX) String neighborhood,
        @Size(max = 255) String placeId) {

    public LocationDto {
        displayName = string(displayName);
        addressLine1 = string(addressLine1);
        addressLine2 = string(addressLine2);
        city = string(city);
        state = string(state);
        postalCode = string(postalCode);
        country = string(country);
        neighborhood = string(neighborhood);
        placeId = string(placeId);
    }
}
