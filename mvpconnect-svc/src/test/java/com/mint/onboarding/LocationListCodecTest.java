package com.mint.onboarding;

import com.mint.dto.onboarding.shared.LocationDto;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class LocationListCodecTest {

    @Test
    void preservesStructuredLocationsAndOrder() {
        List<LocationDto> locations = List.of(
                new LocationDto("Austin, TX", null, null, "Austin", "TX", null,
                        "US", 30.2672, -97.7431, null, "austin-place"),
                new LocationDto("Chicago, IL", null, null, "Chicago", "IL", null,
                        "US", null, null, null, null));

        List<LocationDto> decoded = LocationListCodec.decode(LocationListCodec.encode(locations));

        assertEquals(List.of("Austin", "Chicago"), decoded.stream().map(LocationDto::city).toList());
        assertEquals("austin-place", decoded.getFirst().placeId());
        assertNull(decoded.get(1).placeId());
    }
}
