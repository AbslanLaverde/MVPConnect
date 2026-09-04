package com.mint.dto.response.location;

public record ResolvedLocationResponse(
        String displayName,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String country,
        Double latitude,
        Double longitude,
        String neighborhood,
        String placeId
) {
}
