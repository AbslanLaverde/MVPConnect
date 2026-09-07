package com.mint.services;

import com.mint.dto.request.CreateFreeFormExternalArtistRequest;
import com.mint.dto.request.ResolveExternalArtistRequest;
import com.mint.dto.response.externalartist.ExternalArtistResponse;
import com.mint.dto.response.externalartist.SpotifyArtistResponse;
import com.mint.exceptions.ExternalArtistException;
import com.mint.externalartist.ExternalArtistEnrichmentStatus;
import com.mint.externalartist.ExternalArtistNameNormalizer;
import com.mint.externalartist.ExternalArtistProvider;
import com.mint.externalartist.ExternalArtistResolutionStatus;
import com.mint.externalartist.ExternalArtistSource;
import com.mint.externalartist.SpotifyAttemptStatus;
import com.mint.nodes.ExternalArtist;
import com.mint.repositories.ExternalArtistRepository;
import com.mint.spotify.SpotifyArtistClient;
import com.mint.spotify.SpotifyArtistIdentity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExternalArtistService {

    static final int SEARCH_LIMIT = 10;
    private static final Logger LOGGER = LoggerFactory.getLogger(ExternalArtistService.class);

    private final ExternalArtistRepository repository;
    private final ExternalArtistPersistenceService persistenceService;
    private final SpotifyArtistClient spotifyArtistClient;

    public ExternalArtistService(
            ExternalArtistRepository repository,
            ExternalArtistPersistenceService persistenceService,
            SpotifyArtistClient spotifyArtistClient) {
        this.repository = repository;
        this.persistenceService = persistenceService;
        this.spotifyArtistClient = spotifyArtistClient;
    }

    @Transactional(readOnly = true)
    public List<ExternalArtistResponse> searchLocal(String rawQuery) {
        String query = validatedQuery(rawQuery);
        return repository.searchByName(query, SEARCH_LIMIT).stream()
                .map(ExternalArtistResponse::from)
                .toList();
    }

    public List<SpotifyArtistResponse> searchSpotify(String rawQuery) {
        String query = validatedQuery(rawQuery);
        return spotifyArtistClient.search(query).stream()
                .map(ExternalArtistService::toSpotifyResponse)
                .toList();
    }

    public ExternalArtistResponse resolveSpotify(ResolveExternalArtistRequest request) {
        if (request.provider() != ExternalArtistProvider.SPOTIFY) {
            throw ExternalArtistException.invalid("Only SPOTIFY is supported as an artist provider.");
        }
        String spotifyId = validatedProviderArtistId(request.providerArtistId());
        return repository.findBySpotifyId(spotifyId)
                .map(ExternalArtistResponse::from)
                .orElseGet(() -> resolveNewSpotifyArtist(spotifyId));
    }

    @Transactional
    public ExternalArtistResponse createFreeForm(CreateFreeFormExternalArtistRequest request) {
        String displayName = ExternalArtistNameNormalizer.displayName(request.displayName());
        if (displayName.isEmpty()) {
            throw ExternalArtistException.invalid("An artist display name is required.");
        }
        String normalizedName = ExternalArtistNameNormalizer.normalize(displayName);
        return repository.findReusableFreeForm(normalizedName)
                .map(ExternalArtistResponse::from)
                .orElseGet(() -> ExternalArtistResponse.from(
                        repository.save(newFreeFormArtist(displayName, normalizedName,
                                request.spotifyAttemptStatus()))));
    }

    private ExternalArtistResponse resolveNewSpotifyArtist(String spotifyId) {
        SpotifyArtistIdentity identity = spotifyArtistClient.getArtist(spotifyId);
        ExternalArtist artist = newSpotifyArtist(identity);
        try {
            return ExternalArtistResponse.from(persistenceService.create(artist));
        } catch (DataIntegrityViolationException collision) {
            LOGGER.info("external_artist.spotify.concurrent_reuse spotifyIdPresent=true");
            return repository.findBySpotifyId(spotifyId)
                    .map(ExternalArtistResponse::from)
                    .orElseThrow(ExternalArtistException::spotifyUnavailable);
        }
    }

    private ExternalArtist newSpotifyArtist(SpotifyArtistIdentity identity) {
        ExternalArtist artist = baseArtist(identity.name());
        artist.setSource(ExternalArtistSource.SPOTIFY);
        artist.setResolutionStatus(ExternalArtistResolutionStatus.RESOLVED);
        artist.setSpotifyId(identity.spotifyId());
        artist.setSpotifyUri(identity.spotifyUri());
        artist.setSpotifyUrl(identity.spotifyUrl());
        artist.setSpotifyImageUrl(identity.spotifyImageUrl());
        artist.setSpotifyLastSyncedAt(LocalDateTime.now());
        return artist;
    }

    private ExternalArtist newFreeFormArtist(
            String displayName,
            String normalizedName,
            SpotifyAttemptStatus attemptStatus) {
        ExternalArtist artist = baseArtist(displayName);
        artist.setNormalizedName(normalizedName);
        if (attemptStatus == SpotifyAttemptStatus.UNAVAILABLE) {
            artist.setSource(ExternalArtistSource.FREE_FORM_SPOTIFY_UNAVAILABLE);
            artist.setResolutionStatus(ExternalArtistResolutionStatus.RETRY_SPOTIFY);
        } else {
            artist.setSource(ExternalArtistSource.FREE_FORM);
            artist.setResolutionStatus(ExternalArtistResolutionStatus.UNRESOLVED);
        }
        return artist;
    }

    private ExternalArtist baseArtist(String displayName) {
        ExternalArtist artist = new ExternalArtist();
        artist.setName(ExternalArtistNameNormalizer.displayName(displayName));
        artist.setNormalizedName(ExternalArtistNameNormalizer.normalize(displayName));
        artist.setEnrichmentStatus(ExternalArtistEnrichmentStatus.PENDING);
        artist.setEnrichmentVersion(ExternalArtist.CURRENT_ENRICHMENT_VERSION);
        return artist;
    }

    private static SpotifyArtistResponse toSpotifyResponse(SpotifyArtistIdentity artist) {
        return new SpotifyArtistResponse(
                artist.spotifyId(), artist.name(), artist.spotifyUrl(), artist.spotifyImageUrl());
    }

    private String validatedQuery(String rawQuery) {
        String query = ExternalArtistNameNormalizer.normalize(rawQuery);
        if (query.length() < 2 || query.length() > 100) {
            throw ExternalArtistException.invalid("Artist search must be between 2 and 100 characters.");
        }
        return query;
    }

    private String validatedProviderArtistId(String rawId) {
        String spotifyId = rawId == null ? "" : rawId.trim();
        if (spotifyId.isEmpty() || spotifyId.length() > 255
                || spotifyId.chars().anyMatch(Character::isISOControl)) {
            throw ExternalArtistException.invalid("A valid Spotify artist ID is required.");
        }
        return spotifyId;
    }
}
