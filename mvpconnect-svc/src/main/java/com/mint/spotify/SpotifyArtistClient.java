package com.mint.spotify;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mint.exceptions.ExternalArtistException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Service
public class SpotifyArtistClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(SpotifyArtistClient.class);
    private static final int RESULT_LIMIT = 10;

    private final RestClient restClient;
    private final SpotifyTokenService tokenService;

    public SpotifyArtistClient(
            @Qualifier("spotifyApiRestClient") RestClient restClient,
            SpotifyTokenService tokenService) {
        this.restClient = restClient;
        this.tokenService = tokenService;
    }

    public List<SpotifyArtistIdentity> search(String query) {
        try {
            SpotifySearchResponse response = restClient.get()
                    .uri(builder -> builder.path("/v1/search")
                            .queryParam("q", query)
                            .queryParam("type", "artist")
                            .queryParam("limit", RESULT_LIMIT)
                            .build())
                    .headers(headers -> headers.setBearerAuth(tokenService.accessToken()))
                    .retrieve()
                    .body(SpotifySearchResponse.class);
            if (response == null || response.artists() == null
                    || response.artists().items() == null) {
                return List.of();
            }
            return response.artists().items().stream()
                    .filter(this::usable)
                    .map(this::toIdentity)
                    .limit(RESULT_LIMIT)
                    .toList();
        } catch (ExternalArtistException exception) {
            throw exception;
        } catch (RestClientException exception) {
            LOGGER.warn("spotify.artist.search.failed exception={}", exception.getClass().getSimpleName());
            throw ExternalArtistException.spotifyUnavailable();
        }
    }

    public SpotifyArtistIdentity getArtist(String spotifyId) {
        try {
            SpotifyArtist response = restClient.get()
                    .uri("/v1/artists/{spotifyId}", spotifyId)
                    .headers(headers -> headers.setBearerAuth(tokenService.accessToken()))
                    .retrieve()
                    .body(SpotifyArtist.class);
            if (!usable(response)) {
                throw ExternalArtistException.spotifyArtistNotFound();
            }
            return toIdentity(response);
        } catch (HttpClientErrorException.NotFound exception) {
            throw ExternalArtistException.spotifyArtistNotFound();
        } catch (ExternalArtistException exception) {
            throw exception;
        } catch (RestClientException exception) {
            LOGGER.warn("spotify.artist.resolve.failed exception={}", exception.getClass().getSimpleName());
            throw ExternalArtistException.spotifyUnavailable();
        }
    }

    private boolean usable(SpotifyArtist artist) {
        return artist != null && StringUtils.hasText(artist.id()) && StringUtils.hasText(artist.name());
    }

    private SpotifyArtistIdentity toIdentity(SpotifyArtist artist) {
        String spotifyUrl = artist.externalUrls() == null
                ? null
                : artist.externalUrls().get("spotify");
        String imageUrl = artist.images() == null
                ? null
                : artist.images().stream()
                        .filter(image -> image != null && StringUtils.hasText(image.url()))
                        .map(SpotifyImage::url)
                        .findFirst()
                        .orElse(null);
        return new SpotifyArtistIdentity(
                artist.id(), artist.name().trim(), artist.uri(), spotifyUrl, imageUrl);
    }

    private record SpotifySearchResponse(SpotifyArtistsPage artists) {
    }

    private record SpotifyArtistsPage(List<SpotifyArtist> items) {
    }

    private record SpotifyArtist(
            String id,
            String name,
            String uri,
            @JsonProperty("external_urls") Map<String, String> externalUrls,
            List<SpotifyImage> images) {
    }

    private record SpotifyImage(String url) {
    }
}
