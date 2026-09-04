package com.mint.dto.response;

import java.util.List;

public record OnboardingCompletionStepError(
        String key,
        List<OnboardingFieldError> errors) {
}
