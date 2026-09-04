package com.mint.dto.response.profile;

import com.mint.onboarding.taxonomy.PromoterAcceptingStatus;
import com.mint.onboarding.taxonomy.RosterSizeRange;

import java.util.List;

public record PublicPromoterProfileResponse(
        String id,
        String businessName,
        String bio,
        String websiteUrl,
        PublicLocationResponse location,
        List<String> genreSpecialties,
        List<String> eventTypes,
        List<String> vibePreferences,
        PromoterAcceptingStatus acceptingStatus,
        RosterSizeRange rosterSizeRange,
        List<String> connectionGoals,
        PublicProfileMediaResponse profileImage) {
}
