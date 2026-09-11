package com.mint.security;

import com.mint.config.TokenEncryptionProperties;
import com.mint.exceptions.ExternalConnectionException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TokenEncryptionServiceTest {

    @Test
    void aesGcmRoundTripUsesVersionedRandomAuthenticatedCiphertext() {
        TokenEncryptionService service = service();

        String first = service.encrypt("provider-token", "artist-1:YOUTUBE:access");
        String second = service.encrypt("provider-token", "artist-1:YOUTUBE:access");

        assertFalse(first.contains("provider-token"));
        assertFalse(first.equals(second));
        assertEquals("provider-token", service.decrypt(first, "artist-1:YOUTUBE:access"));
    }

    @Test
    void tamperOrAssociatedDataMismatchFailsClosed() {
        TokenEncryptionService service = service();
        String encrypted = service.encrypt("provider-token", "artist-1:YOUTUBE:access");

        ExternalConnectionException exception = assertThrows(
                ExternalConnectionException.class,
                () -> service.decrypt(encrypted, "artist-2:YOUTUBE:access"));

        assertEquals("OAUTH_CREDENTIAL_ERROR", exception.getCode());
    }

    @Test
    void missingKeyFailsOnlyWhenEncryptionIsInvoked() {
        TokenEncryptionProperties properties = new TokenEncryptionProperties();
        TokenEncryptionService service = new TokenEncryptionService(properties);

        ExternalConnectionException exception = assertThrows(
                ExternalConnectionException.class,
                () -> service.encrypt("provider-token", "aad"));

        assertEquals("OAUTH_ENCRYPTION_UNAVAILABLE", exception.getCode());
    }

    private TokenEncryptionService service() {
        TokenEncryptionProperties properties = new TokenEncryptionProperties();
        properties.setKeyVersion(7);
        properties.setKeyBase64(Base64.getEncoder().encodeToString(
                "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8)));
        return new TokenEncryptionService(properties);
    }
}
