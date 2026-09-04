package com.mint.dto.response;

import com.mint.onboarding.OnboardingStepStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingStepResponse {

    private String key;
    private Integer position;
    private boolean required;
    private OnboardingStepStatus status;
    private Map<String, Object> data;
}
