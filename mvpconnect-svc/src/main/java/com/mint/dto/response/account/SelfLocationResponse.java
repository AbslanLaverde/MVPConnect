package com.mint.dto.response.account;

public record SelfLocationResponse(
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
        String placeId) {
}
