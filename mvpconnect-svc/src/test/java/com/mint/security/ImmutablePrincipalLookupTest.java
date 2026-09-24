package com.mint.security;

import com.mint.authsession.SessionAuthException;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ImmutablePrincipalLookupTest {
    @Test void eachPersonaResolvesByIdAndMissingOwnersFail() {
        var musicians = mock(MusicianRepository.class);
        var venues = mock(VenueRepository.class);
        var promoters = mock(PromoterRepository.class);
        var service = new CustomUserDetailsService();
        ReflectionTestUtils.setField(service, "musicianRepository", musicians);
        ReflectionTestUtils.setField(service, "venueRepository", venues);
        ReflectionTestUtils.setField(service, "promoterRepository", promoters);
        var musician = new Musician(); musician.setId("m"); musician.setEmail("new-m@example.test");
        var venue = new Venue(); venue.setId("v"); venue.setEmail("new-v@example.test");
        var promoter = new Promoter(); promoter.setId("p"); promoter.setEmail("new-p@example.test");
        when(musicians.findById("m")).thenReturn(Optional.of(musician));
        when(venues.findById("v")).thenReturn(Optional.of(venue));
        when(promoters.findById("p")).thenReturn(Optional.of(promoter));
        for (var persona : PersonaType.values()) {
            String id = switch (persona) { case MUSICIAN -> "m"; case VENUE -> "v"; case PROMOTER -> "p"; };
            var principal = service.loadByOwnerId(id, persona);
            assertEquals(id, principal.getId());
            assertEquals("new-" + id + "@example.test", principal.getUsername());
            assertEquals(persona.name(), principal.getUserType());
            assertThrows(SessionAuthException.class, () -> service.loadByOwnerId("absent", persona));
        }
        verify(musicians, never()).findByEmail(anyString());
        verify(venues, never()).findByEmail(anyString());
        verify(promoters, never()).findByEmail(anyString());
    }
}
