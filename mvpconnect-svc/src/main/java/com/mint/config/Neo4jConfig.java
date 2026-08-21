package com.mint.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.neo4j.repository.config.EnableNeo4jRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Neo4j Configuration
 *
 * Spring Boot auto-configures Neo4j based on application.properties.
 * This class enables Neo4j repositories and transaction management.
 */
@Configuration
@EnableNeo4jRepositories(basePackages = "com.mint.repositories")
@EnableTransactionManagement
public class Neo4jConfig {

    // Spring Boot 3.x auto-configuration handles the driver and session factory
    // based on spring.neo4j.* properties in application.properties

    // If custom configuration is needed later (connection pooling, etc.),
    // we can add @Bean methods here
}

