package com.mint.security;

import com.mint.authsession.*;
import com.mint.config.AuthSessionProperties;
import com.mint.nodes.AuthSession;
import com.mint.services.AuthSessionService;
import io.jsonwebtoken.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static com.mint.authsession.SessionTestSupport.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SessionJwtTokenProviderTest {
    private final SecretKey key = Jwts.SIG.HS512.key().build();
    private final MutableClock clock = new MutableClock();
    private final AuthSessionProperties properties = properties();
    private SessionJwtTokenProvider tokens;

    @BeforeEach void setup() { tokens = new SessionJwtTokenProvider(key, properties, clock); }

    @Test void contractHasOnlyRequiredClaimsAndExplicitHs512() {
        String token = tokens.issue(session());
        var signed = Jwts.parser().verifyWith(key).clock(() -> Date.from(clock.instant()))
                .build().parseSignedClaims(token);
        assertEquals("HS512", signed.getHeader().getAlgorithm());
        assertEquals(Set.of("sub", "userType", "sid", "iat", "exp", "iss", "aud"), signed.getPayload().keySet());
        assertEquals("test-mvpconnect", signed.getPayload().getIssuer());
        assertEquals(Set.of("test-api"), signed.getPayload().getAudience());
        var claims = tokens.parse(token);
        assertEquals("musician-1", claims.ownerId());
        assertEquals("MUSICIAN", claims.persona().name());
        assertEquals("session-1", claims.sessionId());
        assertEquals(START, claims.issuedAt());
        assertEquals(START.plusSeconds(1800), claims.expiresAt());
    }

    @Test void expiryIsCappedByEitherRemainingSessionDeadline() {
        assertEquals(START.plusSeconds(60), tokens.parse(tokens.issue(
                session(START.plusSeconds(60), START.plusSeconds(3600)))).expiresAt());
        assertEquals(START.plusSeconds(40), tokens.parse(tokens.issue(
                session(START.plusSeconds(3600), START.plusSeconds(40)))).expiresAt());
    }

    @ParameterizedTest @ValueSource(strings = {"sub", "userType", "sid", "iat", "exp", "iss", "aud"})
    void everyRequiredClaimMustExist(String missing) {
        var claims = validClaims();
        claims.remove(missing);
        assertFailure(AuthFailure.TOKEN_INVALID, () -> tokens.parse(sign(claims)));
    }

    @Test void malformedClaimsWrongIssuerAudienceAndAlgorithmFail() {
        Map<String, Object> invalid = Map.of("sub", " ", "userType", "ADMIN", "sid", 123,
                "iat", START.plusSeconds(1).getEpochSecond(), "iss", "elsewhere", "aud", "other-api");
        invalid.forEach((claim, value) -> {
            var claims = validClaims();
            claims.put(claim, value);
            assertFailure(AuthFailure.TOKEN_INVALID, () -> tokens.parse(sign(claims)));
        });
        assertFailure(AuthFailure.TOKEN_INVALID, () -> tokens.parse(Jwts.builder().claims(validClaims())
                .signWith(key, Jwts.SIG.HS256).compact()));
        assertFailure(AuthFailure.TOKEN_INVALID, () -> tokens.parse(Jwts.builder().claims(validClaims())
                .signWith(Jwts.SIG.HS512.key().build(), Jwts.SIG.HS512).compact()));
        assertFailure(AuthFailure.TOKEN_INVALID, () -> tokens.parse("malformed.jwt"));
        assertFailure(AuthFailure.TOKEN_INVALID, () -> tokens.parse(null));
        assertFailure(AuthFailure.TOKEN_INVALID, () -> tokens.parse("x".repeat(8193)));
    }

    @Test void tokenExpiryHasExactBoundaryAndExcessiveLifetimesAreRejected() {
        String token = tokens.issue(session());
        clock.set(START.plusSeconds(1799));
        assertNotNull(tokens.parse(token));
        clock.set(START.plusSeconds(1800));
        assertFailure(AuthFailure.TOKEN_EXPIRED, () -> tokens.parse(token));
        clock.set(START.plusSeconds(1801));
        assertFailure(AuthFailure.TOKEN_EXPIRED, () -> tokens.parse(token));
        clock.set(START);
        var claims = validClaims();
        claims.put("exp", START.plusSeconds(1801).getEpochSecond());
        assertFailure(AuthFailure.TOKEN_INVALID, () -> tokens.parse(sign(claims)));
    }

    @Test void cannotIssueForExpiredOrRevokedSession() {
        assertFailure(AuthFailure.SESSION_EXPIRED, () -> tokens.issue(session(START, START.plusSeconds(100))));
        var active = session();
        var revoked = new AuthSession(active.id(), active.ownerId(), active.ownerPersona(), active.transport(),
                active.createdAt(), active.authenticatedAt(), active.lastUsedAt(), active.inactivityExpiresAt(),
                active.absoluteExpiresAt(), active.currentRefreshHash(), START, RevocationReason.SECURITY_EVENT);
        assertFailure(AuthFailure.SESSION_REVOKED, () -> tokens.issue(revoked));
    }

    @Test void accessServiceRequiresAuthoritativeSessionBindingAndImmutablePrincipal() {
        var sessions = mock(AuthSessionService.class);
        var principals = mock(CustomUserDetailsService.class);
        var service = new SessionAccessTokenService(sessions, tokens, principals);
        when(sessions.requireActiveSession("session-1")).thenReturn(session());
        var expected = new CustomUserDetails("musician-1", "changed-email@example.test", "hash", "MUSICIAN");
        when(principals.loadByOwnerId("musician-1", session().ownerPersona())).thenReturn(expected);
        assertSame(expected, service.authenticate(tokens.parse(service.issueAccessToken("session-1"))));
        for (var mismatch : Map.of("sub", "other-account", "userType", "VENUE").entrySet()) {
            var claims = validClaims();
            claims.put(mismatch.getKey(), mismatch.getValue());
            assertFailure(AuthFailure.TOKEN_INVALID, () -> service.authenticate(tokens.parse(sign(claims))));
        }
        verify(principals, never()).loadUserByUsername(anyString());
        when(sessions.requireActiveSession("session-1")).thenThrow(new SessionAuthException(AuthFailure.SESSION_REVOKED));
        assertFailure(AuthFailure.SESSION_REVOKED, () -> service.authenticate(tokens.parse(sign(validClaims()))));
    }

    private Map<String, Object> validClaims() {
        return new HashMap<>(Map.of("sub", "musician-1", "userType", "MUSICIAN", "sid", "session-1",
                "iat", START.getEpochSecond(), "exp", START.plus(Duration.ofMinutes(30)).getEpochSecond(),
                "iss", "test-mvpconnect", "aud", "test-api"));
    }

    private String sign(Map<String, Object> claims) {
        return Jwts.builder().claims(claims).signWith(key, Jwts.SIG.HS512).compact();
    }

    private void assertFailure(AuthFailure expected, org.junit.jupiter.api.function.Executable action) {
        assertEquals(expected, assertThrows(SessionAuthException.class, action).failure());
    }
}
