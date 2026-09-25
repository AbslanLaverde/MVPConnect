package com.mint.security;

import com.mint.authsession.AuthFailure;
import com.mint.authsession.SessionAuthException;
import com.mint.services.AuthSessionService;
import com.mint.dto.response.SessionAccessResponse;
import org.springframework.stereotype.Service;

@Service
public class SessionAccessTokenService {
    private final AuthSessionService sessions;
    private final SessionJwtTokenProvider tokens;
    private final CustomUserDetailsService principals;

    public SessionAccessTokenService(AuthSessionService sessions, SessionJwtTokenProvider tokens,
            CustomUserDetailsService principals) {
        this.sessions = sessions;
        this.tokens = tokens;
        this.principals = principals;
    }

    public String issueAccessToken(String sessionId) {
        return tokens.issue(sessions.requireActiveSession(sessionId));
    }

    public SessionAccessResponse issueAccessResponse(String sessionId) {
        String token = issueAccessToken(sessionId);
        var claims = tokens.parse(token);
        long expiresIn = java.time.Duration.between(claims.issuedAt(), claims.expiresAt()).getSeconds();
        return new SessionAccessResponse(token, "Bearer", expiresIn, sessionId);
    }

    public CustomUserDetails authenticate(SessionJwtTokenProvider.AccessClaims claims) {
        var session = sessions.requireActiveSession(claims.sessionId());
        if (!session.ownerId().equals(claims.ownerId()) || session.ownerPersona() != claims.persona()
                || claims.expiresAt().isAfter(session.inactivityExpiresAt())
                || claims.expiresAt().isAfter(session.absoluteExpiresAt())) {
            throw new SessionAuthException(AuthFailure.TOKEN_INVALID);
        }
        return principals.loadByOwnerId(claims.ownerId(), claims.persona());
    }
}
