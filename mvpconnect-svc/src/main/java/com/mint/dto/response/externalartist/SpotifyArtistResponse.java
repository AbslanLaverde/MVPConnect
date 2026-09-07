package com.mint.dto.response.externalartist;

public record SpotifyArtistResponse(
        String spotifyId,
        String name,
        String spotifyUrl,
        String spotifyImageUrl) {
}
