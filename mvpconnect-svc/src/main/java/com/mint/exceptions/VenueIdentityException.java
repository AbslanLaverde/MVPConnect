package com.mint.exceptions;

import org.springframework.http.HttpStatus;

public class VenueIdentityException extends RuntimeException {

    public static final String GOOGLE_PLACES_UNAVAILABLE = "GOOGLE_PLACES_UNAVAILABLE";
    public static final String GOOGLE_VENUE_NOT_FOUND = "GOOGLE_VENUE_NOT_FOUND";
    public static final String VENUE_IDENTITY_INVALID = "VENUE_IDENTITY_INVALID";

    private final String code;
    private final HttpStatus status;

    private VenueIdentityException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public static VenueIdentityException googleUnavailable() {
        return new VenueIdentityException(
                GOOGLE_PLACES_UNAVAILABLE,
                HttpStatus.SERVICE_UNAVAILABLE,
                "Google venue search is temporarily unavailable."
        );
    }

    public static VenueIdentityException googleVenueNotFound() {
        return new VenueIdentityException(
                GOOGLE_VENUE_NOT_FOUND,
                HttpStatus.NOT_FOUND,
                "The requested Google venue could not be found."
        );
    }

    public static VenueIdentityException invalid(String message) {
        return new VenueIdentityException(VENUE_IDENTITY_INVALID, HttpStatus.BAD_REQUEST, message);
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
