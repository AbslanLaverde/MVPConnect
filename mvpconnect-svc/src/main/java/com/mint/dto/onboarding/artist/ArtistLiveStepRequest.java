package com.mint.dto.onboarding.artist;

import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.dto.onboarding.shared.PerformanceMediaReferenceDto;
import com.mint.onboarding.taxonomy.ArtistBookingStatus;
import com.mint.onboarding.taxonomy.DrawRangeCode;
import com.mint.onboarding.taxonomy.EquipmentCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record ArtistLiveStepRequest(
        @NotNull ArtistBookingStatus bookingStatus,
        @NotNull DrawRangeCode typicalDraw,
        @Min(1) @Max(1000) Integer travelRadiusMiles,
        Boolean touring,
        Integer setLengthMinutes,
        List<EquipmentCode> equipmentBrought,
        @Size(max = 5) List<@Valid EntityReferenceDto> venuesPlayed,
        List<@Valid PerformanceMediaReferenceDto> performanceImages) {

    public ArtistLiveStepRequest {
        equipmentBrought = list(equipmentBrought);
        venuesPlayed = list(venuesPlayed);
        performanceImages = list(performanceImages);
    }
}
