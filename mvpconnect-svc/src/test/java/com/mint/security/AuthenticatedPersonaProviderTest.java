package com.mint.security;

import com.mint.exceptions.OnboardingException;
import com.mint.onboarding.PersonaType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthenticatedPersonaProviderTest {

    private final AuthenticatedPersonaProvider provider = new AuthenticatedPersonaProvider();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void resolvesIdAndPersonaFromExistingCustomPrincipal() {
        CustomUserDetails principal = new CustomUserDetails(
                "venue-1",
                "venue@example.com",
                "hashed-password",
                "VENUE"
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        principal.getAuthorities()
                )
        );

        AuthenticatedPersona identity = provider.current();

        assertEquals("venue-1", identity.userId());
        assertEquals(PersonaType.VENUE, identity.persona());
    }

    @Test
    void rejectsMissingAuthenticatedPrincipal() {
        OnboardingException exception = assertThrows(
                OnboardingException.class,
                provider::current
        );

        assertEquals(OnboardingException.NOT_AVAILABLE, exception.getCode());
        assertEquals(401, exception.getStatus().value());
    }
}
