package com.mint.dto.response.venueidentity;

public record VenueIdentityLocationResponse(
        String displayName,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String country,
        Double latitude,
        Double longitude,
        String neighborhood) {
}
