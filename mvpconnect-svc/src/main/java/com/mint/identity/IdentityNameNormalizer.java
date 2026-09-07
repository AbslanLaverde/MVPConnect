package com.mint.identity;

import java.util.Locale;

public final class IdentityNameNormalizer {

    private IdentityNameNormalizer() {
    }

    public static String displayName(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    public static String normalize(String value) {
        return displayName(value).toLowerCase(Locale.ROOT);
    }
}
