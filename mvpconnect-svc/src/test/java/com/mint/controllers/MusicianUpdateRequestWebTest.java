package com.mint.controllers;

import com.mint.config.GlobalExceptionHandler;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.PersonaAuthorizationService;
import com.mint.services.DiscoveryProfileMapper;
import com.mint.services.PublicProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MusicianUpdateRequestWebTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MusicianController controller = new MusicianController(
                mock(MusicianRepository.class),
                mock(VenueRepository.class),
                mock(PublicProfileService.class),
                mock(PersonaAuthorizationService.class),
                mock(DiscoveryProfileMapper.class)
        );
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void wrongJsonTypesReturnBadRequest() throws Exception {
        mockMvc.perform(put("/musicians/musician-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bio\":42}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
    }

    @Test
    void unknownFieldsReturnBadRequest() throws Exception {
        mockMvc.perform(put("/musicians/musician-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"attacker@example.com\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
    }

    @Test
    void nonHttpWebsiteReturnsBadRequest() throws Exception {
        mockMvc.perform(put("/musicians/musician-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"websiteUrl\":\"ftp://example.com/profile\"}"))
                .andExpect(status().isBadRequest());
    }
}
