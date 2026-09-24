package com.mint.security;

import com.mint.authsession.AuthFailure;
import com.mint.authsession.SessionAuthException;
import com.mint.authsession.SessionValidity;
import com.mint.config.AuthSessionProperties;
import com.mint.nodes.AuthSession;
import com.mint.onboarding.PersonaType;
import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/** Cryptography only. SessionAccessTokenService supplies authoritative session validation. */
@Component
public class SessionJwtTokenProvider {
    private final SecretKey key;
    private final AuthSessionProperties properties;
    private final Clock clock;
    private final JwtParser parser;

    public SessionJwtTokenProvider(@Qualifier("sessionSigningKey") SecretKey key,
            AuthSessionProperties properties, @Qualifier("authSessionClock") Clock clock) {
        this.key = key;
        this.properties = properties;
        this.clock = clock;
        var builder = Jwts.parser().verifyWith(key);
        // JJWT 0.12.6 rejects an empty algorithm registry even temporarily (clear()).
        // Remove other algorithms individually, keeping HS512 throughout construction.
        for (var algorithm : Jwts.SIG.get().values()) {
            if (!algorithm.getId().equals(Jwts.SIG.HS512.getId())) builder.sig().remove(algorithm).and();
        }
        this.parser = builder
                .requireIssuer(properties.getIssuer()).requireAudience(properties.getAudience())
                .clock(() -> Date.from(clock.instant())).clockSkewSeconds(0).build();
    }

    // Package-private: issuance is exposed through the session-validating service below.
    String issue(AuthSession session) {
        Instant now = clock.instant();
        AuthFailure failure = SessionValidity.failure(session, now);
        if (failure != null) throw new SessionAuthException(failure);
        Instant expiry = SessionValidity.earlier(now.plus(properties.getAccessTtl()),
                SessionValidity.earlier(session.inactivityExpiresAt(), session.absoluteExpiresAt()))
                .truncatedTo(ChronoUnit.SECONDS);
        if (!expiry.isAfter(now)) throw new SessionAuthException(AuthFailure.SESSION_EXPIRED);
        return Jwts.builder().subject(session.ownerId()).claim("userType", session.ownerPersona().name())
                .claim("sid", session.id()).issuedAt(Date.from(now)).expiration(Date.from(expiry))
                .issuer(properties.getIssuer()).audience().add(properties.getAudience()).and()
                .signWith(key, Jwts.SIG.HS512).compact();
    }

    public AccessClaims parse(String token) {
        try {
            if (token == null || token.length() > 8192) throw new IllegalArgumentException();
            Claims claims = parser.parseSignedClaims(token).getPayload();
            String ownerId = claims.getSubject();
            String sid = claims.get("sid", String.class);
            String persona = claims.get("userType", String.class);
            Date issuedAt = claims.getIssuedAt();
            Date expiresAt = claims.getExpiration();
            Instant now = clock.instant();
            if (ownerId == null || ownerId.isBlank() || sid == null || sid.isBlank()
                    || issuedAt == null || expiresAt == null || issuedAt.toInstant().isAfter(now)
                    || !expiresAt.after(issuedAt)
                    || expiresAt.toInstant().isAfter(issuedAt.toInstant().plus(properties.getAccessTtl()))) {
                throw new SessionAuthException(AuthFailure.TOKEN_INVALID);
            }
            // JJWT's expiry check is not enough for the exact >= boundary contract.
            if (!now.isBefore(expiresAt.toInstant())) throw new SessionAuthException(AuthFailure.TOKEN_EXPIRED);
            return new AccessClaims(ownerId, PersonaType.valueOf(persona), sid, issuedAt.toInstant(), expiresAt.toInstant());
        } catch (ExpiredJwtException expired) {
            throw new SessionAuthException(AuthFailure.TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException | NullPointerException invalid) {
            throw new SessionAuthException(AuthFailure.TOKEN_INVALID);
        }
    }

    public record AccessClaims(String ownerId, PersonaType persona, String sessionId,
                               Instant issuedAt, Instant expiresAt) { }
}
