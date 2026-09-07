package com.mint.externalartist;

import java.util.Locale;

public final class ExternalArtistNameNormalizer {

    private ExternalArtistNameNormalizer() {
    }

    public static String displayName(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    public static String normalize(String value) {
        return displayName(value).toLowerCase(Locale.ROOT);
    }
}
