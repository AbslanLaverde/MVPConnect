package com.mint.exceptions;

import org.springframework.http.HttpStatus;

public class ExternalArtistException extends RuntimeException {

    public static final String SPOTIFY_UNAVAILABLE = "SPOTIFY_UNAVAILABLE";
    public static final String SPOTIFY_ARTIST_NOT_FOUND = "SPOTIFY_ARTIST_NOT_FOUND";
    public static final String EXTERNAL_ARTIST_INVALID = "EXTERNAL_ARTIST_INVALID";

    private final String code;
    private final HttpStatus status;

    private ExternalArtistException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public static ExternalArtistException spotifyUnavailable() {
        return new ExternalArtistException(
                SPOTIFY_UNAVAILABLE,
                HttpStatus.SERVICE_UNAVAILABLE,
                "Spotify artist search is temporarily unavailable."
        );
    }

    public static ExternalArtistException spotifyArtistNotFound() {
        return new ExternalArtistException(
                SPOTIFY_ARTIST_NOT_FOUND,
                HttpStatus.NOT_FOUND,
                "The requested Spotify artist could not be found."
        );
    }

    public static ExternalArtistException invalid(String message) {
        return new ExternalArtistException(EXTERNAL_ARTIST_INVALID, HttpStatus.BAD_REQUEST, message);
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
