package com.mint.dto.onboarding.artist;

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

public record ArtistSoundStepRequest(
        @NotEmpty @Size(max = 5) List<@NotNull GenreCode> genres,
        @NotEmpty @Size(max = 3) List<@NotNull VibeCode> vibes,
        @Size(max = 5) List<@NotNull EventTypeCode> eventTypes,
        @Size(max = 5) List<@NotNull @Valid EntityReferenceDto> soundsLikeArtists) {

    public ArtistSoundStepRequest {
        genres = validationList(genres);
        vibes = validationList(vibes);
        eventTypes = validationList(eventTypes);
        soundsLikeArtists = validationList(soundsLikeArtists);
    }
}
