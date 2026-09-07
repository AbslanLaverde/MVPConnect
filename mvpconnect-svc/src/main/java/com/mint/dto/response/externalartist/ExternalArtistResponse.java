package com.mint.dto.response.externalartist;

import com.mint.externalartist.ExternalArtistEnrichmentStatus;
import com.mint.externalartist.ExternalArtistResolutionStatus;
import com.mint.externalartist.ExternalArtistSource;
import com.mint.nodes.ExternalArtist;

public record ExternalArtistResponse(
        String id,
        String name,
        String spotifyId,
        String spotifyUrl,
        String spotifyImageUrl,
        ExternalArtistSource source,
        ExternalArtistResolutionStatus resolutionStatus,
        ExternalArtistEnrichmentStatus enrichmentStatus) {

    public static ExternalArtistResponse from(ExternalArtist artist) {
        return new ExternalArtistResponse(
                artist.getId(),
                artist.getName(),
                artist.getSpotifyId(),
                artist.getSpotifyUrl(),
                artist.getSpotifyImageUrl(),
                artist.getSource(),
                artist.getResolutionStatus(),
                artist.getEnrichmentStatus()
        );
    }
}
