package com.mint.dto.onboarding.shared;

import java.util.List;

public final class OnboardingNormalization {

    private OnboardingNormalization() {
    }

    public static String string(String value) {
        if (value == null) return null;
        String normalized = value.strip();
        return normalized.isEmpty() ? null : normalized;
    }

    public static <T> List<T> list(List<T> value) {
        return value == null ? List.of() : List.copyOf(value);
    }
}
