package com.mint.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HealthGroupConfigurationTest {

    @Test
    void livenessIsProcessOnlyAndReadinessIncludesRequiredDependencies() throws IOException {
        Properties properties = new Properties();
        try (InputStream input = getClass().getResourceAsStream("/application.properties")) {
            properties.load(input);
        }

        assertEquals(
                "livenessState",
                properties.getProperty("management.endpoint.health.group.liveness.include")
        );
        assertEquals(
                "readinessState,neo4j,objectStorage",
                properties.getProperty("management.endpoint.health.group.readiness.include")
        );
        assertEquals(
                "never",
                properties.getProperty("management.endpoint.health.show-details")
        );
    }
}
