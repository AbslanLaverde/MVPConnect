package com.mint.dto.response.venueidentity;

import com.mint.googleplaces.GooglePhotoAuthorAttributionData;

public record VenuePhotoAuthorAttributionResponse(
        String displayName,
        String uri,
        String photoUri) {

    public static VenuePhotoAuthorAttributionResponse from(GooglePhotoAuthorAttributionData attribution) {
        return new VenuePhotoAuthorAttributionResponse(
                attribution.displayName(),
                attribution.uri(),
                attribution.photoUri()
        );
    }
}
