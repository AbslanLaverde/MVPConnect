package com.mint.dto.request;

import com.mint.externalconnection.ExternalProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpsertUrlExternalConnectionRequest(
        @NotNull ExternalProvider provider,
        @NotBlank @Size(max = 2048) String profile,
        @Size(max = 255) String displayName) {
}
