package com.mint.dto.onboarding.promoter;

import com.mint.onboarding.taxonomy.PromoterGoal;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record PromoterGoalsStepRequest(@NotEmpty List<PromoterGoal> connectionGoals) {

    public PromoterGoalsStepRequest {
        connectionGoals = list(connectionGoals);
    }
}
