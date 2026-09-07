package com.mint.dto.request;

import com.mint.externalartist.ExternalArtistProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResolveExternalArtistRequest(
        @NotNull ExternalArtistProvider provider,
        @NotBlank @Size(max = 255) String providerArtistId) {
}
