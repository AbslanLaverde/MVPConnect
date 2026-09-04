package com.mint.controllers;

import com.mint.dto.request.UpdateMusicianProfileRequest;
import com.mint.dto.response.discovery.VenueMatchResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Venue;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.PersonaAuthorizationService;
import com.mint.services.DiscoveryProfileMapper;
import com.mint.services.PublicProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MusicianControllerTest {

    @Mock
    private MusicianRepository musicianRepository;

    @Mock
    private VenueRepository venueRepository;

    @Mock
    private PublicProfileService publicProfileService;

    @Mock
    private PersonaAuthorizationService authorizationService;

    @Mock
    private DiscoveryProfileMapper discoveryProfileMapper;

    private MusicianController controller;

    @BeforeEach
    void setUp() {
        controller = new MusicianController(
                musicianRepository,
                venueRepository,
                publicProfileService,
                authorizationService,
                discoveryProfileMapper
        );
    }

    @Test
    void authorizedOwnerCanUpdateOnlyTheExistingMutableFieldSet() {
        Musician musician = new Musician();
        musician.setId("musician-1");
        musician.setEmail("original@example.com");
        musician.setPassword("original-hash");
        when(musicianRepository.findById("musician-1")).thenReturn(Optional.of(musician));

        UpdateMusicianProfileRequest request = new UpdateMusicianProfileRequest();
        request.setBio("Updated bio");
        request.setLocation("Brooklyn, NY");
        request.setGenres(List.of("INDIE"));
        request.setVibes(List.of("RAW"));
        request.setMinimumFee("$500");
        request.setWillingToTravel(true);
        request.setWebsiteUrl("https://example.com");
        request.setInstagramHandle("@example");

        ResponseEntity<?> response = controller.updateMusician("musician-1", request);

        verify(authorizationService).requireOwner(
                com.mint.onboarding.PersonaType.MUSICIAN,
                "musician-1"
        );
        verify(musicianRepository).save(musician);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("Updated bio", musician.getBio());
        assertEquals("Brooklyn, NY", musician.getLocation());
        assertEquals(List.of("INDIE"), musician.getGenres());
        assertEquals(List.of("RAW"), musician.getVibes());
        assertEquals("$500", musician.getMinimumFee());
        assertEquals(true, musician.getWillingToTravel());
        assertEquals("https://example.com", musician.getWebsiteUrl());
        assertEquals("@example", musician.getInstagramHandle());
        assertEquals("original@example.com", musician.getEmail());
        assertEquals("original-hash", musician.getPassword());
        assertNull(musician.getOnboardingStatus());
        assertNull(musician.getOnboardingVersion());
        assertNull(musician.getProfileImageUrl());
    }

    @Test
    void omittedFieldsRemainUnchangedAndExplicitNullClearsAField() {
        Musician musician = new Musician();
        musician.setId("musician-1");
        musician.setBio("Keep this bio");
        musician.setGenres(List.of("INDIE"));
        musician.setWebsiteUrl("https://old.example");
        when(musicianRepository.findById("musician-1")).thenReturn(Optional.of(musician));

        UpdateMusicianProfileRequest request = new UpdateMusicianProfileRequest();
        request.setWebsiteUrl(null);
        controller.updateMusician("musician-1", request);

        assertEquals("Keep this bio", musician.getBio());
        assertEquals(List.of("INDIE"), musician.getGenres());
        assertNull(musician.getWebsiteUrl());
        verify(musicianRepository).save(musician);
    }

    @Test
    void venueMatchesRetainDescendingGenreMatchOrderAndHumanReadableScore() {
        Musician musician = new Musician();
        musician.setId("musician-1");
        musician.setGenres(List.of("INDIE", "ROCK"));
        Venue oneGenre = new Venue();
        oneGenre.setId("venue-1");
        oneGenre.setLiveMusic(true);
        oneGenre.setGenrePreferences(List.of("INDIE"));
        Venue twoGenres = new Venue();
        twoGenres.setId("venue-2");
        twoGenres.setLiveMusic(true);
        twoGenres.setGenrePreferences(List.of("INDIE", "ROCK"));
        VenueMatchResponse oneGenreResponse = new VenueMatchResponse(
                "venue-1", "One", null, null, List.of("INDIE"), null,
                null, "1/1 genres matched", null
        );
        VenueMatchResponse twoGenreResponse = new VenueMatchResponse(
                "venue-2", "Two", null, null, List.of("INDIE", "ROCK"), null,
                null, "2/2 genres matched", null
        );
        when(musicianRepository.findById("musician-1")).thenReturn(Optional.of(musician));
        when(venueRepository.findAll()).thenReturn(List.of(oneGenre, twoGenres));
        when(discoveryProfileMapper.venueMatch(oneGenre, "1/1 genres matched"))
                .thenReturn(oneGenreResponse);
        when(discoveryProfileMapper.venueMatch(twoGenres, "2/2 genres matched"))
                .thenReturn(twoGenreResponse);

        ResponseEntity<List<VenueMatchResponse>> response = controller.getVenueMatches("musician-1");

        assertNotNull(response.getBody());
        assertEquals(List.of("venue-2", "venue-1"), response.getBody().stream()
                .map(VenueMatchResponse::id)
                .toList());
        assertEquals("2/2 genres matched", response.getBody().get(0).matchScore());
    }
}
