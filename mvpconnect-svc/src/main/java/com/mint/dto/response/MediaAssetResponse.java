package com.mint.dto.response;

import com.mint.media.MediaContext;
import com.mint.media.MediaStatus;
import com.mint.media.MediaType;

import java.time.Instant;
import java.time.LocalDateTime;

public record MediaAssetResponse(
        String id,
        MediaType mediaType,
        MediaContext mediaContext,
        String originalFileName,
        String mimeType,
        Long sizeBytes,
        Integer width,
        Integer height,
        Integer sortOrder,
        MediaStatus status,
        String url,
        Instant urlExpiresAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
