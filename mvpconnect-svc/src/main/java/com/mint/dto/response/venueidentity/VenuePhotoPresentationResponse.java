package com.mint.dto.response.venueidentity;

import com.mint.googleplaces.GooglePhotoPresentationData;

import java.util.List;

public record VenuePhotoPresentationResponse(
        String url,
        List<VenuePhotoAuthorAttributionResponse> authorAttributions,
        String googleMapsUri) {

    public VenuePhotoPresentationResponse {
        authorAttributions = authorAttributions == null ? List.of() : List.copyOf(authorAttributions);
    }

    public static VenuePhotoPresentationResponse from(GooglePhotoPresentationData photo) {
        if (photo == null) {
            return null;
        }
        return new VenuePhotoPresentationResponse(
                photo.url(),
                photo.authorAttributions().stream()
                        .map(VenuePhotoAuthorAttributionResponse::from)
                        .toList(),
                photo.googleMapsUri()
        );
    }
}
