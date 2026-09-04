package com.mint.dto.response.account;

import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.onboarding.PersonaOnboardingStatus;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.taxonomy.ArtistBookingStatus;
import com.mint.onboarding.taxonomy.DrawRangeCode;

import java.time.LocalDateTime;
import java.util.List;

public record MusicianSelfAccountResponse(
        String id,
        PersonaType persona,
        String displayName,
        String email,
        String bio,
        SelfLocationResponse location,
        List<String> genres,
        List<String> vibes,
        List<String> eventTypes,
        String minimumFee,
        Boolean willingToTravel,
        ArtistBookingStatus bookingStatus,
        DrawRangeCode typicalDraw,
        Integer travelRadiusMiles,
        Boolean touring,
        Integer setLengthMinutes,
        List<String> equipmentBrought,
        List<String> connectionGoals,
        String websiteUrl,
        String instagramHandle,
        PersonaOnboardingStatus onboardingStatus,
        LocalDateTime onboardingCompletedAt,
        Integer onboardingVersion,
        PublicProfileMediaResponse profileImage) implements SelfAccountResponse {
}
