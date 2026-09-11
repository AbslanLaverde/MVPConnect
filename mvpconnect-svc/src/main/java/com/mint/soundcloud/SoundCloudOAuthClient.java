package com.mint.soundcloud;

import com.mint.config.SoundCloudOAuthProperties;
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
public class SoundCloudOAuthClient implements OAuthProviderClient {

    private final RestClient accountsClient;
    private final RestClient apiClient;
    private final SoundCloudOAuthProperties properties;

    public SoundCloudOAuthClient(
            @Qualifier("soundCloudAccountsRestClient") RestClient accountsClient,
            @Qualifier("soundCloudApiRestClient") RestClient apiClient,
            SoundCloudOAuthProperties properties) {
        this.accountsClient = accountsClient;
        this.apiClient = apiClient;
        this.properties = properties;
    }

    @Override
    public ExternalProvider provider() {
        return ExternalProvider.SOUNDCLOUD;
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
                .path("/connect")
                .queryParam("client_id", properties.getClientId())
                .queryParam("redirect_uri", properties.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("state", state)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", "S256")
                .build().encode().toUri();
    }

    @Override
    public OAuthProviderTokens exchange(String code, String codeVerifier) {
        MultiValueMap<String, String> form = baseTokenForm();
        form.add("grant_type", "authorization_code");
        form.add("redirect_uri", properties.getRedirectUri());
        form.add("code_verifier", codeVerifier);
        form.add("code", code);
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
            Map<String, Object> response = apiClient.get().uri("/me")
                    .header("Authorization", "OAuth " + accessToken)
                    .retrieve().body(new ParameterizedTypeReference<>() { });
            String id = response == null ? null : text(response.get("urn"));
            if (id == null && response != null) id = text(response.get("id"));
            if (id == null) throw ExternalConnectionException.providerConnectionFailed();
            String displayName = text(response.get("username"));
            if (displayName == null) displayName = text(response.get("full_name"));
            return new OAuthProviderIdentity(
                    id,
                    displayName,
                    text(response.get("permalink_url")),
                    text(response.get("avatar_url")));
        } catch (RestClientException exception) {
            throw ExternalConnectionException.providerConnectionFailed();
        }
    }

    private OAuthProviderTokens tokenRequest(MultiValueMap<String, String> form) {
        requireConfigured();
        try {
            Map<String, Object> body = accountsClient.post().uri("/oauth/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .header("Accept", "application/json; charset=utf-8")
                    .body(form).retrieve().body(new ParameterizedTypeReference<>() { });
            if (body == null || text(body.get("access_token")) == null) {
                throw ExternalConnectionException.providerConnectionFailed();
            }
            String scope = text(body.get("scope"));
            return new OAuthProviderTokens(
                    text(body.get("access_token")), text(body.get("refresh_token")),
                    number(body.get("expires_in"), 3600),
                    scope == null || scope.isBlank() ? List.of() : Arrays.asList(scope.split("\\s+")));
        } catch (RestClientException exception) {
            throw ExternalConnectionException.providerConnectionFailed();
        }
    }

    private MultiValueMap<String, String> baseTokenForm() {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", properties.getClientId());
        form.add("client_secret", properties.getClientSecret());
        return form;
    }

    private void requireConfigured() {
        if (!configured()) throw ExternalConnectionException.providerUnavailable("SOUNDCLOUD");
    }

    private boolean present(String value) {
        return value != null && !value.isBlank();
    }

    private static String text(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static long number(Object value, long fallback) {
        return value instanceof Number number ? number.longValue() : fallback;
    }
}
