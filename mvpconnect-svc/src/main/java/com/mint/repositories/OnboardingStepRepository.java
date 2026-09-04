package com.mint.repositories;

import com.mint.nodes.OnboardingStep;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OnboardingStepRepository extends Neo4jRepository<OnboardingStep, String> {
}
