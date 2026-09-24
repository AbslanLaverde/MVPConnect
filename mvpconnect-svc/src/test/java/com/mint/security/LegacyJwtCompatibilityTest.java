package com.mint.security;

import com.mint.authsession.SessionTestSupport;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** TRANSITIONAL: remove this class and the legacy fallback at Phase 5 client cutover. */
class LegacyJwtCompatibilityTest {
    private JwtTokenProvider legacy;
    private SecretKey legacyKey;
    private JwtAuthenticationFilter filter;
    private CustomUserDetailsService principals;
    private SessionAccessTokenService sessionAccess;

    @BeforeEach void setup() {
        String isolatedRawKey = Base64.getEncoder().encodeToString(Jwts.SIG.HS512.key().build().getEncoded());
        legacyKey = Keys.hmacShaKeyFor(isolatedRawKey.getBytes(StandardCharsets.UTF_8));
        legacy = new JwtTokenProvider();
        ReflectionTestUtils.setField(legacy, "jwtSecret", isolatedRawKey);
        ReflectionTestUtils.setField(legacy, "jwtExpirationMs", 86_400_000L);
        var newTokens = new SessionJwtTokenProvider(Jwts.SIG.HS512.key().build(), SessionTestSupport.properties(),
                java.time.Clock.systemUTC());
        filter = new JwtAuthenticationFilter();
        principals = mock(CustomUserDetailsService.class);
        sessionAccess = mock(SessionAccessTokenService.class);
        ReflectionTestUtils.setField(filter, "tokenProvider", legacy);
        ReflectionTestUtils.setField(filter, "sessionTokenProvider", newTokens);
        ReflectionTestUtils.setField(filter, "sessionAccessTokens", sessionAccess);
        ReflectionTestUtils.setField(filter, "userDetailsService", principals);
        when(principals.loadUserByUsername("legacy@example.test"))
                .thenReturn(new CustomUserDetails("musician-1", "legacy@example.test", "unused", "MUSICIAN"));
    }

    @AfterEach void clear() { SecurityContextHolder.clearContext(); org.slf4j.MDC.clear(); }

    @Test void currentLoginAndSignupStillIssue24HourEmailSubjectTokens() {
        var principal = new CustomUserDetails("musician-1", "legacy@example.test", "unused", "MUSICIAN");
        var login = legacy.generateToken(new UsernamePasswordAuthenticationToken(principal, null));
        var signup = legacy.generateTokenFromEmail(principal.getUsername(), principal.getId(), principal.getUserType());
        for (String token : new String[]{login, signup}) {
            assertTrue(legacy.validateToken(token));
            var claims = Jwts.parser().verifyWith(legacyKey).build().parseSignedClaims(token).getPayload();
            assertEquals(86_400_000L, claims.getExpiration().getTime() - claims.getIssuedAt().getTime());
            assertEquals("legacy@example.test", claims.getSubject());
            assertEquals("musician-1", claims.get("userId"));
            assertFalse(claims.containsKey("sid"));
        }
    }

    @Test void existingLegacyTokenAuthenticatesByEmailThroughFilter() throws Exception {
        String token = legacy.generateTokenFromEmail("legacy@example.test", "musician-1", "MUSICIAN");
        request(token);
        assertEquals("musician-1", ((CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId());
        verify(principals).loadUserByUsername("legacy@example.test");
        verifyNoInteractions(sessionAccess);
    }

    @Test void invalidOrExpiredLegacyTokensDoNotAuthenticate() throws Exception {
        String expired = Jwts.builder().subject("legacy@example.test").claim("userId", "musician-1")
                .claim("userType", "MUSICIAN").expiration(new Date(1)).signWith(legacyKey).compact();
        for (String token : new String[]{"invalid.jwt", expired,
                Jwts.builder().subject("legacy@example.test").signWith(Jwts.SIG.HS512.key().build()).compact()}) {
            assertFalse(legacy.validateToken(token));
            request(token);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }
        verifyNoInteractions(principals, sessionAccess);
    }

    @Test void legacySignedTokensWithMalformedNewClaimsCannotDowngrade() throws Exception {
        for (var marker : Map.of("sid", (Object) 123, "iss", "some-issuer", "aud", "some-audience").entrySet()) {
            String token = Jwts.builder().subject("legacy@example.test").claim("userId", "musician-1")
                    .claim("userType", "MUSICIAN").claim(marker.getKey(), marker.getValue())
                    .expiration(new Date(System.currentTimeMillis() + 60_000)).signWith(legacyKey).compact();
            assertFalse(legacy.validateToken(token));
            request(token);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }
        // A null/empty sid is a new-contract marker too, even if a JWT builder omits null claims.
        for (String claim : new String[]{"sid", "iss", "aud"}) {
            for (String markerJson : new String[]{"null", "\"\"", "{}", "[]"}) {
                String payload = "{\"sub\":\"legacy@example.test\",\"userId\":\"musician-1\",\"userType\":\"MUSICIAN\","
                        + "\"exp\":" + (System.currentTimeMillis() / 1000 + 60) + ",\"" + claim + "\":" + markerJson + "}";
                String token = Jwts.builder().content(payload).signWith(legacyKey).compact();
                assertFalse(legacy.validateToken(token));
                request(token);
                assertNull(SecurityContextHolder.getContext().getAuthentication());
            }
        }
        verifyNoInteractions(principals, sessionAccess);
    }

    private void request(String token) throws Exception {
        var request = new MockHttpServletRequest("GET", "/me");
        request.addHeader("Authorization", "Bearer " + token);
        filter.doFilter(request, new MockHttpServletResponse(), (req, response) -> { });
    }
}
