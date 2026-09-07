package com.mint.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.data.neo4j.repository.query.Query;

import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ExternalArtistRepositoryContractTest {

    @Test
    void localSearchIsCaseInsensitivePartialAndBoundedAcrossBothNameFields() throws Exception {
        Method method = ExternalArtistRepository.class.getMethod("searchByName", String.class, long.class);
        String cypher = method.getAnnotation(Query.class).value();

        assertTrue(cypher.contains("toLower(artist.name) CONTAINS $query"));
        assertTrue(cypher.contains("artist.normalizedName CONTAINS $query"));
        assertTrue(cypher.contains("LIMIT $limit"));
    }

    @Test
    void canonicalRelationshipsUseMergeForIdempotency() throws Exception {
        List<String> methods = List.of("linkSoundsLike", "linkHasBooked", "linkHasWorkedWith");
        for (String methodName : methods) {
            Method method = ExternalArtistRepository.class
                    .getMethod(methodName, String.class, String.class);
            assertTrue(method.getAnnotation(Query.class).value().contains("MERGE"));
        }
    }
}
