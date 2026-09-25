package com.mint.authsession.http;

import com.mint.dto.response.ErrorResponse;
import org.springframework.http.HttpStatus;

public final class AuthHttpException extends RuntimeException {
    public enum Code {
        INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Invalid email or password"),
        SESSION_INVALID(HttpStatus.UNAUTHORIZED, "Your session is invalid. Sign in again."),
        AUTH_TRANSPORT_INVALID(HttpStatus.FORBIDDEN, "Unsupported authentication transport"),
        AUTH_ORIGIN_FORBIDDEN(HttpStatus.FORBIDDEN, "Authentication origin is not permitted"),
        AUTH_REQUEST_INVALID(HttpStatus.BAD_REQUEST, "Invalid authentication request"),
        AUTH_SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "Authentication service unavailable");

        private final HttpStatus status;
        private final String message;
        Code(HttpStatus status, String message) { this.status = status; this.message = message; }
    }

    private final Code code;
    public AuthHttpException(Code code) { super(code.message); this.code = code; }
    public Code code() { return code; }
    public HttpStatus status() { return code.status; }
    public ErrorResponse response(String path) {
        return new ErrorResponse(status().value(), status().getReasonPhrase(), code.name(), code.message, path);
    }
}
