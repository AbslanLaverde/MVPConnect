package com.mint.authsession;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Component
public class RefreshCredentialGenerator {
    private final SecureRandom random = new SecureRandom();

    public RefreshSecret generate() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return new RefreshSecret(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    public String hash(String raw) {
        // Only accept the credential shape we issue; bound attacker-controlled input.
        if (raw == null || !raw.matches("[A-Za-z0-9_-]{43}")) {
            throw new SessionAuthException(AuthFailure.INVALID_CREDENTIAL);
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 unavailable");
        }
    }

    public boolean matches(String first, String second) {
        return first != null && second != null && MessageDigest.isEqual(
                first.getBytes(StandardCharsets.US_ASCII), second.getBytes(StandardCharsets.US_ASCII));
    }
}
