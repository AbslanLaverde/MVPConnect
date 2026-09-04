package com.mint.onboarding;

import java.util.Locale;

public enum PersonaType {
    MUSICIAN,
    VENUE,
    PROMOTER;

    public static PersonaType from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Persona type is required");
        }
        return valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
