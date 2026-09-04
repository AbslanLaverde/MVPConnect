package com.mint.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mint.dto.response.account.MusicianSelfAccountResponse;
import com.mint.dto.response.account.PromoterSelfAccountResponse;
import com.mint.dto.response.account.SelfAccountResponse;
import com.mint.dto.response.account.VenueSelfAccountResponse;
import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.PersonaOnboardingStatus;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SelfAccountServiceTest {

    @Mock private AuthenticatedPersonaProvider personaProvider;
    @Mock private MusicianRepository musicianRepository;
    @Mock private VenueRepository venueRepository;
    @Mock private PromoterRepository promoterRepository;
    @Mock private PublicProfileMediaService mediaService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final PublicProfileMediaResponse image = new PublicProfileMediaResponse(
            "media-1", "https://storage.example/read", "image/jpeg", 600, 300
    );
    private SelfAccountService service;

    @BeforeEach
    void setUp() {
        service = new SelfAccountService(
                personaProvider,
                musicianRepository,
                venueRepository,
                promoterRepository,
                mediaService,
                new ProfileLocationMapper()
        );
    }

    @Test
    void musicianSelfAccountIncludesPrivateCanonicalDataButNoInternalsOrDrafts() {
        Musician musician = new Musician();
        musician.setId("musician-1");
        musician.setName("Glass Houses");
        musician.setEmail("artist@example.com");
        musician.setPassword("secret-hash");
        musician.setMinimumFee("$500");
        musician.setLocationDisplay("Brooklyn, NY");
        musician.setLocationAddressLine1("Private apartment");
        musician.setProfileImageUrl("https://legacy.example/image.jpg");
        musician.setOnboardingStatus(PersonaOnboardingStatus.COMPLETE);
        musician.setOnboardingCompletedAt(LocalDateTime.of(2026, 9, 4, 12, 0));
        musician.setOnboardingVersion(2);
        when(personaProvider.current()).thenReturn(new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN));
        when(musicianRepository.findById("musician-1")).thenReturn(Optional.of(musician));
        when(mediaService.findProfileImage("musician-1", PersonaType.MUSICIAN)).thenReturn(image);

        SelfAccountResponse response = service.getCurrentAccount();
        JsonNode json = objectMapper.valueToTree(response);

        assertInstanceOf(MusicianSelfAccountResponse.class, response);
        assertEquals("MUSICIAN", json.get("persona").asText());
        assertEquals("artist@example.com", json.get("email").asText());
        assertEquals("$500", json.get("minimumFee").asText());
        assertEquals("Private apartment", json.path("location").path("addressLine1").asText());
        assertEquals("media-1", json.path("profileImage").path("mediaId").asText());
        assertFalse(json.has("password"));
        assertFalse(json.has("profileImageUrl"));
        assertFalse(json.has("onboardingDrafts"));
        assertFalse(json.has("dataJson"));
        assertFalse(json.path("profileImage").has("objectKey"));
    }

    @Test
    void venueIdentityReturnsTypedVenueSelfContract() {
        Venue venue = new Venue();
        venue.setId("venue-1");
        venue.setVenueName("The Marlowe Room");
        venue.setEmail("venue@example.com");
        when(personaProvider.current()).thenReturn(new AuthenticatedPersona("venue-1", PersonaType.VENUE));
        when(venueRepository.findById("venue-1")).thenReturn(Optional.of(venue));

        SelfAccountResponse response = service.getCurrentAccount();

        assertInstanceOf(VenueSelfAccountResponse.class, response);
        assertEquals(PersonaType.VENUE, ((VenueSelfAccountResponse) response).persona());
        assertEquals("The Marlowe Room", ((VenueSelfAccountResponse) response).displayName());
    }

    @Test
    void promoterIdentityReturnsTypedPromoterSelfContract() {
        Promoter promoter = new Promoter();
        promoter.setId("promoter-1");
        promoter.setBusinessName("Night Signal Presents");
        promoter.setEmail("promoter@example.com");
        when(personaProvider.current()).thenReturn(new AuthenticatedPersona("promoter-1", PersonaType.PROMOTER));
        when(promoterRepository.findById("promoter-1")).thenReturn(Optional.of(promoter));

        SelfAccountResponse response = service.getCurrentAccount();

        assertInstanceOf(PromoterSelfAccountResponse.class, response);
        assertEquals(PersonaType.PROMOTER, ((PromoterSelfAccountResponse) response).persona());
        assertEquals("Night Signal Presents", ((PromoterSelfAccountResponse) response).displayName());
    }
}
