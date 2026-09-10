package com.mint.dto.response.externalconnection;

import com.mint.externalconnection.ExternalProvider;

public record PublicExternalConnectionResponse(
        ExternalProvider provider,
        String displayName,
        String profileUrl,
        String providerImageUrl) {
}
