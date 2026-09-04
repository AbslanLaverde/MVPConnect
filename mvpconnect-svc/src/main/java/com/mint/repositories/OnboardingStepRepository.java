package com.mint.repositories;

import com.mint.nodes.OnboardingStep;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface OnboardingStepRepository extends Neo4jRepository<OnboardingStep, String> {

    @Query("""
            MATCH (step:OnboardingStep {id: $stepId})-[:HAS_MEDIA]->(media:MediaAsset {id: $mediaId})
            RETURN count(media) > 0
            """)
    boolean isMediaAssociated(
            @Param("stepId") String stepId,
            @Param("mediaId") String mediaId
    );
}
