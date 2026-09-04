package com.mint.dto.onboarding.artist;

import com.mint.onboarding.taxonomy.ArtistGoal;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record ArtistGoalsStepRequest(@NotEmpty List<ArtistGoal> connectionGoals) {

    public ArtistGoalsStepRequest {
        connectionGoals = list(connectionGoals);
    }
}
