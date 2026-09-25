package com.mint.security;

import com.mint.authsession.*;
import com.mint.services.AuthSessionService;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Base64;

import static com.mint.authsession.SessionTestSupport.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SessionAuthenticationSecurityTest.ProtectedEndpoint.class)
@ContextConfiguration(classes = {SecurityConfig.class, JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class, SessionAccessTokenService.class,
        SessionAuthenticationSecurityTest.TokenConfig.class, SessionAuthenticationSecurityTest.ProtectedEndpoint.class})
class SessionAuthenticationSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired SessionJwtTokenProvider tokens;
    @MockitoBean AuthSessionService sessions;
    @MockitoBean CustomUserDetailsService principals;
    @MockitoBean com.mint.authsession.http.AuthClientTransportResolver authClientTransportResolver;

    @BeforeEach void setup() {
        when(sessions.requireActiveSession("session-1")).thenReturn(session());
        when(principals.loadByOwnerId("musician-1", session().ownerPersona()))
                .thenReturn(new CustomUserDetails("musician-1", "changed@example.test", "unused", "MUSICIAN"));
    }

    @Test void signedSessionTokenAuthenticatesProtectedRequestThroughRealFilterChain() throws Exception {
        mvc.perform(get("/auth-test/protected").header("Authorization", "Bearer " + tokens.issue(session())))
                .andExpect(status().isOk()).andExpect(content().string("musician-1"));
        verify(principals).loadByOwnerId("musician-1", session().ownerPersona());
        verify(principals, never()).loadUserByUsername(anyString());
    }

    @Test void revokedExpiredMissingAndInvalidOwnerSessionsAreUnauthorized() throws Exception {
        String token = tokens.issue(session());
        for (AuthFailure failure : new AuthFailure[]{AuthFailure.SESSION_REVOKED, AuthFailure.SESSION_EXPIRED,
                AuthFailure.TOKEN_INVALID, AuthFailure.INVALID_OWNER}) {
            doThrow(new SessionAuthException(failure)).when(sessions).requireActiveSession("session-1");
            mvc.perform(get("/auth-test/protected").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Authentication required"));
        }
        verifyNoInteractions(principals);
    }

    @Test void malformedTokenRemainsUnauthorized() throws Exception {
        mvc.perform(get("/auth-test/protected").header("Authorization", "Bearer invalid-private-value"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
        verifyNoInteractions(sessions, principals);
    }

    @RestController
    static class ProtectedEndpoint {
        @GetMapping("/auth-test/protected")
        String current(@AuthenticationPrincipal CustomUserDetails principal) { return principal.getId(); }
    }

    @TestConfiguration
    static class TokenConfig {
        @Bean SessionJwtTokenProvider sessionJwtTokenProvider() {
            return new SessionJwtTokenProvider(Jwts.SIG.HS512.key().build(), properties(), new MutableClock());
        }
        @Bean JwtTokenProvider jwtTokenProvider() {
            var provider = new JwtTokenProvider();
            // Isolated legacy raw UTF-8 key; never sourced from developer configuration.
            ReflectionTestUtils.setField(provider, "jwtSecret", Base64.getEncoder()
                    .encodeToString(Jwts.SIG.HS512.key().build().getEncoded()));
            ReflectionTestUtils.setField(provider, "jwtExpirationMs", 86_400_000L);
            return provider;
        }
    }
}
