package com.mint.repositories;

import com.mint.nodes.OnboardingDraft;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OnboardingDraftRepository extends Neo4jRepository<OnboardingDraft, String> {

    @Query("""
            MATCH (owner)-[:HAS_ONBOARDING_DRAFT]->(draft:OnboardingDraft)
            WHERE owner.id = $ownerId
              AND $persona IN labels(owner)
              AND draft.persona = $persona
              AND draft.onboardingVersion = $onboardingVersion
            OPTIONAL MATCH (draft)-[hasStep:HAS_STEP]->(step:OnboardingStep)
            RETURN draft, collect(hasStep), collect(step)
            ORDER BY draft.createdAt DESC
            LIMIT 1
            """)
    Optional<OnboardingDraft> findForOwner(
            @Param("ownerId") String ownerId,
            @Param("persona") String persona,
            @Param("onboardingVersion") Integer onboardingVersion
    );
}
