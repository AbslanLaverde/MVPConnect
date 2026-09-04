package com.mint.dto.onboarding.venue;

import com.mint.onboarding.taxonomy.VenueGoal;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record VenueGoalsStepRequest(@NotEmpty List<VenueGoal> connectionGoals) {

    public VenueGoalsStepRequest {
        connectionGoals = list(connectionGoals);
    }
}
