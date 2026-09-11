package com.mint.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SetArtistIdentityRequest(
        @NotBlank @Size(max = 255) String externalArtistId) {
}
