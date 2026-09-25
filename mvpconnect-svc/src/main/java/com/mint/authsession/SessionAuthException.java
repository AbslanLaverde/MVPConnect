package com.mint.authsession;

import org.springframework.security.core.AuthenticationException;

/** No parser text, credential, database detail, or nested secret-bearing cause. */
public final class SessionAuthException extends AuthenticationException {
    private final AuthFailure failure;

    public SessionAuthException(AuthFailure failure) {
        super("Authentication failed");
        this.failure = failure;
    }

    public AuthFailure failure() { return failure; }
}
