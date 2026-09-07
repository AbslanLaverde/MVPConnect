package com.mint.config;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Session;
import org.neo4j.driver.SessionConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Central, non-destructive Neo4j schema initialization for identity properties.
 */
@Component
public class Neo4jSchemaInitializer implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(Neo4jSchemaInitializer.class);

    static final List<String> SCHEMA_STATEMENTS = List.of(
            "CREATE CONSTRAINT musician_id_unique IF NOT EXISTS FOR (node:Musician) REQUIRE node.id IS UNIQUE",
            "CREATE CONSTRAINT venue_id_unique IF NOT EXISTS FOR (node:Venue) REQUIRE node.id IS UNIQUE",
            "CREATE CONSTRAINT promoter_id_unique IF NOT EXISTS FOR (node:Promoter) REQUIRE node.id IS UNIQUE",
            "CREATE CONSTRAINT onboarding_draft_id_unique IF NOT EXISTS FOR (node:OnboardingDraft) REQUIRE node.id IS UNIQUE",
            "CREATE CONSTRAINT onboarding_step_id_unique IF NOT EXISTS FOR (node:OnboardingStep) REQUIRE node.id IS UNIQUE",
            "CREATE CONSTRAINT media_asset_id_unique IF NOT EXISTS FOR (node:MediaAsset) REQUIRE node.id IS UNIQUE",
            "CREATE CONSTRAINT onboarding_draft_owner_version_unique IF NOT EXISTS "
                    + "FOR (node:OnboardingDraft) REQUIRE node.ownerVersionKey IS UNIQUE",
            "CREATE CONSTRAINT external_artist_id_unique IF NOT EXISTS "
                    + "FOR (node:ExternalArtist) REQUIRE node.id IS UNIQUE",
            "CREATE CONSTRAINT external_artist_spotify_id_unique IF NOT EXISTS "
                    + "FOR (node:ExternalArtist) REQUIRE node.spotifyId IS UNIQUE",
            "CREATE TEXT INDEX external_artist_normalized_name_text IF NOT EXISTS "
                    + "FOR (node:ExternalArtist) ON (node.normalizedName)"
    );

    private final Driver driver;
    private final String database;

    public Neo4jSchemaInitializer(
            Driver driver,
            @Value("${spring.data.neo4j.database:neo4j}") String database) {
        this.driver = driver;
        this.database = database;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Session session = driver.session(SessionConfig.forDatabase(database))) {
            session.executeWrite(transaction -> {
                SCHEMA_STATEMENTS.forEach(statement -> transaction.run(statement).consume());
                return null;
            });
        }
        logger.info("Verified {} Neo4j schema statements", SCHEMA_STATEMENTS.size());
    }
}
