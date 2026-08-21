package com.mint.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * Signup Request DTO for Promoters
 * Matches the lean POC Promoter node structure
 */
@Data
public class PromoterSignupRequest {

    @NotBlank(message = "Business name is required")
    private String businessName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String bio;
    private String location;
    private String logoUrl;

    // Expertise (tags for AI matching)
    private List<String> genreSpecialties;
    private List<String> eventTypes;

    // Business basics
    private Boolean acceptingNewArtists;
    private Integer currentRosterSize;

    // Contact info
    private String websiteUrl;
    private String phone;
}

