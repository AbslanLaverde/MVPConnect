package com.mint.googleplaces;

import java.util.List;

public record GooglePhotoPresentationData(
        String url,
        List<GooglePhotoAuthorAttributionData> authorAttributions,
        String googleMapsUri) {

    public GooglePhotoPresentationData {
        authorAttributions = authorAttributions == null ? List.of() : List.copyOf(authorAttributions);
    }
}
