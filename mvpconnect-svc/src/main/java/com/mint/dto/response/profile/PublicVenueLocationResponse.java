package com.mint.dto.response.profile;

public record PublicVenueLocationResponse(
        String displayName,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String country,
        String neighborhood,
        Double latitude,
        Double longitude) {
}
