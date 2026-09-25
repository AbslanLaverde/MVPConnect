package com.mint.authsession;

import com.mint.nodes.AuthSession;
import java.time.Instant;

public final class SessionValidity {
    private SessionValidity() { }

    public static AuthFailure failure(AuthSession session, Instant now) {
        if (session.revokedAt() != null) return AuthFailure.SESSION_REVOKED;
        if (!now.isBefore(session.inactivityExpiresAt()) || !now.isBefore(session.absoluteExpiresAt())) {
            return AuthFailure.SESSION_EXPIRED;
        }
        return null;
    }

    public static Instant earlier(Instant first, Instant second) {
        return first.isBefore(second) ? first : second;
    }
}
