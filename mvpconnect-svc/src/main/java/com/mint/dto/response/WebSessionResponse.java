package com.mint.dto.response;

import com.mint.authsession.AuthIdentity;

/** Deliberately has no refreshToken property, including no nullable placeholder. */
public record WebSessionResponse(String accessToken, String tokenType, long expiresIn, String sessionId,
        String userId, String userType, String email, String name) {
    public WebSessionResponse(SessionAccessResponse token, AuthIdentity identity) {
        this(token.accessToken(), token.tokenType(), token.expiresIn(), token.sessionId(), identity.userId(),
                identity.persona().name(), identity.email(), identity.name());
    }
    @Override public String toString() { return "WebSessionResponse[redacted]"; }
}
