package com.mint.dto.request;

import com.mint.dto.onboarding.shared.LocationDto;
import com.mint.venueidentity.GoogleAttemptStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateFreeFormVenueIdentityRequest(
        @NotBlank @Size(max = 255) String displayName,
        @NotNull GoogleAttemptStatus googleAttemptStatus,
        @Valid LocationDto location) {
}
