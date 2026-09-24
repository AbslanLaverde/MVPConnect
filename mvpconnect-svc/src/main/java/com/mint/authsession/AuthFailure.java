package com.mint.authsession;

/** Internal only: transports must map these to generic public authentication failures. */
public enum AuthFailure {
    INVALID_CREDENTIAL, SESSION_REVOKED, SESSION_EXPIRED, REFRESH_REUSED,
    TOKEN_INVALID, TOKEN_EXPIRED, INVALID_OWNER, INVALID_SESSION_STATE
}
