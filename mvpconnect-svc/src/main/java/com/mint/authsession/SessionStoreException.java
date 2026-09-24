package com.mint.authsession;

/** Storage failures must not carry driver messages/parameters into API errors or stack logs. */
public final class SessionStoreException extends RuntimeException {
    public SessionStoreException() { super("Authentication service unavailable"); }
}
