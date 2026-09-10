package com.mint.oauth;

public record OAuthProviderIdentity(
        String providerAccountId,
        String displayName,
        String profileUrl,
        String providerImageUrl) {
}
