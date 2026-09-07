package com.mint.externalartist;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ExternalArtistNameNormalizerTest {

    @Test
    void trimsLowercasesAndCollapsesInternalWhitespace() {
        assertEquals("The National", ExternalArtistNameNormalizer.displayName("  The   National "));
        assertEquals("the national", ExternalArtistNameNormalizer.normalize("  The   National "));
    }
}
