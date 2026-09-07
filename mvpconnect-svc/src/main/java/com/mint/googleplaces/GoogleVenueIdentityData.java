package com.mint.googleplaces;

public record GoogleVenueIdentityData(
        String googlePlaceId,
        String name,
        String googleMapsUri,
        String websiteUri,
        String businessStatus,
        String locationDisplay,
        String locationAddressLine1,
        String locationAddressLine2,
        String locationCity,
        String locationState,
        String locationPostalCode,
        String locationCountry,
        Double locationLatitude,
        Double locationLongitude,
        String locationNeighborhood,
        GooglePhotoPresentationData photo) {
}
