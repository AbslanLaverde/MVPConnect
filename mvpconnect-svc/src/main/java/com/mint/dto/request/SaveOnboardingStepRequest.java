package com.mint.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;

public record SaveOnboardingStepRequest(
        @NotNull(message = "Step data is required") JsonNode data) {
}
