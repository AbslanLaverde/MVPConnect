package com.mint.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * Signup Request DTO for Venues
 * Matches the lean POC Venue node structure
 */
@Data
public class VenueSignupRequest {

    @NotBlank(message = "Venue name is required")
    private String venueName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String description;
    private String location;
    private String logoUrl;

    // Venue characteristics (tags for AI matching)
    private Integer capacity;
    private List<String> genrePreferences;
    private List<String> ambience;

    // Booking basics
    private String typicalBudget;
    private Boolean liveMusic;

    // Contact info
    private String websiteUrl;
    private String bookingEmail;
}

