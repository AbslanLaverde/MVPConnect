package com.mint.dto.response.discovery;

import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.dto.response.profile.PublicVenueLocationResponse;

import java.util.List;

public record VenueSearchResultResponse(
        String id,
        String venueName,
        PublicVenueLocationResponse location,
        Integer capacity,
        List<String> genrePreferences,
        List<String> ambience,
        PublicProfileMediaResponse profileImage) {
}
