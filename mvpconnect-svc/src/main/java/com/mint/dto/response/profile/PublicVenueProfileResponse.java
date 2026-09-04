package com.mint.dto.response.profile;

import com.mint.onboarding.taxonomy.BookingMethod;
import com.mint.onboarding.taxonomy.DrawRangeCode;
import com.mint.onboarding.taxonomy.PaAvailability;
import com.mint.onboarding.taxonomy.SoundEngineerAvailability;
import com.mint.onboarding.taxonomy.VenueBookingStatus;

import java.util.List;

public record PublicVenueProfileResponse(
        String id,
        String venueName,
        String description,
        PublicVenueLocationResponse location,
        Integer capacity,
        List<String> genrePreferences,
        List<String> ambience,
        List<String> eventTypes,
        Double stageWidthFeet,
        Double stageDepthFeet,
        SoundEngineerAvailability soundEngineerAvailability,
        PaAvailability paAvailability,
        List<String> equipmentAvailable,
        List<String> productionAmenities,
        VenueBookingStatus bookingStatus,
        BookingMethod bookingMethod,
        DrawRangeCode desiredArtistDraw,
        List<String> connectionGoals,
        String websiteUrl,
        PublicProfileMediaResponse profileImage) {
}
