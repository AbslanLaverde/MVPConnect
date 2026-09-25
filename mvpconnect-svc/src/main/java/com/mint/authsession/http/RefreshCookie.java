package com.mint.authsession.http;

import com.mint.config.AuthSessionHttpProperties;
import com.mint.nodes.AuthSession;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;

import static com.mint.authsession.SessionValidity.earlier;

@Component
public class RefreshCookie {
    private final AuthSessionHttpProperties properties;
    private final Clock clock;

    public RefreshCookie(AuthSessionHttpProperties properties, @Qualifier("authSessionClock") Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public ResponseCookie setRefreshCookie(String rawCredential, AuthSession session) {
        long seconds = Math.max(0, Duration.between(clock.instant(),
                earlier(session.inactivityExpiresAt(), session.absoluteExpiresAt())).getSeconds());
        return builder(rawCredential).maxAge(seconds).build();
    }

    public ResponseCookie clearRefreshCookie() { return builder("").maxAge(0).build(); }

    public String read(HttpServletRequest request) {
        String value = null;
        boolean found = false;
        if (request.getCookies() != null) {
            for (var cookie : request.getCookies()) {
                if (properties.getCookieName().equals(cookie.getName())) {
                    if (found) throw new AuthHttpException(AuthHttpException.Code.AUTH_REQUEST_INVALID);
                    found = true;
                    value = cookie.getValue();
                }
            }
        }
        return value;
    }

    private ResponseCookie.ResponseCookieBuilder builder(String value) {
        // No Domain setter: the credential is always host-only.
        return ResponseCookie.from(properties.getCookieName(), value).httpOnly(true)
                .secure(properties.isCookieSecure()).sameSite(properties.getCookieSameSite()).path(properties.getCookiePath());
    }
}
