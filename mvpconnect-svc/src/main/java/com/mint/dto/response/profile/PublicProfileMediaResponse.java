package com.mint.dto.response.profile;

public record PublicProfileMediaResponse(
        String mediaId,
        String url,
        String mimeType,
        Integer width,
        Integer height) {
}
