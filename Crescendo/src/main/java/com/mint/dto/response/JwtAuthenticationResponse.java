package com.mint.dto.response;

/**
 * JWT Authentication Response
 * Returned after successful login or signup
 */
public class JwtAuthenticationResponse {

    private String accessToken;
    private String tokenType = "Bearer";
    private String userId;
    private String email;
    private String userType; // "MUSICIAN", "PROMOTER", or "VENUE"
    private String name; // Display name varies by user type

    public JwtAuthenticationResponse(String accessToken, String userId, String email, String userType, String name) {
        this.accessToken = accessToken;
        this.userId = userId;
        this.email = email;
        this.userType = userType;
        this.name = name;
    }

    // Getters and Setters
    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUserType() {
        return userType;
    }

    public void setUserType(String userType) {
        this.userType = userType;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}

