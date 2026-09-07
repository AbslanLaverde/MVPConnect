package com.mint.security;

import com.mint.controllers.MusicianController;
import com.mint.controllers.ExternalArtistController;
import com.mint.controllers.MediaController;
import com.mint.controllers.LocationController;
import com.mint.controllers.OnboardingMediaController;
import com.mint.controllers.OnboardingController;
import com.mint.controllers.PromoterController;
import com.mint.controllers.SelfAccountController;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.VenueRepository;
import com.mint.services.MediaService;
import com.mint.services.ExternalArtistService;
import com.mint.services.GooglePlacesService;
import com.mint.services.DiscoveryProfileMapper;
import com.mint.services.OnboardingMediaService;
import com.mint.services.OnboardingService;
import com.mint.services.PublicProfileService;
import com.mint.services.SelfAccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
        OnboardingController.class,
        OnboardingMediaController.class,
        MediaController.class,
        LocationController.class,
        MusicianController.class,
        PromoterController.class,
        SelfAccountController.class,
        ExternalArtistController.class
})
@ContextConfiguration(classes = {
        SecurityConfig.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        OnboardingController.class,
        OnboardingMediaController.class,
        MediaController.class,
        LocationController.class,
        MusicianController.class,
        PromoterController.class,
        SelfAccountController.class,
        ExternalArtistController.class
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OnboardingService onboardingService;

    @MockitoBean
    private OnboardingMediaService onboardingMediaService;

    @MockitoBean
    private MediaService mediaService;

    @MockitoBean
    private GooglePlacesService googlePlacesService;

    @MockitoBean
    private PublicProfileService publicProfileService;

    @MockitoBean
    private SelfAccountService selfAccountService;

    @MockitoBean
    private ExternalArtistService externalArtistService;

    @MockitoBean
    private DiscoveryProfileMapper discoveryProfileMapper;

    @MockitoBean
    private PersonaAuthorizationService personaAuthorizationService;

    @MockitoBean
    private MusicianRepository musicianRepository;

    @MockitoBean
    private VenueRepository venueRepository;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    void unauthenticatedOnboardingRequestIsRejected() throws Exception {
        mockMvc.perform(get("/onboarding"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/onboarding/complete"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicMusicianProfileReadRemainsAvailable() throws Exception {
        when(publicProfileService.findMusician("missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/musicians/missing"))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicPromoterProfileReadIsAvailable() throws Exception {
        when(publicProfileService.findPromoter("missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/promoters/missing"))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticatedMusicianUpdateIsRejected() throws Exception {
        mockMvc.perform(put("/musicians/musician-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedSelfAccountRequestIsRejected() throws Exception {
        mockMvc.perform(get("/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedSkipAndReopenRequestsAreRejected() throws Exception {
        mockMvc.perform(post("/onboarding/steps/media/skip"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/onboarding/steps/media/reopen"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedMediaRequestsAreRejected() throws Exception {
        mockMvc.perform(post("/media/uploads")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/media/media-1/complete"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/media/media-1"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/media/media-1"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/onboarding/steps/basics/media/media-1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedLocationLookupIsRejected() throws Exception {
        mockMvc.perform(get("/locations/suggestions")
                        .param("query", "Brooklyn")
                        .param("mode", "CITY"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/locations/place").param("placeId", "place-1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedExternalArtistEndpointsAreRejected() throws Exception {
        mockMvc.perform(get("/external-artists/search").param("q", "Interpol"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/external-artists/search/spotify").param("q", "Interpol"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/external-artists/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"provider\":\"SPOTIFY\",\"providerArtistId\":\"id\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/external-artists/free-form")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Local Band\",\"spotifyAttemptStatus\":\"NO_MATCH\"}"))
                .andExpect(status().isUnauthorized());
    }
}
