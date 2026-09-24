package com.mint.authsession;

import com.mint.nodes.AuthSession;

/** Failed rotation is a value, so reuse revocation commits before any transport raises an error. */
public record SessionResult(AuthSession session, RefreshSecret refreshCredential, AuthFailure failure) {
    public static SessionResult success(AuthSession session, RefreshSecret secret) {
        return new SessionResult(session, secret, null);
    }

    public static SessionResult failed(AuthFailure failure) {
        return new SessionResult(null, null, failure);
    }

    public boolean succeeded() { return failure == null; }

    @Override
    public String toString() { return "SessionResult[status=" + (succeeded() ? "SUCCESS" : failure) + "]"; }
}
