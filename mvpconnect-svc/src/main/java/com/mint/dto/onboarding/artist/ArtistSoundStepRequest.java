package com.mint.dto.onboarding.artist;

import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.onboarding.taxonomy.EventTypeCode;
import com.mint.onboarding.taxonomy.GenreCode;
import com.mint.onboarding.taxonomy.VibeCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record ArtistSoundStepRequest(
        @NotEmpty @Size(max = 5) List<GenreCode> genres,
        @NotEmpty @Size(max = 3) List<VibeCode> vibes,
        @Size(max = 5) List<EventTypeCode> eventTypes,
        @Size(max = 5) List<@Valid EntityReferenceDto> soundsLikeArtists) {

    public ArtistSoundStepRequest {
        genres = list(genres);
        vibes = list(vibes);
        eventTypes = list(eventTypes);
        soundsLikeArtists = list(soundsLikeArtists);
    }
}
