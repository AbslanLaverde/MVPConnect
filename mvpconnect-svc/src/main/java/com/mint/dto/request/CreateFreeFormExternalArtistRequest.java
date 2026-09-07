package com.mint.dto.request;

import com.mint.externalartist.SpotifyAttemptStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateFreeFormExternalArtistRequest(
        @NotBlank @Size(max = 255) String displayName,
        @NotNull SpotifyAttemptStatus spotifyAttemptStatus) {
}
