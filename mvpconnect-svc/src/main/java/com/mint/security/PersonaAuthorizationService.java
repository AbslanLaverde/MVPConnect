package com.mint.security;

import com.mint.onboarding.PersonaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class PersonaAuthorizationService {

    private final AuthenticatedPersonaProvider authenticatedPersonaProvider;

    public PersonaAuthorizationService(AuthenticatedPersonaProvider authenticatedPersonaProvider) {
        this.authenticatedPersonaProvider = authenticatedPersonaProvider;
    }

    public AuthenticatedPersona requireOwner(PersonaType requiredPersona, String ownerId) {
        AuthenticatedPersona authenticated = authenticatedPersonaProvider.current();
        if (authenticated.persona() != requiredPersona || !authenticated.userId().equals(ownerId)) {
            throw new AccessDeniedException(
                    "The authenticated account is not allowed to perform this operation."
            );
        }
        return authenticated;
    }
}
