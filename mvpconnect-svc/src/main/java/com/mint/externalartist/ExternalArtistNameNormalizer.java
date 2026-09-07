package com.mint.externalartist;

import com.mint.identity.IdentityNameNormalizer;

public final class ExternalArtistNameNormalizer {

    private ExternalArtistNameNormalizer() {
    }

    public static String displayName(String value) {
        return IdentityNameNormalizer.displayName(value);
    }

    public static String normalize(String value) {
        return IdentityNameNormalizer.normalize(value);
    }
}
