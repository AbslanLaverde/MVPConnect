package com.mint.dto.onboarding.promoter;

import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.dto.onboarding.shared.LocationDto;
import com.mint.dto.onboarding.shared.PerformanceMediaReferenceDto;
import com.mint.onboarding.taxonomy.PromoterAcceptingStatus;
import com.mint.onboarding.taxonomy.RosterSizeRange;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.list;

public record PromoterNetworkStepRequest(
        @NotNull PromoterAcceptingStatus acceptingStatus,
        RosterSizeRange rosterSize,
        @Size(max = 5) List<@Valid EntityReferenceDto> artists,
        @Size(max = 5) List<@Valid EntityReferenceDto> venues,
        @Size(max = 5) List<@Valid LocationDto> additionalMarkets,
        List<@Valid PerformanceMediaReferenceDto> pastShows) {

    public PromoterNetworkStepRequest {
        artists = list(artists);
        venues = list(venues);
        additionalMarkets = list(additionalMarkets);
        pastShows = list(pastShows);
    }
}
