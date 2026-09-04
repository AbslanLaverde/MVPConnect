package com.mint.dto.onboarding.promoter;

import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.onboarding.taxonomy.EventTypeCode;
import com.mint.onboarding.taxonomy.GenreCode;
import com.mint.onboarding.taxonomy.VibeCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record PromoterSpecialtiesStepRequest(
        @NotEmpty @Size(max = 5) List<GenreCode> genres,
        @NotEmpty @Size(max = 5) List<EventTypeCode> eventTypes,
        @Size(max = 3) List<VibeCode> vibes,
        @Size(max = 5) List<@Valid EntityReferenceDto> artistsWorkedWith) {

    public PromoterSpecialtiesStepRequest {
        genres = list(genres);
        eventTypes = list(eventTypes);
        vibes = list(vibes);
        artistsWorkedWith = list(artistsWorkedWith);
    }
}
