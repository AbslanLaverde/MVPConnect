package com.mint.services;

import com.mint.dto.request.CreateFreeFormExternalArtistRequest;
import com.mint.dto.request.ResolveExternalArtistRequest;
import com.mint.externalartist.ExternalArtistEnrichmentStatus;
import com.mint.externalartist.ExternalArtistProvider;
import com.mint.externalartist.ExternalArtistResolutionStatus;
import com.mint.externalartist.ExternalArtistSource;
import com.mint.externalartist.SpotifyAttemptStatus;
import com.mint.nodes.ExternalArtist;
import com.mint.repositories.ExternalArtistRepository;
import com.mint.spotify.SpotifyArtistClient;
import com.mint.spotify.SpotifyArtistIdentity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExternalArtistServiceTest {

    @Mock private ExternalArtistRepository repository;
    @Mock private ExternalArtistPersistenceService persistenceService;
    @Mock private SpotifyArtistClient spotifyArtistClient;

    private ExternalArtistService service;

    @BeforeEach
    void setUp() {
        service = new ExternalArtistService(repository, persistenceService, spotifyArtistClient);
    }

    @Test
    void localSearchNormalizesQueryUsesBoundAndReturnsSafeDto() {
        ExternalArtist artist = spotifyArtist("external-1");
        when(repository.searchByName("the national", ExternalArtistService.SEARCH_LIMIT))
                .thenReturn(List.of(artist));

        var result = service.searchLocal("  The   National ").getFirst();

        assertEquals("external-1", result.id());
        assertEquals("The National", result.name());
        verify(repository).searchByName("the national", 10);
    }

    @Test
    void selectingSpotifyArtistCreatesResolvedPendingExternalArtist() {
        when(repository.findBySpotifyId("spotify-1")).thenReturn(Optional.empty());
        when(spotifyArtistClient.getArtist("spotify-1")).thenReturn(identity());
        when(persistenceService.create(org.mockito.ArgumentMatchers.any(ExternalArtist.class)))
                .thenAnswer(invocation -> {
                    ExternalArtist value = invocation.getArgument(0);
                    value.setId("external-1");
                    return value;
                });

        var result = service.resolveSpotify(new ResolveExternalArtistRequest(
                ExternalArtistProvider.SPOTIFY, "spotify-1"));

        assertEquals("external-1", result.id());
        assertEquals(ExternalArtistSource.SPOTIFY, result.source());
        assertEquals(ExternalArtistResolutionStatus.RESOLVED, result.resolutionStatus());
        assertEquals(ExternalArtistEnrichmentStatus.PENDING, result.enrichmentStatus());
        assertNotNull(result.spotifyImageUrl());
    }

    @Test
    void secondResolveReturnsExistingNodeWithoutCallingProvider() {
        ExternalArtist existing = spotifyArtist("external-1");
        when(repository.findBySpotifyId("spotify-1")).thenReturn(Optional.of(existing));

        var result = service.resolveSpotify(new ResolveExternalArtistRequest(
                ExternalArtistProvider.SPOTIFY, "spotify-1"));

        assertEquals("external-1", result.id());
        verify(spotifyArtistClient, never()).getArtist("spotify-1");
        verify(persistenceService, never()).create(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void concurrentSpotifyInsertCollisionLoadsAndReturnsWinner() {
        ExternalArtist winner = spotifyArtist("winner-id");
        when(repository.findBySpotifyId("spotify-1"))
                .thenReturn(Optional.empty(), Optional.of(winner));
        when(spotifyArtistClient.getArtist("spotify-1")).thenReturn(identity());
        when(persistenceService.create(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new DataIntegrityViolationException("unique collision"));

        var result = service.resolveSpotify(new ResolveExternalArtistRequest(
                ExternalArtistProvider.SPOTIFY, "spotify-1"));

        assertEquals("winner-id", result.id());
    }

    @Test
    void reachableNoMatchCreatesFreeFormUnresolvedArtistAndPreservesDisplayName() {
        when(repository.findReusableFreeForm("tiny local band")).thenReturn(Optional.empty());
        when(repository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> {
            ExternalArtist value = invocation.getArgument(0);
            value.setId("manual-1");
            return value;
        });

        var result = service.createFreeForm(new CreateFreeFormExternalArtistRequest(
                "  Tiny   Local Band  ", SpotifyAttemptStatus.NO_MATCH));

        assertEquals("Tiny Local Band", result.name());
        assertEquals(ExternalArtistSource.FREE_FORM, result.source());
        assertEquals(ExternalArtistResolutionStatus.UNRESOLVED, result.resolutionStatus());
        assertEquals(ExternalArtistEnrichmentStatus.PENDING, result.enrichmentStatus());
        assertNull(result.spotifyId());
    }

    @Test
    void unavailableSpotifyCreatesRetryableFreeFormArtist() {
        when(repository.findReusableFreeForm("tiny local band")).thenReturn(Optional.empty());
        when(repository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> {
            ExternalArtist value = invocation.getArgument(0);
            value.setId("manual-1");
            return value;
        });

        var result = service.createFreeForm(new CreateFreeFormExternalArtistRequest(
                "Tiny Local Band", SpotifyAttemptStatus.UNAVAILABLE));

        assertEquals(ExternalArtistSource.FREE_FORM_SPOTIFY_UNAVAILABLE, result.source());
        assertEquals(ExternalArtistResolutionStatus.RETRY_SPOTIFY, result.resolutionStatus());
    }

    @Test
    void sameNormalizedFreeFormNameReusesExistingNode() {
        ExternalArtist existing = new ExternalArtist();
        existing.setId("manual-1");
        existing.setName("Tiny Local Band");
        existing.setNormalizedName("tiny local band");
        existing.setSource(ExternalArtistSource.FREE_FORM);
        existing.setResolutionStatus(ExternalArtistResolutionStatus.UNRESOLVED);
        existing.setEnrichmentStatus(ExternalArtistEnrichmentStatus.PENDING);
        when(repository.findReusableFreeForm("tiny local band")).thenReturn(Optional.of(existing));

        var result = service.createFreeForm(new CreateFreeFormExternalArtistRequest(
                " TINY  LOCAL BAND ", SpotifyAttemptStatus.NO_MATCH));

        assertEquals("manual-1", result.id());
        verify(repository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private ExternalArtist spotifyArtist(String id) {
        ExternalArtist artist = new ExternalArtist();
        artist.setId(id);
        artist.setName("The National");
        artist.setNormalizedName("the national");
        artist.setSource(ExternalArtistSource.SPOTIFY);
        artist.setResolutionStatus(ExternalArtistResolutionStatus.RESOLVED);
        artist.setEnrichmentStatus(ExternalArtistEnrichmentStatus.PENDING);
        artist.setSpotifyId("spotify-1");
        artist.setSpotifyUrl("https://open.spotify.com/artist/spotify-1");
        artist.setSpotifyImageUrl("https://images.example/artist.jpg");
        return artist;
    }

    private SpotifyArtistIdentity identity() {
        return new SpotifyArtistIdentity(
                "spotify-1",
                "The National",
                "spotify:artist:spotify-1",
                "https://open.spotify.com/artist/spotify-1",
                "https://images.example/artist.jpg"
        );
    }
}
