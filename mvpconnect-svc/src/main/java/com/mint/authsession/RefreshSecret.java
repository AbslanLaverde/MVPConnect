package com.mint.authsession;

/** Deliberately not a DTO/record: transports must explicitly reveal the secret to deliver it. */
public final class RefreshSecret {
    private final String value;

    RefreshSecret(String value) { this.value = value; }

    public String reveal() { return value; }

    @Override
    public String toString() { return "RefreshSecret[redacted]"; }
}
