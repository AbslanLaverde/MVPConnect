package com.mint.dto.response;

import java.util.List;

public record OnboardingStepValidationDetails(
        String step,
        List<OnboardingFieldError> fields) {
}
