package com.mint.spotify;

public record SpotifyArtistIdentity(
        String spotifyId,
        String name,
        String spotifyUri,
        String spotifyUrl,
        String spotifyImageUrl) {
}
