package com.mint.dto.response.venueidentity;

import com.mint.googleplaces.GoogleVenueIdentityData;

public record GoogleVenueSearchResponse(
        String providerPlaceId,
        String name,
        String googleMapsUri,
        String providerWebsiteUrl,
        String googleBusinessStatus,
        VenueIdentityLocationResponse location,
        VenuePhotoPresentationResponse photo) {

    public static GoogleVenueSearchResponse from(GoogleVenueIdentityData venue) {
        return new GoogleVenueSearchResponse(
                venue.googlePlaceId(),
                venue.name(),
                venue.googleMapsUri(),
                venue.websiteUri(),
                venue.businessStatus(),
                new VenueIdentityLocationResponse(
                        venue.locationDisplay(),
                        venue.locationAddressLine1(),
                        venue.locationAddressLine2(),
                        venue.locationCity(),
                        venue.locationState(),
                        venue.locationPostalCode(),
                        venue.locationCountry(),
                        venue.locationLatitude(),
                        venue.locationLongitude(),
                        venue.locationNeighborhood()
                ),
                VenuePhotoPresentationResponse.from(venue.photo())
        );
    }
}
