package com.mint.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.databind.JsonNode;
import com.mint.authsession.http.AuthHttpException;

/** Tracks field presence, including explicit null, so Web bodies cannot smuggle a credential. */
public final class RefreshTokenRequest {
    private String credential;
    private boolean supplied;

    @JsonSetter("refreshToken")
    public void refreshToken(JsonNode value) {
        if (supplied || (value != null && !value.isNull() && !value.isTextual())) invalid();
        supplied = true;
        credential = value == null || value.isNull() ? null : value.textValue();
    }

    @JsonAnySetter public void unsupported(String name, Object value) { invalid(); }
    public boolean supplied() { return supplied; }
    public String credential() { return credential; }
    private void invalid() { throw new AuthHttpException(AuthHttpException.Code.AUTH_REQUEST_INVALID); }
    @Override public String toString() { return "RefreshTokenRequest[redacted]"; }
}
