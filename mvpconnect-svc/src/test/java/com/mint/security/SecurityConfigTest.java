package com.mint.security;

import com.mint.controllers.MusicianController;
import com.mint.controllers.OnboardingController;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.VenueRepository;
import com.mint.services.OnboardingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {OnboardingController.class, MusicianController.class})
@ContextConfiguration(classes = {
        SecurityConfig.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        OnboardingController.class,
        MusicianController.class
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OnboardingService onboardingService;

    @MockBean
    private MusicianRepository musicianRepository;

    @MockBean
    private VenueRepository venueRepository;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    void unauthenticatedOnboardingRequestIsRejected() throws Exception {
        mockMvc.perform(get("/onboarding"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicMusicianProfileReadRemainsAvailable() throws Exception {
        when(musicianRepository.findById("missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/musicians/missing"))
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
    void unauthenticatedSkipAndReopenRequestsAreRejected() throws Exception {
        mockMvc.perform(post("/onboarding/steps/media/skip"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/onboarding/steps/media/reopen"))
                .andExpect(status().isUnauthorized());
    }
}
