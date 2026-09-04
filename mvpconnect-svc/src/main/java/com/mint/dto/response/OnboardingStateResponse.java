package com.mint.dto.response;

import com.mint.onboarding.OnboardingDraftStatus;
import com.mint.onboarding.PersonaType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingStateResponse {

    private PersonaType persona;
    private OnboardingDraftStatus status;
    private String currentStep;
    private Integer onboardingVersion;
    private List<OnboardingStepResponse> steps = new ArrayList<>();
}
