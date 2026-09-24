package com.mint.config;

import com.mint.authsession.SessionTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.env.MockEnvironment;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;

class AuthSessionConfigTest {
    private final AuthSessionConfig config = new AuthSessionConfig();

    @Test void defaultsMatchLockedProductLifetimes() {
        var properties = SessionTestSupport.properties();
        assertEquals(Duration.ofMinutes(30), properties.getAccessTtl());
        assertEquals(Duration.ofDays(30), properties.getInactivityTtl());
        assertEquals(Duration.ofDays(90), properties.getAbsoluteTtl());
        assertEquals("Z", config.authSessionClock().getZone().getId());
    }

    @Test void issuerAudienceKeyAndTtlFailFastDuringContextStartup() {
        var properties = SessionTestSupport.properties();
        var runner = new ApplicationContextRunner().withUserConfiguration(AuthSessionConfig.class)
                .withPropertyValues("auth.session.issuer=test", "auth.session.audience=test-api",
                        "auth.session.signing-key-base64=" + properties.getSigningKeyBase64());
        runner.run(context -> assertNull(context.getStartupFailure()));
        for (String bad : new String[]{"auth.session.issuer=", "auth.session.audience=",
                "auth.session.signing-key-base64=", "auth.session.signing-key-base64=not-base64",
                "auth.session.signing-key-base64=" + Base64.getEncoder().encodeToString(new byte[32]),
                "auth.session.access-ttl=31m", "auth.session.inactivity-ttl=31d", "auth.session.absolute-ttl=91d"}) {
            runner.withPropertyValues(bad).run(context -> assertNotNull(context.getStartupFailure()));
        }
    }

    @Test void onlyExplicitlyLocalProfileMayUseAnEphemeralKey() {
        var properties = SessionTestSupport.properties();
        properties.setSigningKeyBase64(null);
        assertThrows(IllegalStateException.class, () -> config.sessionSigningKey(properties, new MockEnvironment()));
        assertThrows(IllegalStateException.class, () -> config.sessionSigningKey(properties,
                new MockEnvironment().withProperty("spring.profiles.active", "production")));
        var local = new MockEnvironment();
        local.setActiveProfiles("local");
        assertFalse(java.util.Arrays.equals(config.sessionSigningKey(properties, local).getEncoded(),
                config.sessionSigningKey(properties, local).getEncoded()));
        local.setActiveProfiles("local", "production");
        assertThrows(IllegalStateException.class, () -> config.sessionSigningKey(properties, local));
    }

    @Test void knownCheckedInLocalFallbackIsRejectedWithoutPrintingIt() throws Exception {
        // This is a deny-list regression only; all crypto tests generate isolated random keys.
        var local = new Properties();
        try (var stream = getClass().getResourceAsStream("/application-local.properties")) { local.load(stream); }
        String placeholder = local.getProperty("jwt.secret");
        String knownUnsafe = placeholder.substring(placeholder.indexOf(':') + 1, placeholder.length() - 1);
        var properties = SessionTestSupport.properties();
        properties.setSigningKeyBase64(Base64.getEncoder().encodeToString(knownUnsafe.getBytes(StandardCharsets.UTF_8)));
        var error = assertThrows(IllegalStateException.class, () -> config.sessionSigningKey(properties, new MockEnvironment()));
        assertFalse(error.getMessage().contains(knownUnsafe));
        assertNull(error.getCause());
    }
}
