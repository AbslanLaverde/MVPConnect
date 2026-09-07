package com.mint.dto.onboarding.shared;

import java.util.ArrayList;
import java.util.Collections;
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

    /**
     * Creates an immutable list while retaining null elements long enough for Bean Validation
     * to report their exact indexes as structured field errors.
     */
    public static <T> List<T> validationList(List<T> value) {
        return value == null
                ? List.of()
                : Collections.unmodifiableList(new ArrayList<>(value));
    }
}
