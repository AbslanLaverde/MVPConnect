package com.mint.security;

import com.mint.onboarding.PersonaType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PersonaAuthorizationServiceTest {

    @Mock
    private AuthenticatedPersonaProvider authenticatedPersonaProvider;

    private PersonaAuthorizationService authorizationService;

    @BeforeEach
    void setUp() {
        authorizationService = new PersonaAuthorizationService(authenticatedPersonaProvider);
    }

    @Test
    void musicianOwnerCanActOnSelf() {
        AuthenticatedPersona owner = new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN);
        when(authenticatedPersonaProvider.current()).thenReturn(owner);

        assertSame(owner, authorizationService.requireOwner(PersonaType.MUSICIAN, "musician-1"));
    }

    @Test
    void musicianCannotActOnAnotherMusician() {
        when(authenticatedPersonaProvider.current()).thenReturn(
                new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN)
        );

        AccessDeniedException exception = assertThrows(
                AccessDeniedException.class,
                () -> authorizationService.requireOwner(PersonaType.MUSICIAN, "musician-2")
        );

        assertEquals(
                "The authenticated account is not allowed to perform this operation.",
                exception.getMessage()
        );
    }

    @Test
    void venueCannotActOnMusician() {
        when(authenticatedPersonaProvider.current()).thenReturn(
                new AuthenticatedPersona("venue-1", PersonaType.VENUE)
        );

        assertThrows(
                AccessDeniedException.class,
                () -> authorizationService.requireOwner(PersonaType.MUSICIAN, "musician-1")
        );
    }

    @Test
    void promoterCannotActOnMusician() {
        when(authenticatedPersonaProvider.current()).thenReturn(
                new AuthenticatedPersona("promoter-1", PersonaType.PROMOTER)
        );

        assertThrows(
                AccessDeniedException.class,
                () -> authorizationService.requireOwner(PersonaType.MUSICIAN, "musician-1")
        );
    }
}
