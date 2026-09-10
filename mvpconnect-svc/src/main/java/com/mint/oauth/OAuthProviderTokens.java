package com.mint.oauth;

import java.util.List;

public record OAuthProviderTokens(
        String accessToken,
        String refreshToken,
        long expiresInSeconds,
        List<String> scopes) {
}
