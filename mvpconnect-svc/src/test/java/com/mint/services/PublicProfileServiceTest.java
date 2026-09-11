package com.mint.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mint.dto.response.profile.PublicMusicianProfileResponse;
import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.dto.response.profile.PublicPromoterProfileResponse;
import com.mint.dto.response.profile.PublicVenueProfileResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.taxonomy.SoundcheckAvailability;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicProfileServiceTest {

    @Mock
    private MusicianRepository musicianRepository;

    @Mock
    private VenueRepository venueRepository;

    @Mock
    private PromoterRepository promoterRepository;

    @Mock
    private PublicProfileMediaService mediaService;
    @Mock private ExternalConnectionService externalConnectionService;
    @Mock private ArtistIdentityService artistIdentityService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PublicProfileMediaResponse profileImage = new PublicProfileMediaResponse(
            "media-1", "https://storage.example/read", "image/jpeg", 600, 300
    );
    private PublicProfileService publicProfileService;

    @BeforeEach
    void setUp() {
        publicProfileService = new PublicProfileService(
                musicianRepository,
                venueRepository,
                promoterRepository,
                mediaService,
                new ProfileLocationMapper(),
                externalConnectionService,
                artistIdentityService
        );
    }

    @Test
    void musicianProfileUsesAPublicAllowlistAndHidesExactAddress() {
        Musician musician = new Musician();
        musician.setId("musician-1");
        musician.setName("Glass Houses");
        musician.setEmail("private@example.com");
        musician.setPassword("secret-hash");
        musician.setBio("Post-punk band");
        musician.setLocationDisplay("Brooklyn, NY");
        musician.setLocationAddressLine1("Secret apartment");
        musician.setLocationCity("Brooklyn");
        musician.setLocationState("NY");
        musician.setLocationCountry("US");
        musician.setGenres(List.of("INDIE"));
        musician.setEquipmentBrought(List.of("GUITAR_AMP:2", "MICROPHONES"));
        musician.setConnectionGoals(List.of("BOOK_SHOWS"));
        musician.setMinimumFee("$500");
        musician.setProfileImageUrl("https://legacy.example/image.jpg");
        when(musicianRepository.findById("musician-1")).thenReturn(Optional.of(musician));
        when(mediaService.findCanonicalMedia("musician-1", PersonaType.MUSICIAN))
                .thenReturn(new PublicProfileMediaService.CanonicalMediaBundle(
                        profileImage, null, List.of()));

        PublicMusicianProfileResponse response = publicProfileService
                .findMusician("musician-1")
                .orElseThrow();
        JsonNode json = objectMapper.valueToTree(response);

        assertEquals("Glass Houses", json.get("name").asText());
        assertEquals("Brooklyn, NY", json.path("location").path("displayName").asText());
        assertEquals("media-1", json.path("profileImage").path("mediaId").asText());
        assertEquals("GUITAR_AMP", json.path("equipmentBrought").get(0).path("code").asText());
        assertEquals(2, json.path("equipmentBrought").get(0).path("quantity").asInt());
        assertEquals("MICROPHONES", json.path("equipmentBrought").get(1).path("code").asText());
        assertTrue(json.path("equipmentBrought").get(1).path("quantity").isNull());
        assertFalse(json.has("email"));
        assertFalse(json.has("password"));
        assertFalse(json.has("minimumFee"));
        assertFalse(json.has("profileImageUrl"));
        assertFalse(json.has("onboardingStatus"));
        assertFalse(json.has("connectionGoals"));
        assertFalse(json.path("location").has("addressLine1"));
        assertFalse(json.path("profileImage").has("objectKey"));
        verify(mediaService).findCanonicalMedia("musician-1", PersonaType.MUSICIAN);
    }

    @Test
    void venueProfileExposesPublicAddressButNotAccountOrBookingEmail() {
        Venue venue = new Venue();
        venue.setId("venue-1");
        venue.setVenueName("The Marlowe Room");
        venue.setEmail("account@example.com");
        venue.setPassword("secret-hash");
        venue.setBookingEmail("booking@example.com");
        venue.setLocationDisplay("123 Bedford Ave, Brooklyn, NY");
        venue.setLocationAddressLine1("123 Bedford Ave");
        venue.setLocationCity("Brooklyn");
        venue.setLocationState("NY");
        venue.setSoundcheckAvailability(SoundcheckAvailability.FULL_SOUNDCHECK);
        venue.setEquipmentAvailable(List.of("STAGE_MONITORS:4", "DRUM_KIT"));
        venue.setConnectionGoals(List.of("FILL_OPEN_DATES"));
        venue.setTypicalBudget("$1,000");
        venue.setLogoUrl("https://legacy.example/logo.jpg");
        when(venueRepository.findById("venue-1")).thenReturn(Optional.of(venue));
        when(mediaService.findCanonicalMedia("venue-1", PersonaType.VENUE))
                .thenReturn(new PublicProfileMediaService.CanonicalMediaBundle(
                        profileImage, null, List.of()));

        PublicVenueProfileResponse response = publicProfileService.findVenue("venue-1").orElseThrow();
        JsonNode json = objectMapper.valueToTree(response);

        assertEquals("123 Bedford Ave", json.path("location").path("addressLine1").asText());
        assertEquals("FULL_SOUNDCHECK", json.path("soundcheckAvailability").asText());
        assertEquals("STAGE_MONITORS", json.path("equipmentAvailable").get(0).path("code").asText());
        assertEquals(4, json.path("equipmentAvailable").get(0).path("quantity").asInt());
        assertTrue(json.path("equipmentAvailable").get(1).path("quantity").isNull());
        assertFalse(json.has("email"));
        assertFalse(json.has("password"));
        assertFalse(json.has("bookingEmail"));
        assertFalse(json.has("typicalBudget"));
        assertFalse(json.has("logoUrl"));
        assertFalse(json.has("onboardingVersion"));
        assertFalse(json.has("connectionGoals"));
        assertFalse(json.path("profileImage").has("objectKey"));
    }

    @Test
    void promoterProfileEndpointModelKeepsPhoneAndAccountDataPrivate() {
        Promoter promoter = new Promoter();
        promoter.setId("promoter-1");
        promoter.setBusinessName("Night Signal Presents");
        promoter.setEmail("private@example.com");
        promoter.setPassword("secret-hash");
        promoter.setPhone("212-555-0100");
        promoter.setBio("Independent promoter");
        promoter.setWebsiteUrl("https://example.com");
        promoter.setLocationDisplay("New York, NY");
        promoter.setLocationAddressLine1("Private office");
        promoter.setLocationCity("New York");
        promoter.setLocationState("NY");
        promoter.setGenreSpecialties(List.of("INDIE"));
        promoter.setCurrentRosterSize(77);
        promoter.setConnectionGoals(List.of("FIND_ARTISTS"));
        promoter.setLogoUrl("https://legacy.example/logo.jpg");
        when(promoterRepository.findById("promoter-1")).thenReturn(Optional.of(promoter));
        when(mediaService.findCanonicalMedia("promoter-1", PersonaType.PROMOTER))
                .thenReturn(new PublicProfileMediaService.CanonicalMediaBundle(
                        profileImage, null, List.of()));

        PublicPromoterProfileResponse response = publicProfileService
                .findPromoter("promoter-1")
                .orElseThrow();
        JsonNode json = objectMapper.valueToTree(response);

        assertEquals("Night Signal Presents", json.get("businessName").asText());
        assertEquals("New York, NY", json.path("location").path("displayName").asText());
        assertTrue(json.has("websiteUrl"));
        assertFalse(json.has("email"));
        assertFalse(json.has("phone"));
        assertFalse(json.has("password"));
        assertFalse(json.has("currentRosterSize"));
        assertFalse(json.has("logoUrl"));
        assertFalse(json.has("onboardingCompletedAt"));
        assertFalse(json.has("connectionGoals"));
        assertFalse(json.path("location").has("addressLine1"));
        assertFalse(json.path("profileImage").has("objectKey"));
    }
}
