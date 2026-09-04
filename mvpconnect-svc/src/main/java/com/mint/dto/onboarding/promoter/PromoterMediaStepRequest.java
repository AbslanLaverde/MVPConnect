package com.mint.dto.onboarding.promoter;

import com.mint.dto.onboarding.shared.MediaReferenceDto;
import jakarta.validation.Valid;

public record PromoterMediaStepRequest(@Valid MediaReferenceDto bannerImage) {
}
