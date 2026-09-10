package com.mint.exceptions;

import org.springframework.http.HttpStatus;

public class ExternalConnectionException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    private ExternalConnectionException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public static ExternalConnectionException invalidProvider() {
        return badRequest("INVALID_EXTERNAL_PROVIDER", "That provider is not available for this account type.");
    }

    public static ExternalConnectionException invalidUrl() {
        return badRequest("INVALID_PROVIDER_URL", "Enter a valid profile on the selected provider.");
    }

    public static ExternalConnectionException notFound() {
        return new ExternalConnectionException(
                "EXTERNAL_CONNECTION_NOT_FOUND", HttpStatus.NOT_FOUND, "External connection was not found.");
    }

    public static ExternalConnectionException providerUnavailable(String provider) {
        return new ExternalConnectionException(
                provider + "_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE,
                provider + " connection is temporarily unavailable.");
    }

    public static ExternalConnectionException encryptionUnavailable() {
        return new ExternalConnectionException(
                "OAUTH_ENCRYPTION_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE,
                "Secure provider credential storage is not configured.");
    }

    public static ExternalConnectionException encryptionFailed() {
        return new ExternalConnectionException(
                "OAUTH_CREDENTIAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR,
                "Provider credentials could not be processed securely.");
    }

    public static ExternalConnectionException oauthStateInvalid() {
        return badRequest("OAUTH_STATE_INVALID", "The provider connection attempt is invalid or has already been used.");
    }

    public static ExternalConnectionException oauthStateExpired() {
        return badRequest("OAUTH_STATE_EXPIRED", "The provider connection attempt has expired.");
    }

    public static ExternalConnectionException invalidReturnTarget() {
        return badRequest("OAUTH_RETURN_TARGET_INVALID", "The requested OAuth return destination is not allowed.");
    }

    public static ExternalConnectionException providerConnectionFailed() {
        return new ExternalConnectionException(
                "PROVIDER_CONNECTION_FAILED", HttpStatus.BAD_GATEWAY,
                "The provider connection could not be completed.");
    }

    public static ExternalConnectionException badRequest(String code, String message) {
        return new ExternalConnectionException(code, HttpStatus.BAD_REQUEST, message);
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
