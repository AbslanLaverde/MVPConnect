package com.mint.youtube;

import com.mint.config.YouTubeOAuthProperties;
import com.mint.exceptions.ExternalConnectionException;
import com.mint.externalconnection.ExternalProvider;
import com.mint.oauth.OAuthProviderClient;
import com.mint.oauth.OAuthProviderIdentity;
import com.mint.oauth.OAuthProviderTokens;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
public class YouTubeOAuthClient implements OAuthProviderClient {

    public static final String READ_ONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
    private final RestClient tokenClient;
    private final RestClient apiClient;
    private final YouTubeOAuthProperties properties;

    public YouTubeOAuthClient(
            @Qualifier("youtubeTokenRestClient") RestClient tokenClient,
            @Qualifier("youtubeApiRestClient") RestClient apiClient,
            YouTubeOAuthProperties properties) {
        this.tokenClient = tokenClient;
        this.apiClient = apiClient;
        this.properties = properties;
    }

    @Override
    public ExternalProvider provider() {
        return ExternalProvider.YOUTUBE;
    }

    @Override
    public boolean configured() {
        return present(properties.getClientId()) && present(properties.getClientSecret())
                && present(properties.getRedirectUri());
    }

    @Override
    public URI authorizationUri(String state, String codeChallenge) {
        requireConfigured();
        return UriComponentsBuilder.fromUriString(properties.getAuthorizationBaseUrl())
                .path("/o/oauth2/v2/auth")
                .queryParam("client_id", properties.getClientId())
                .queryParam("redirect_uri", properties.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", READ_ONLY_SCOPE)
                .queryParam("access_type", "offline")
                .queryParam("include_granted_scopes", "true")
                .queryParam("prompt", "consent")
                .queryParam("state", state)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", "S256")
                .build().encode().toUri();
    }

    @Override
    public OAuthProviderTokens exchange(String code, String codeVerifier) {
        MultiValueMap<String, String> form = baseTokenForm();
        form.add("grant_type", "authorization_code");
        form.add("code", code);
        form.add("redirect_uri", properties.getRedirectUri());
        form.add("code_verifier", codeVerifier);
        return tokenRequest(form);
    }

    @Override
    public OAuthProviderTokens refresh(String refreshToken) {
        MultiValueMap<String, String> form = baseTokenForm();
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", refreshToken);
        return tokenRequest(form);
    }

    @Override
    public OAuthProviderIdentity currentIdentity(String accessToken) {
        try {
            Map<String, Object> response = apiClient.get()
                    .uri(uri -> uri.path("/youtube/v3/channels")
                            .queryParam("part", "snippet")
                            .queryParam("mine", true)
                            .queryParam("maxResults", 1)
                            .build())
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() { });
            List<?> items = response == null ? List.of() : asList(response.get("items"));
            if (items.isEmpty() || !(items.getFirst() instanceof Map<?, ?> channel)) {
                throw ExternalConnectionException.providerConnectionFailed();
            }
            String id = text(channel.get("id"));
            Map<?, ?> snippet = channel.get("snippet") instanceof Map<?, ?> map ? map : Map.of();
            String title = text(snippet.get("title"));
            String imageUrl = thumbnailUrl(snippet.get("thumbnails"));
            if (id == null) throw ExternalConnectionException.providerConnectionFailed();
            return new OAuthProviderIdentity(
                    id, title, "https://www.youtube.com/channel/" + id, imageUrl);
        } catch (RestClientException exception) {
            throw ExternalConnectionException.providerConnectionFailed();
        }
    }

    private OAuthProviderTokens tokenRequest(MultiValueMap<String, String> form) {
        requireConfigured();
        try {
            Map<String, Object> body = tokenClient.post().uri("/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form).retrieve().body(new ParameterizedTypeReference<>() { });
            return tokens(body);
        } catch (RestClientException exception) {
            throw ExternalConnectionException.providerConnectionFailed();
        }
    }

    private OAuthProviderTokens tokens(Map<String, Object> body) {
        if (body == null || text(body.get("access_token")) == null) {
            throw ExternalConnectionException.providerConnectionFailed();
        }
        String scope = text(body.get("scope"));
        return new OAuthProviderTokens(
                text(body.get("access_token")), text(body.get("refresh_token")),
                number(body.get("expires_in"), 3600),
                scope == null || scope.isBlank() ? List.of() : Arrays.asList(scope.split("\\s+")));
    }

    private MultiValueMap<String, String> baseTokenForm() {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", properties.getClientId());
        form.add("client_secret", properties.getClientSecret());
        return form;
    }

    private void requireConfigured() {
        if (!configured()) throw ExternalConnectionException.providerUnavailable("YOUTUBE");
    }

    private boolean present(String value) {
        return value != null && !value.isBlank();
    }

    private static String text(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String thumbnailUrl(Object value) {
        if (!(value instanceof Map<?, ?> thumbnails)) return null;
        for (String size : List.of("high", "medium", "default")) {
            if (thumbnails.get(size) instanceof Map<?, ?> thumbnail) {
                String url = text(thumbnail.get("url"));
                if (url != null && !url.isBlank()) return url;
            }
        }
        return null;
    }

    private static long number(Object value, long fallback) {
        return value instanceof Number number ? number.longValue() : fallback;
    }

    @SuppressWarnings("unchecked")
    private static List<?> asList(Object value) {
        return value instanceof List<?> list ? list : List.of();
    }
}
