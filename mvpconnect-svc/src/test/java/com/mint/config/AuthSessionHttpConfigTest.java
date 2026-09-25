package com.mint.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.junit.jupiter.api.Assertions.*;

class AuthSessionHttpConfigTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(AuthSessionHttpConfig.class)
            .withPropertyValues("cors.allowed-origins=https://app.example.test");

    @Test void secureProductionDefaultsAndExplicitOriginsBind() {
        runner.run(context -> {
            assertNull(context.getStartupFailure());
            var properties = context.getBean(AuthSessionHttpProperties.class);
            assertEquals("__Secure-mvp-refresh", properties.getCookieName());
            assertEquals("/auth", properties.getCookiePath());
            assertEquals("Lax", properties.getCookieSameSite());
            assertTrue(properties.isCookieSecure());
        });
        runner.withPropertyValues("auth.session.http.cookie-same-site=None")
                .run(context -> assertNull(context.getStartupFailure()));
    }

    @Test void dangerousProductionSettingsFailStartup() {
        for (String setting : new String[]{"auth.session.http.cookie-secure=false",
                "auth.session.http.cookie-name=mvp-refresh-local", "auth.session.http.cookie-name=__Host-invalid",
                "auth.session.http.cookie-path=/", "auth.session.http.cookie-same-site=bogus",
                "cors.allowed-origins=*", "cors.allowed-origins=", "cors.allowed-origins=null",
                "cors.allowed-origins=http://app.example.test", "cors.allowed-origins=https://app.example.test/path",
                "cors.allowed-origins=https://*.example.test", "cors.allowed-origins=https://user@app.example.test"}) {
            runner.withPropertyValues(setting).run(context -> assertNotNull(context.getStartupFailure(), setting));
        }
    }

    @Test void insecureLocalCookieRequiresSoleLocalProfileAndDistinctName() {
        var local = runner.withPropertyValues("spring.profiles.active=local",
                "auth.session.http.cookie-secure=false", "auth.session.http.cookie-name=mvp-refresh-local",
                "cors.allowed-origins=http://localhost:8081");
        local.run(context -> assertNull(context.getStartupFailure()));
        local.withPropertyValues("auth.session.http.cookie-name=__Secure-mvp-refresh")
                .run(context -> assertNotNull(context.getStartupFailure()));
        local.withPropertyValues("auth.session.http.cookie-same-site=None")
                .run(context -> assertNotNull(context.getStartupFailure()));
        local.withPropertyValues("spring.profiles.active=local,production")
                .run(context -> assertNotNull(context.getStartupFailure()));
    }
}
