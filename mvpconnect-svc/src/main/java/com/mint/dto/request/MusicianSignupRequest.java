package com.mint.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * Signup Request DTO for Musicians
 * Matches the lean POC Musician node structure
 */
@Data
public class MusicianSignupRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String bio;
    private String location;
    private String profileImageUrl;

    // Tags for AI matching
    private List<String> genres;
    private List<String> vibes;

    // Booking basics
    private String minimumFee;
    private Boolean willingToTravel;

    // Social proof
    private String websiteUrl;
    private String instagramHandle;
}

