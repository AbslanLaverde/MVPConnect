package com.mint.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.env.Environment;

import java.net.URI;
import java.util.Arrays;
import java.util.Set;

@Getter
@Setter
@ConfigurationProperties(prefix = "auth.session.http")
public class AuthSessionHttpProperties {
    private String cookieName = "__Secure-mvp-refresh";
    private String cookiePath = "/auth";
    private boolean cookieSecure = true;
    private String cookieSameSite = "Lax";

    public void validate(CorsProperties cors, Environment environment) {
        boolean local = Arrays.equals(environment.getActiveProfiles(), new String[]{"local"});
        if (cookieName == null || !cookieName.matches("[A-Za-z0-9_-]+")
                || cookiePath == null || !cookiePath.matches("(?:/[A-Za-z0-9_-]+)*/auth")
                || cookieSameSite == null || !Set.of("Lax", "Strict", "None").contains(cookieSameSite)
                || ("None".equals(cookieSameSite) && !cookieSecure)
                || (cookieName.startsWith("__Secure-") && !cookieSecure)
                || cookieName.startsWith("__Host-")) {
            throw new IllegalStateException("Invalid auth refresh cookie configuration");
        }
        if (!local && (!cookieSecure || !cookieName.startsWith("__Secure-"))) {
            throw new IllegalStateException("Production auth refresh cookies require Secure and a __Secure- name");
        }
        if (cors.getAllowedOrigins() == null || cors.getAllowedOrigins().isEmpty()) {
            throw new IllegalStateException("Explicit trusted Web origins are required");
        }
        for (String origin : cors.getAllowedOrigins()) {
            try {
                URI uri = URI.create(origin);
                if (uri.getHost() == null || uri.getUserInfo() != null || uri.getRawQuery() != null
                        || uri.getRawFragment() != null || !uri.getRawPath().isEmpty()
                        || !("https".equals(uri.getScheme()) || (local && "http".equals(uri.getScheme())))
                        || origin.contains("*") || !origin.equals(uri.getScheme() + "://" + uri.getRawAuthority())) {
                    throw new IllegalArgumentException();
                }
            } catch (RuntimeException invalid) {
                throw new IllegalStateException("Trusted Web origins must be exact HTTPS origins (HTTP only in local)");
            }
        }
    }
}
