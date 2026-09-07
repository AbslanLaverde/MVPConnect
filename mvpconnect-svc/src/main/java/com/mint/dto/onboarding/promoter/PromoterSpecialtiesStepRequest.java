package com.mint.dto.onboarding.promoter;

import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.onboarding.taxonomy.EventTypeCode;
import com.mint.onboarding.taxonomy.GenreCode;
import com.mint.onboarding.taxonomy.VibeCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.validationList;

public record PromoterSpecialtiesStepRequest(
        @NotEmpty @Size(max = 5) List<@NotNull GenreCode> genres,
        @NotEmpty @Size(max = 5) List<@NotNull EventTypeCode> eventTypes,
        @Size(max = 3) List<@NotNull VibeCode> vibes,
        @Size(max = 5) List<@NotNull @Valid EntityReferenceDto> artistsWorkedWith) {

    public PromoterSpecialtiesStepRequest {
        genres = validationList(genres);
        eventTypes = validationList(eventTypes);
        vibes = validationList(vibes);
        artistsWorkedWith = validationList(artistsWorkedWith);
    }
}
