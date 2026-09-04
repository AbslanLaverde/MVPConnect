package com.mint.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Neo4jSchemaInitializerTest {

    @Test
    void schemaStatementsAreIdempotentAndCoverOnboardingIdentity() {
        assertEquals(6, Neo4jSchemaInitializer.CONSTRAINTS.size());
        assertTrue(Neo4jSchemaInitializer.CONSTRAINTS.stream()
                .allMatch(statement -> statement.contains("IF NOT EXISTS")));
        assertTrue(Neo4jSchemaInitializer.CONSTRAINTS.stream()
                .anyMatch(statement -> statement.contains("OnboardingDraft")
                        && statement.contains("node.id IS UNIQUE")));
        assertTrue(Neo4jSchemaInitializer.CONSTRAINTS.stream()
                .anyMatch(statement -> statement.contains("OnboardingStep")
                        && statement.contains("node.id IS UNIQUE")));
        assertTrue(Neo4jSchemaInitializer.CONSTRAINTS.stream()
                .anyMatch(statement -> statement.contains("node.ownerVersionKey IS UNIQUE")));
    }
}
