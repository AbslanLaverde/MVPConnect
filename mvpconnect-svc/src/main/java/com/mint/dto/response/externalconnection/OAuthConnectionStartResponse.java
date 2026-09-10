package com.mint.dto.response.externalconnection;

import com.mint.externalconnection.ExternalProvider;

import java.time.LocalDateTime;

public record OAuthConnectionStartResponse(
        String attemptId,
        ExternalProvider provider,
        String authorizationUrl,
        LocalDateTime expiresAt) {
}
