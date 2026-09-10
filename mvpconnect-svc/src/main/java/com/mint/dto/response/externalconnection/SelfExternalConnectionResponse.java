package com.mint.dto.response.externalconnection;

import com.mint.externalconnection.ExternalConnectionMethod;
import com.mint.externalconnection.ExternalConnectionStatus;
import com.mint.externalconnection.ExternalProvider;

import java.time.LocalDateTime;

public record SelfExternalConnectionResponse(
        String connectionId,
        ExternalProvider provider,
        ExternalConnectionMethod connectionMethod,
        ExternalConnectionStatus status,
        String displayName,
        String profileUrl,
        String providerImageUrl,
        LocalDateTime connectedAt,
        LocalDateTime updatedAt,
        String actionCode) {
}
