package com.mint.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mint.dto.response.discovery.MusicianSearchResultResponse;
import com.mint.dto.response.discovery.VenueMatchResponse;
import com.mint.dto.response.discovery.VenueSearchResultResponse;
import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Venue;
import com.mint.onboarding.PersonaType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiscoveryProfileMapperTest {

    @Mock
    private PublicProfileMediaService mediaService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PublicProfileMediaResponse image = new PublicProfileMediaResponse(
            "media-1", "https://storage.example/read", "image/jpeg", 600, 300
    );
    private DiscoveryProfileMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new DiscoveryProfileMapper(new ProfileLocationMapper(), mediaService);
    }

    @Test
    void musicianSearchUsesSafeFieldsAndCanonicalMedia() {
        Musician musician = new Musician();
        musician.setId("musician-1");
        musician.setName("Glass Houses");
        musician.setEmail("private@example.com");
        musician.setMinimumFee("$500");
        musician.setWillingToTravel(true);
        musician.setLocationCity("Brooklyn");
        musician.setLocationState("NY");
        musician.setLocationAddressLine1("Private apartment");
        musician.setGenres(List.of("INDIE"));
        musician.setVibes(List.of("RAW"));
        when(mediaService.findProfileImage("musician-1", PersonaType.MUSICIAN)).thenReturn(image);

        MusicianSearchResultResponse response = mapper.musicianSearchResult(musician);
        JsonNode json = objectMapper.valueToTree(response);

        assertEquals("Brooklyn, NY", json.path("location").path("displayName").asText());
        assertEquals("media-1", json.path("profileImage").path("mediaId").asText());
        assertFalse(json.has("email"));
        assertFalse(json.has("minimumFee"));
        assertFalse(json.has("willingToTravel"));
        assertFalse(json.path("location").has("addressLine1"));
        assertFalse(json.path("profileImage").has("objectKey"));
    }

    @Test
    void venueSearchAndMatchOmitBudgetContactAndStorageInternals() {
        Venue venue = new Venue();
        venue.setId("venue-1");
        venue.setVenueName("The Marlowe Room");
        venue.setEmail("account@example.com");
        venue.setBookingEmail("booking@example.com");
        venue.setTypicalBudget("$1,000");
        venue.setLiveMusic(true);
        venue.setLocationDisplay("123 Bedford Ave, Brooklyn, NY");
        venue.setLocationAddressLine1("123 Bedford Ave");
        venue.setCapacity(250);
        venue.setGenrePreferences(List.of("INDIE"));
        venue.setAmbience(List.of("INTIMATE"));
        when(mediaService.findProfileImage("venue-1", PersonaType.VENUE)).thenReturn(image);

        VenueSearchResultResponse search = mapper.venueSearchResult(venue);
        VenueMatchResponse match = mapper.venueMatch(venue, "1/1 genres matched");
        JsonNode searchJson = objectMapper.valueToTree(search);
        JsonNode matchJson = objectMapper.valueToTree(match);

        for (JsonNode json : List.of(searchJson, matchJson)) {
            assertFalse(json.has("email"));
            assertFalse(json.has("bookingEmail"));
            assertFalse(json.has("typicalBudget"));
            assertFalse(json.has("liveMusic"));
            assertFalse(json.path("profileImage").has("objectKey"));
        }
        assertEquals("1/1 genres matched", match.matchScore());
        assertEquals("123 Bedford Ave", match.location().addressLine1());
    }
}
