package com.mint.spotify;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mint.config.SpotifyProperties;
import com.mint.exceptions.ExternalArtistException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Instant;

@Service
public class SpotifyTokenService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SpotifyTokenService.class);
    private static final long REFRESH_SKEW_SECONDS = 30;

    private final RestClient restClient;
    private final SpotifyProperties properties;
    private volatile CachedToken cachedToken;

    public SpotifyTokenService(
            @Qualifier("spotifyAccountsRestClient") RestClient restClient,
            SpotifyProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public synchronized String accessToken() {
        Instant now = Instant.now();
        if (cachedToken != null && cachedToken.usableAt(now)) {
            return cachedToken.value();
        }
        if (!StringUtils.hasText(properties.getClientId())
                || !StringUtils.hasText(properties.getClientSecret())) {
            throw ExternalArtistException.spotifyUnavailable();
        }

        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        try {
            SpotifyTokenResponse response = restClient.post()
                    .uri("/api/token")
                    .headers(headers -> headers.setBasicAuth(
                            properties.getClientId(), properties.getClientSecret()))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(SpotifyTokenResponse.class);
            if (response == null || !StringUtils.hasText(response.accessToken())
                    || response.expiresIn() == null || response.expiresIn() <= 0) {
                throw ExternalArtistException.spotifyUnavailable();
            }
            long usableSeconds = Math.max(0, response.expiresIn() - REFRESH_SKEW_SECONDS);
            cachedToken = new CachedToken(response.accessToken(), now.plusSeconds(usableSeconds));
            LOGGER.debug("spotify.token.refreshed expiresInSeconds={}", response.expiresIn());
            return cachedToken.value();
        } catch (ExternalArtistException exception) {
            throw exception;
        } catch (RestClientException exception) {
            LOGGER.warn("spotify.token.failed exception={}", exception.getClass().getSimpleName());
            throw ExternalArtistException.spotifyUnavailable();
        }
    }

    private record CachedToken(String value, Instant usableUntil) {
        private boolean usableAt(Instant instant) {
            return instant.isBefore(usableUntil);
        }
    }

    private record SpotifyTokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") Integer expiresIn) {
    }
}
