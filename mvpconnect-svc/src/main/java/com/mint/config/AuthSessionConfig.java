package com.mint.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import io.jsonwebtoken.Jwts;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

@Configuration
@EnableConfigurationProperties(AuthSessionProperties.class)
public class AuthSessionConfig {
    // Fingerprint of the checked-in legacy LOCAL fallback, not a production key.
    private static final String UNSAFE_LOCAL_KEY_SHA256 =
            "3354cfcf65c7b2e6840ea6f880aede239750cb1d063950c4e8fd9fbf9ec73a32";

    @Bean
    public Clock authSessionClock() { return Clock.systemUTC(); }

    @Bean
    public SecretKey sessionSigningKey(AuthSessionProperties properties, Environment environment) {
        properties.validate();
        String configured = properties.getSigningKeyBase64();
        // Local-only convenience, never a checked-in new signing key. Restart loses local sessions.
        boolean exclusivelyLocal = Arrays.equals(environment.getActiveProfiles(), new String[]{"local"});
        if ((configured == null || configured.isBlank()) && exclusivelyLocal) {
            return Jwts.SIG.HS512.key().build();
        }
        try {
            if (configured == null || configured.isBlank()) throw new IllegalArgumentException();
            byte[] decoded = Base64.getDecoder().decode(configured);
            String fingerprint = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(decoded));
            if (decoded.length < 64 || UNSAFE_LOCAL_KEY_SHA256.equals(fingerprint)) {
                throw new IllegalArgumentException();
            }
            return new SecretKeySpec(decoded, "HmacSHA512");
        } catch (IllegalArgumentException | NoSuchAlgorithmException failure) {
            // Do not include the configured value, cause, or rejected binding value.
            throw new IllegalStateException("A strong, non-development Base64 auth session signing key is required");
        }
    }
}
