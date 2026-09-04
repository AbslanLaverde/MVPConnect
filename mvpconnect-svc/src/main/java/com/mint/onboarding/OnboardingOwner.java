package com.mint.onboarding;

import com.mint.nodes.OnboardingDraft;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Common onboarding workflow contract implemented by each canonical persona node.
 * Persona-specific profile fields intentionally remain outside this interface.
 */
public interface OnboardingOwner extends StructuredLocationOwner {

    String getId();

    PersonaOnboardingStatus getOnboardingStatus();

    void setOnboardingStatus(PersonaOnboardingStatus status);

    LocalDateTime getOnboardingCompletedAt();

    void setOnboardingCompletedAt(LocalDateTime completedAt);

    Integer getOnboardingVersion();

    void setOnboardingVersion(Integer onboardingVersion);

    List<OnboardingDraft> getOnboardingDrafts();

    void setOnboardingDrafts(List<OnboardingDraft> onboardingDrafts);

    void setUpdatedAt(LocalDateTime updatedAt);
}
