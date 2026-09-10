package com.mint.services;

import com.mint.dto.request.SetArtistIdentityRequest;
import com.mint.exceptions.ExternalArtistException;
import com.mint.externalartist.ExternalArtistSource;
import com.mint.nodes.ExternalArtist;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.ExternalArtistRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArtistIdentityServiceTest {

    @Mock private AuthenticatedPersonaProvider personaProvider;
    @Mock private ExternalArtistRepository repository;
    private ArtistIdentityService service;

    @BeforeEach
    void setUp() {
        service = new ArtistIdentityService(personaProvider, repository);
    }

    @Test
    void spotifyResolvedArtistCanBeAttachedAndReRead() {
        ExternalArtist artist = spotifyArtist();
        when(personaProvider.current()).thenReturn(
                new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN));
        when(repository.findById("external-1")).thenReturn(Optional.of(artist));

        var response = service.replace(new SetArtistIdentityRequest("external-1"));

        assertEquals("external-1", response.id());
        verify(repository).replaceArtistIdentity("musician-1", "external-1");
    }

    @Test
    void freeFormArtistCannotBeClaimedAsOwnSpotifyIdentity() {
        ExternalArtist artist = spotifyArtist();
        artist.setSource(ExternalArtistSource.FREE_FORM);
        artist.setSpotifyId(null);
        when(personaProvider.current()).thenReturn(
                new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN));
        when(repository.findById("external-1")).thenReturn(Optional.of(artist));

        assertThrows(ExternalArtistException.class,
                () -> service.replace(new SetArtistIdentityRequest("external-1")));
    }

    @Test
    void disconnectRemovesOnlyIdentityRelationship() {
        when(personaProvider.current()).thenReturn(
                new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN));

        service.disconnect();

        verify(repository).disconnectArtistIdentity("musician-1");
    }

    @Test
    void venueCannotAttachArtistIdentity() {
        when(personaProvider.current()).thenReturn(
                new AuthenticatedPersona("venue-1", PersonaType.VENUE));

        assertThrows(ExternalArtistException.class,
                () -> service.replace(new SetArtistIdentityRequest("external-1")));
    }

    private ExternalArtist spotifyArtist() {
        ExternalArtist artist = new ExternalArtist();
        artist.setId("external-1");
        artist.setName("Interpol");
        artist.setSource(ExternalArtistSource.SPOTIFY);
        artist.setSpotifyId("spotify-interpol");
        return artist;
    }
}
