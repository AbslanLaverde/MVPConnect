package com.mint.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OAuthConnectionStartRequest(
        @NotBlank @Size(max = 2048) String returnTarget) {
}
