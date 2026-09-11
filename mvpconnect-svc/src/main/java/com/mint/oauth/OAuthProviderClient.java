package com.mint.oauth;

import com.mint.externalconnection.ExternalProvider;

import java.net.URI;

public interface OAuthProviderClient {
    ExternalProvider provider();
    boolean configured();
    URI authorizationUri(String state, String codeChallenge);
    OAuthProviderTokens exchange(String code, String codeVerifier);
    OAuthProviderTokens refresh(String refreshToken);
    OAuthProviderIdentity currentIdentity(String accessToken);
}
