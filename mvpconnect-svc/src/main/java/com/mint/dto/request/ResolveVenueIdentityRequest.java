package com.mint.dto.request;

import com.mint.venueidentity.VenueIdentityProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResolveVenueIdentityRequest(
        @NotNull VenueIdentityProvider provider,
        @NotBlank @Size(max = 512) String providerPlaceId) {
}
