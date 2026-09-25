package com.mint.dto.response;

public record SessionAccessResponse(String accessToken, String tokenType, long expiresIn, String sessionId) {
    @Override public String toString() { return "SessionAccessResponse[redacted]"; }
}
