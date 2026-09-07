package com.mint.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mint.dto.request.SaveOnboardingStepRequest;
import com.mint.onboarding.PersonaType;

public final class OnboardingTestFixtures {

    private static final ObjectMapper MAPPER = new ObjectMapper().findAndRegisterModules();

    private OnboardingTestFixtures() {
    }

    public static SaveOnboardingStepRequest request(PersonaType persona, String stepKey) {
        return new SaveOnboardingStepRequest(validStep(persona, stepKey));
    }

    public static ObjectNode validStep(PersonaType persona, String stepKey) {
        String json = switch (persona) {
            case MUSICIAN -> musicianStep(stepKey);
            case VENUE -> venueStep(stepKey);
            case PROMOTER -> promoterStep(stepKey);
        };
        try {
            return (ObjectNode) MAPPER.readTree(json);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Invalid onboarding test fixture", exception);
        }
    }

    private static String musicianStep(String stepKey) {
        return switch (stepKey) {
            case "basics" -> """
                    {
                      "profileImage": {"mediaId": "musician-profile"},
                      "bio": "Glass Houses makes atmospheric indie rock.",
                      "location": {
                        "displayName": "Brooklyn, NY",
                        "city": "Brooklyn",
                        "state": "NY",
                        "country": "US"
                      }
                    }
                    """;
            case "sound" -> """
                    {
                      "genres": ["INDIE", "ALTERNATIVE"],
                      "vibes": ["ATMOSPHERIC", "DARK"],
                      "eventTypes": ["CONCERT"],
                      "soundsLikeArtists": [
                        {
                          "entityType": "ARTIST",
                          "entityId": "external-the-national",
                          "displayName": "The National",
                          "external": true
                        }
                      ]
                    }
                    """;
            case "live" -> """
                    {
                      "bookingStatus": "ACTIVELY_BOOKING",
                      "typicalDraw": "FROM_101_TO_250",
                      "touring": true,
                      "setLengthMinutes": 60,
                      "equipmentBrought": ["GUITAR_AMP"],
                      "venuesPlayed": [],
                      "performanceImages": []
                    }
                    """;
            case "media" -> "{}";
            case "goals" -> "{\"connectionGoals\":[\"BOOK_SHOWS\",\"FIND_PROMOTERS\"]}";
            default -> throw new IllegalArgumentException("Unknown musician step " + stepKey);
        };
    }

    private static String venueStep(String stepKey) {
        return switch (stepKey) {
            case "room" -> """
                    {
                      "profileImage": {"mediaId": "venue-profile"},
                      "description": "Independent live room.",
                      "location": {
                        "displayName": "The Marlowe Room, New York, NY",
                        "addressLine1": "123 Orchard Street",
                        "city": "New York",
                        "state": "NY",
                        "postalCode": "10002",
                        "country": "US"
                      },
                      "capacity": 250
                    }
                    """;
            case "music" -> """
                    {
                      "genres": ["INDIE", "ROCK"],
                      "ambience": ["INTIMATE", "GRITTY"],
                      "eventTypes": ["CONCERT"],
                      "artistsBooked": []
                    }
                    """;
            case "stage" -> """
                    {
                      "stageWidthFeet": 24.0,
                      "stageDepthFeet": 16.0,
                      "soundEngineerAvailability": "IN_HOUSE",
                      "paAvailability": "FULL_HOUSE_PA",
                      "equipmentAvailable": ["MICROPHONES", "STAGE_MONITORS"],
                      "productionAmenities": ["GREEN_ROOM"]
                    }
                    """;
            case "booking" -> """
                    {
                      "bookingStatus": "ACTIVELY_BOOKING",
                      "bookingMethod": "BOTH",
                      "desiredArtistDraw": "FROM_101_TO_250",
                      "bookingEmail": "booking@marloweroom.example"
                    }
                    """;
            case "media" -> "{}";
            case "goals" -> "{\"connectionGoals\":[\"FIND_ARTISTS\",\"FIND_PROMOTERS\"]}";
            default -> throw new IllegalArgumentException("Unknown venue step " + stepKey);
        };
    }

    private static String promoterStep(String stepKey) {
        return switch (stepKey) {
            case "business" -> """
                    {
                      "profileImage": {"mediaId": "promoter-profile"},
                      "bio": "Independent NYC promoter.",
                      "location": {
                        "displayName": "New York, NY",
                        "city": "New York",
                        "state": "NY",
                        "country": "US"
                      },
                      "websiteUrl": "https://promoter.example",
                      "phone": "+1 212 555 0100"
                    }
                    """;
            case "specialties" -> """
                    {
                      "genres": ["INDIE", "ROCK"],
                      "eventTypes": ["CONCERT", "SHOWCASE"],
                      "vibes": ["ENERGETIC"],
                      "artistsWorkedWith": []
                    }
                    """;
            case "network" -> """
                    {
                      "acceptingStatus": "ACTIVELY_ACCEPTING",
                      "rosterSize": "ONE_TO_FIVE",
                      "artists": [],
                      "venues": [],
                      "additionalMarkets": [],
                      "pastShows": []
                    }
                    """;
            case "media" -> "{}";
            case "goals" -> "{\"connectionGoals\":[\"FIND_ARTISTS\",\"FIND_VENUES\"]}";
            default -> throw new IllegalArgumentException("Unknown promoter step " + stepKey);
        };
    }
}
