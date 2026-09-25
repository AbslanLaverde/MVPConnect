package com.mint.authsession;

import com.mint.config.AuthSessionProperties;
import com.mint.nodes.AuthSession;
import com.mint.onboarding.PersonaType;
import io.jsonwebtoken.Jwts;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicReference;

public final class SessionTestSupport {
    public static final Instant START = Instant.parse("2026-01-01T00:00:00Z");

    public static AuthSessionProperties properties() {
        var properties = new AuthSessionProperties();
        properties.setIssuer("test-mvpconnect");
        properties.setAudience("test-api");
        properties.setSigningKeyBase64(Base64.getEncoder().encodeToString(Jwts.SIG.HS512.key().build().getEncoded()));
        return properties;
    }

    public static AuthSession session(Instant inactivity, Instant absolute) {
        return new AuthSession("session-1", "musician-1", PersonaType.MUSICIAN, SessionTransport.WEB,
                START, START, START, inactivity, absolute, "hash-not-a-secret", null, null);
    }

    public static AuthSession session() {
        return session(START.plus(Duration.ofDays(30)), START.plus(Duration.ofDays(90)));
    }

    public static final class MutableClock extends Clock {
        private final AtomicReference<Instant> now = new AtomicReference<>(START);
        public void set(Instant value) { now.set(value); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(instant(), zone); }
        @Override public Instant instant() { return now.get(); }
    }
}
