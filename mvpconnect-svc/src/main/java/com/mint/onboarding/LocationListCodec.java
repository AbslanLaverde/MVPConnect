package com.mint.onboarding;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mint.dto.onboarding.shared.LocationDto;

import java.util.ArrayList;
import java.util.List;

/**
 * Maps ordered structured locations to a Neo4j-compatible string-list property.
 * Each item is self-contained JSON so optional provider metadata is retained.
 */
public final class LocationListCodec {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private LocationListCodec() {
    }

    public static List<String> encode(List<LocationDto> locations) {
        if (locations == null || locations.isEmpty()) return List.of();
        return locations.stream().map(LocationListCodec::encodeOne).toList();
    }

    public static List<LocationDto> decode(List<String> storedLocations) {
        if (storedLocations == null || storedLocations.isEmpty()) return List.of();
        List<LocationDto> result = new ArrayList<>(storedLocations.size());
        for (String value : storedLocations) {
            LocationDto location = decodeOne(value);
            if (location != null) result.add(location);
        }
        return List.copyOf(result);
    }

    private static String encodeOne(LocationDto location) {
        try {
            return OBJECT_MAPPER.writeValueAsString(location);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Location cannot be encoded", exception);
        }
    }

    private static LocationDto decodeOne(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return OBJECT_MAPPER.readValue(value, LocationDto.class);
        } catch (JsonProcessingException exception) {
            return null;
        }
    }
}
