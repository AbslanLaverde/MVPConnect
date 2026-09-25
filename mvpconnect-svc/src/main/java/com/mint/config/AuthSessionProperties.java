package com.mint.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@Getter
@Setter
@ConfigurationProperties(prefix = "auth.session")
public class AuthSessionProperties {
    private Duration accessTtl = Duration.ofMinutes(30);
    private Duration inactivityTtl = Duration.ofDays(30);
    private Duration absoluteTtl = Duration.ofDays(90);
    private String issuer;
    private String audience;
    // Separate from legacy jwt.secret, which remains raw UTF-8 throughout compatibility.
    private String signingKeyBase64;

    public void validate() {
        if (issuer == null || issuer.isBlank() || audience == null || audience.isBlank()) {
            throw new IllegalStateException("Auth session issuer and audience are required");
        }
        bounded(accessTtl, Duration.ofMinutes(30));
        bounded(inactivityTtl, Duration.ofDays(30));
        bounded(absoluteTtl, Duration.ofDays(90));
        if (inactivityTtl.compareTo(absoluteTtl) > 0) {
            throw new IllegalStateException("Auth session inactivity TTL exceeds absolute TTL");
        }
    }

    private void bounded(Duration value, Duration maximum) {
        if (value == null || value.compareTo(Duration.ofSeconds(1)) < 0 || value.compareTo(maximum) > 0) {
            throw new IllegalStateException("Auth session TTL is outside supported bounds");
        }
    }
}
