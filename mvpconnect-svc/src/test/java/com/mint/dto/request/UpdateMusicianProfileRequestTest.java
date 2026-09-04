package com.mint.dto.request;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UpdateMusicianProfileRequestTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void distinguishesOmittedFieldsFromExplicitNull() throws Exception {
        UpdateMusicianProfileRequest request = objectMapper.readValue(
                "{\"bio\":null}",
                UpdateMusicianProfileRequest.class
        );

        assertTrue(request.hasBio());
        assertNull(request.getBio());
        assertFalse(request.hasLocation());
        assertFalse(request.hasGenres());
    }

    @Test
    void rejectsUnknownFieldsAndWrongJsonTypes() {
        assertThrows(JsonMappingException.class, () -> objectMapper.readValue(
                "{\"email\":\"not-editable@example.com\"}",
                UpdateMusicianProfileRequest.class
        ));
        assertThrows(JsonMappingException.class, () -> objectMapper.readValue(
                "{\"bio\":123}",
                UpdateMusicianProfileRequest.class
        ));
        assertThrows(JsonMappingException.class, () -> objectMapper.readValue(
                "{\"genres\":[\"INDIE\",4]}",
                UpdateMusicianProfileRequest.class
        ));
        assertThrows(JsonMappingException.class, () -> objectMapper.readValue(
                "{\"willingToTravel\":\"true\"}",
                UpdateMusicianProfileRequest.class
        ));
    }

    @Test
    void acceptsOnlyHttpOrHttpsWebsiteUrlsWhenPopulated() throws Exception {
        UpdateMusicianProfileRequest invalid = objectMapper.readValue(
                "{\"websiteUrl\":\"ftp://example.com/profile\"}",
                UpdateMusicianProfileRequest.class
        );
        UpdateMusicianProfileRequest valid = objectMapper.readValue(
                "{\"websiteUrl\":\"https://example.com/profile\"}",
                UpdateMusicianProfileRequest.class
        );
        UpdateMusicianProfileRequest cleared = objectMapper.readValue(
                "{\"websiteUrl\":null}",
                UpdateMusicianProfileRequest.class
        );

        assertFalse(validator.validate(invalid).isEmpty());
        assertTrue(validator.validate(valid).isEmpty());
        assertTrue(validator.validate(cleared).isEmpty());
    }
}
