package com.mint.services;

import com.mint.dto.response.account.SelfLocationResponse;
import com.mint.dto.response.profile.PublicLocationResponse;
import com.mint.dto.response.profile.PublicVenueLocationResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import org.springframework.stereotype.Component;

@Component
public class ProfileLocationMapper {

    public PublicLocationResponse publicLocation(Musician musician) {
        return regionalLocation(
                musician.getLocationCity(),
                musician.getLocationState(),
                musician.getLocationCountry(),
                musician.getLocationNeighborhood()
        );
    }

    public PublicLocationResponse publicLocation(Promoter promoter) {
        return regionalLocation(
                promoter.getLocationCity(),
                promoter.getLocationState(),
                promoter.getLocationCountry(),
                promoter.getLocationNeighborhood()
        );
    }

    public PublicVenueLocationResponse publicLocation(Venue venue) {
        return new PublicVenueLocationResponse(
                firstPresent(venue.getLocationDisplay(), venue.getLocation()),
                venue.getLocationAddressLine1(),
                venue.getLocationAddressLine2(),
                venue.getLocationCity(),
                venue.getLocationState(),
                venue.getLocationPostalCode(),
                venue.getLocationCountry(),
                venue.getLocationNeighborhood(),
                venue.getLocationLatitude(),
                venue.getLocationLongitude()
        );
    }

    public SelfLocationResponse selfLocation(Musician musician) {
        return selfLocation(
                firstPresent(musician.getLocationDisplay(), musician.getLocation()), musician.getLocationAddressLine1(),
                musician.getLocationAddressLine2(), musician.getLocationCity(),
                musician.getLocationState(), musician.getLocationPostalCode(),
                musician.getLocationCountry(), musician.getLocationLatitude(),
                musician.getLocationLongitude(), musician.getLocationNeighborhood(),
                musician.getLocationPlaceId()
        );
    }

    public SelfLocationResponse selfLocation(Venue venue) {
        return selfLocation(
                firstPresent(venue.getLocationDisplay(), venue.getLocation()), venue.getLocationAddressLine1(),
                venue.getLocationAddressLine2(), venue.getLocationCity(),
                venue.getLocationState(), venue.getLocationPostalCode(),
                venue.getLocationCountry(), venue.getLocationLatitude(),
                venue.getLocationLongitude(), venue.getLocationNeighborhood(),
                venue.getLocationPlaceId()
        );
    }

    public SelfLocationResponse selfLocation(Promoter promoter) {
        return selfLocation(
                firstPresent(promoter.getLocationDisplay(), promoter.getLocation()), promoter.getLocationAddressLine1(),
                promoter.getLocationAddressLine2(), promoter.getLocationCity(),
                promoter.getLocationState(), promoter.getLocationPostalCode(),
                promoter.getLocationCountry(), promoter.getLocationLatitude(),
                promoter.getLocationLongitude(), promoter.getLocationNeighborhood(),
                promoter.getLocationPlaceId()
        );
    }

    private PublicLocationResponse regionalLocation(
            String city,
            String state,
            String country,
            String neighborhood) {
        return new PublicLocationResponse(
                regionalDisplay(city, state, country),
                city,
                state,
                country,
                neighborhood
        );
    }

    private SelfLocationResponse selfLocation(
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
        return new SelfLocationResponse(
                displayName, addressLine1, addressLine2, city, state, postalCode,
                country, latitude, longitude, neighborhood, placeId
        );
    }

    private String firstPresent(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred;
    }

    private String regionalDisplay(String city, String state, String country) {
        if (city != null && !city.isBlank() && state != null && !state.isBlank()) {
            return city + ", " + state;
        }
        if (city != null && !city.isBlank()) {
            return city;
        }
        if (state != null && !state.isBlank()) {
            return state;
        }
        return country == null || country.isBlank() ? null : country;
    }
}
