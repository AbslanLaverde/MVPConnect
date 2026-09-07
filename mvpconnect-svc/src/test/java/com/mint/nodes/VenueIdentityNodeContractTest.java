package com.mint.nodes;

import com.mint.dto.response.venueidentity.VenueIdentityResponse;
import org.junit.jupiter.api.Test;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

import java.util.Set;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class VenueIdentityNodeContractTest {

    @Test
    void usesUuidIdentityAndContainsNoAccountAuthorityFields() throws Exception {
        assertEquals("VenueIdentity", VenueIdentity.class.getAnnotation(Node.class).value()[0]);
        GeneratedValue generated = VenueIdentity.class.getDeclaredField("id")
                .getAnnotation(GeneratedValue.class);
        assertNotNull(generated);
        assertEquals(UUIDStringGenerator.class, generated.value());

        Set<String> fields = Set.of("email", "password", "bookingEmail", "onboardingStatus");
        for (var field : VenueIdentity.class.getDeclaredFields()) {
            assertFalse(fields.contains(field.getName()));
        }
        Set<String> transientPhotoFields = Set.of(
                "providerImageUrl", "googlePhotoName", "googlePhotoUrl", "photo"
        );
        for (var field : VenueIdentity.class.getDeclaredFields()) {
            assertFalse(transientPhotoFields.contains(field.getName()));
        }
    }

    @Test
    void resolverResponseDoesNotExposeEnrichmentOrAccountInternals() {
        Set<String> responseFields = Arrays.stream(VenueIdentityResponse.class.getRecordComponents())
                .map(component -> component.getName())
                .collect(java.util.stream.Collectors.toSet());

        assertFalse(responseFields.contains("enrichmentStatus"));
        assertFalse(responseFields.contains("email"));
        assertFalse(responseFields.contains("bookingEmail"));
        assertFalse(responseFields.contains("password"));
    }
}
