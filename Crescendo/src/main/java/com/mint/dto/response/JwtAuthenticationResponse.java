package com.mint.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * JWT Authentication Response DTO
 * Returned after successful signup or login
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JwtAuthenticationResponse {

    private String accessToken;
    private String tokenType;
    private String userId;
    private String email;
    private String userType;  // MUSICIAN, PROMOTER, or VENUE
    private String name;      // Display name (varies by user type)
}

