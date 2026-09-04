package com.mint.dto.response.profile;

public record PublicLocationResponse(
        String displayName,
        String city,
        String state,
        String country,
        String neighborhood) {
}
