package com.mint.dto.response;

public record NativeRefreshResponse(String accessToken, String tokenType, long expiresIn, String sessionId,
        String refreshToken) {
    public NativeRefreshResponse(SessionAccessResponse token, String refreshToken) {
        this(token.accessToken(), token.tokenType(), token.expiresIn(), token.sessionId(), refreshToken);
    }
    @Override public String toString() { return "NativeRefreshResponse[redacted]"; }
}
