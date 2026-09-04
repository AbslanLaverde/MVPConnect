package com.mint.dto.response;

import java.util.List;

public record OnboardingCompletionValidationDetails(
        List<OnboardingCompletionStepError> steps) {
}
