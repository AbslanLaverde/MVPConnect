package com.mint.dto.response.externalconnection;

import com.mint.externalconnection.ExternalProvider;
import com.mint.oauth.OAuthAttemptStatus;

import java.time.LocalDateTime;

public record OAuthConnectionAttemptResponse(
        String attemptId,
        ExternalProvider provider,
        OAuthAttemptStatus status,
        SelfExternalConnectionResponse connection,
        String errorCode,
        LocalDateTime expiresAt,
        LocalDateTime updatedAt) {
}
