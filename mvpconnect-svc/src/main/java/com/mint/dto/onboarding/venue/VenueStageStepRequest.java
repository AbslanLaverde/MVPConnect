package com.mint.dto.onboarding.venue;

import com.mint.onboarding.taxonomy.EquipmentCode;
import com.mint.onboarding.taxonomy.PaAvailability;
import com.mint.onboarding.taxonomy.ProductionAmenityCode;
import com.mint.onboarding.taxonomy.SoundEngineerAvailability;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record VenueStageStepRequest(
        @Positive Double stageWidthFeet,
        @Positive Double stageDepthFeet,
        @NotNull SoundEngineerAvailability soundEngineerAvailability,
        @NotNull PaAvailability paAvailability,
        List<EquipmentCode> equipmentAvailable,
        List<ProductionAmenityCode> productionAmenities) {

    public VenueStageStepRequest {
        equipmentAvailable = list(equipmentAvailable);
        productionAmenities = list(productionAmenities);
    }
}
