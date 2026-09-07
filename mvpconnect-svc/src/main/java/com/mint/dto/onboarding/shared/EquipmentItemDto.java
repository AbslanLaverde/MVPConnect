package com.mint.dto.onboarding.shared;

import com.mint.onboarding.taxonomy.EquipmentCode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record EquipmentItemDto(
        @NotNull EquipmentCode code,
        @Min(1) @Max(99) Integer quantity) {
}
