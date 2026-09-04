package com.mint.nodes;

import com.mint.onboarding.OnboardingStepStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

import java.time.LocalDateTime;

@Node("OnboardingStep")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingStep {

    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String key;
    private Integer position;
    private OnboardingStepStatus status;
    private String dataJson;
    private Integer schemaVersion;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
