package com.mint.dto.response;

import com.mint.media.MediaStatus;

import java.time.Instant;
import java.util.Map;

public record MediaUploadResponse(
        String mediaId,
        MediaStatus status,
        String uploadUrl,
        Instant expiresAt,
        Map<String, String> requiredHeaders) {
}
