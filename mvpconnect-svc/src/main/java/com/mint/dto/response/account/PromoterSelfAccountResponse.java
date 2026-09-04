package com.mint.dto.response.account;

import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.onboarding.PersonaOnboardingStatus;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.taxonomy.PromoterAcceptingStatus;
import com.mint.onboarding.taxonomy.RosterSizeRange;

import java.time.LocalDateTime;
import java.util.List;

public record PromoterSelfAccountResponse(
        String id,
        PersonaType persona,
        String displayName,
        String email,
        String bio,
        SelfLocationResponse location,
        List<String> genreSpecialties,
        List<String> eventTypes,
        List<String> vibePreferences,
        Boolean acceptingNewArtists,
        Integer currentRosterSize,
        PromoterAcceptingStatus acceptingStatus,
        RosterSizeRange rosterSizeRange,
        List<String> connectionGoals,
        String websiteUrl,
        String phone,
        PersonaOnboardingStatus onboardingStatus,
        LocalDateTime onboardingCompletedAt,
        Integer onboardingVersion,
        PublicProfileMediaResponse profileImage) implements SelfAccountResponse {
}
