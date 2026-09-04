package com.mint.onboarding;

public record OnboardingStepDefinition(String key, int position, boolean required) {

    public OnboardingStepDefinition {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("Onboarding step key is required");
        }
        if (position < 1) {
            throw new IllegalArgumentException("Onboarding step position must be positive");
        }
    }
}
