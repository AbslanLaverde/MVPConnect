package com.mint.nodes;

import com.mint.onboarding.OnboardingDraftStatus;
import com.mint.onboarding.PersonaType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Node("OnboardingDraft")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingDraft {

    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private PersonaType persona;
    private OnboardingDraftStatus status;
    private String currentStepKey;
    private Integer onboardingVersion;
    private String ownerVersionKey;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Relationship(type = "HAS_STEP", direction = Relationship.Direction.OUTGOING)
    private List<OnboardingStep> steps = new ArrayList<>();
}
