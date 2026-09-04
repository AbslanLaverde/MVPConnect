package com.mint.exceptions;

import org.springframework.http.HttpStatus;

public class LocationLookupException extends RuntimeException {

    public static final String UNAVAILABLE = "LOCATION_LOOKUP_UNAVAILABLE";

    private final HttpStatus status;
    private final String code;

    private LocationLookupException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static LocationLookupException unavailable() {
        return new LocationLookupException(
                HttpStatus.SERVICE_UNAVAILABLE,
                UNAVAILABLE,
                "Location suggestions are temporarily unavailable."
        );
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
