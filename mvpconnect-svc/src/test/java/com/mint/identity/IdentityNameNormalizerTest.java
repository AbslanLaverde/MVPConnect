package com.mint.identity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IdentityNameNormalizerTest {

    @Test
    void preservesDisplayCaseAndCreatesCanonicalSearchName() {
        assertEquals("Baby's All Right", IdentityNameNormalizer.displayName("  Baby's   All Right "));
        assertEquals("baby's all right", IdentityNameNormalizer.normalize("  Baby's   All Right "));
    }
}
