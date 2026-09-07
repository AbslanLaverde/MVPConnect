package com.mint.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.data.neo4j.repository.query.Query;

import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class VenueIdentityRepositoryContractTest {

    @Test
    void localSearchIsPartialCaseInsensitiveNormalizedBoundedAndLocationAware() throws Exception {
        Method method = VenueIdentityRepository.class.getMethod("searchByName", String.class, long.class);
        String cypher = method.getAnnotation(Query.class).value();

        assertTrue(cypher.contains("toLower(venue.name) CONTAINS $query"));
        assertTrue(cypher.contains("venue.normalizedName CONTAINS $query"));
        assertTrue(cypher.contains("venue.locationCity"));
        assertTrue(cypher.contains("venue.locationState"));
        assertTrue(cypher.contains("LIMIT $limit"));
    }

    @Test
    void canonicalVenueRelationshipsUseMergeForCompletionIdempotency() throws Exception {
        for (String methodName : List.of("linkPlayedAt", "linkWorksWith")) {
            Method method = VenueIdentityRepository.class.getMethod(methodName, String.class, String.class);
            assertTrue(method.getAnnotation(Query.class).value().contains("MERGE"));
        }
    }

    @Test
    void freeFormReuseExcludesGoogleIdentitiesAndUsesLocationContext() throws Exception {
        Method method = VenueIdentityRepository.class.getMethod(
                "findReusableFreeForm", String.class, String.class, String.class);
        String cypher = method.getAnnotation(Query.class).value();

        assertTrue(cypher.contains("venue.source IN ['FREE_FORM', 'FREE_FORM_GOOGLE_UNAVAILABLE']"));
        assertTrue(cypher.contains("locationCity"));
        assertTrue(cypher.contains("locationState"));
    }
}
