package com.mint.dto.response.venueidentity;

import com.mint.nodes.VenueIdentity;
import com.mint.venueidentity.VenueIdentityResolutionStatus;
import com.mint.venueidentity.VenueIdentitySource;

public record VenueIdentityResponse(
        String id,
        String name,
        VenueIdentitySource source,
        VenueIdentityResolutionStatus resolutionStatus,
        String googlePlaceId,
        String googleMapsUri,
        String providerWebsiteUrl,
        String googleBusinessStatus,
        VenueIdentityLocationResponse location,
        VenuePhotoPresentationResponse photo) {

    public static VenueIdentityResponse from(VenueIdentity identity) {
        return from(identity, null);
    }

    public static VenueIdentityResponse from(
            VenueIdentity identity,
            VenuePhotoPresentationResponse photo) {
        return new VenueIdentityResponse(
                identity.getId(),
                identity.getName(),
                identity.getSource(),
                identity.getResolutionStatus(),
                identity.getGooglePlaceId(),
                identity.getGoogleMapsUri(),
                identity.getProviderWebsiteUrl(),
                identity.getGoogleBusinessStatus(),
                location(identity),
                photo
        );
    }

    private static VenueIdentityLocationResponse location(VenueIdentity identity) {
        return new VenueIdentityLocationResponse(
                identity.getLocationDisplay(),
                identity.getLocationAddressLine1(),
                identity.getLocationAddressLine2(),
                identity.getLocationCity(),
                identity.getLocationState(),
                identity.getLocationPostalCode(),
                identity.getLocationCountry(),
                identity.getLocationLatitude(),
                identity.getLocationLongitude(),
                identity.getLocationNeighborhood()
        );
    }
}
