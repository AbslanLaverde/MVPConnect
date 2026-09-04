package com.mint.security;

import com.mint.exceptions.OnboardingException;
import com.mint.onboarding.PersonaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class AuthenticatedPersonaProvider {

    public AuthenticatedPersona current() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof CustomUserDetails principal)) {
            throw OnboardingException.unauthenticated();
        }

        try {
            return new AuthenticatedPersona(
                    principal.getId(),
                    PersonaType.from(principal.getUserType())
            );
        } catch (IllegalArgumentException ex) {
            throw OnboardingException.notAvailable("The authenticated account has an unsupported persona type.");
        }
    }
}
