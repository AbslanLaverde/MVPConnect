package com.mint.dto.onboarding.venue;

import com.mint.dto.onboarding.shared.EquipmentItemDto;
import com.mint.onboarding.taxonomy.PaAvailability;
import com.mint.onboarding.taxonomy.ProductionAmenityCode;
import com.mint.onboarding.taxonomy.SoundEngineerAvailability;
import com.mint.onboarding.taxonomy.SoundcheckAvailability;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record VenueStageStepRequest(
        @Positive Double stageWidthFeet,
        @Positive Double stageDepthFeet,
        @NotNull SoundEngineerAvailability soundEngineerAvailability,
        @NotNull SoundcheckAvailability soundcheckAvailability,
        @NotNull PaAvailability paAvailability,
        List<@Valid EquipmentItemDto> equipmentAvailable,
        List<ProductionAmenityCode> productionAmenities) {

    public VenueStageStepRequest {
        equipmentAvailable = list(equipmentAvailable);
        productionAmenities = list(productionAmenities);
    }
}
