package com.mint.dto.response;

import com.mint.authsession.AuthIdentity;

public record NativeSessionResponse(String accessToken, String tokenType, long expiresIn, String sessionId,
        String userId, String userType, String email, String name, String refreshToken) {
    public NativeSessionResponse(SessionAccessResponse token, AuthIdentity identity, String refreshToken) {
        this(token.accessToken(), token.tokenType(), token.expiresIn(), token.sessionId(), identity.userId(),
                identity.persona().name(), identity.email(), identity.name(), refreshToken);
    }
    @Override public String toString() { return "NativeSessionResponse[redacted]"; }
}
