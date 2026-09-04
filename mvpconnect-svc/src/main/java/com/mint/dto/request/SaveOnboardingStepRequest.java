package com.mint.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveOnboardingStepRequest {

    @NotNull(message = "Step data is required")
    private Map<String, Object> data;
}
