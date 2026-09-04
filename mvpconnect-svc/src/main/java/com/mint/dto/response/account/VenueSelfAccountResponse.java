package com.mint.dto.response.account;

import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.onboarding.PersonaOnboardingStatus;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.taxonomy.BookingMethod;
import com.mint.onboarding.taxonomy.DrawRangeCode;
import com.mint.onboarding.taxonomy.PaAvailability;
import com.mint.onboarding.taxonomy.SoundEngineerAvailability;
import com.mint.onboarding.taxonomy.VenueBookingStatus;

import java.time.LocalDateTime;
import java.util.List;

public record VenueSelfAccountResponse(
        String id,
        PersonaType persona,
        String displayName,
        String email,
        String description,
        SelfLocationResponse location,
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
        String typicalBudget,
        Boolean liveMusic,
        VenueBookingStatus bookingStatus,
        BookingMethod bookingMethod,
        DrawRangeCode desiredArtistDraw,
        List<String> connectionGoals,
        String websiteUrl,
        String bookingEmail,
        PersonaOnboardingStatus onboardingStatus,
        LocalDateTime onboardingCompletedAt,
        Integer onboardingVersion,
        PublicProfileMediaResponse profileImage) implements SelfAccountResponse {
}
