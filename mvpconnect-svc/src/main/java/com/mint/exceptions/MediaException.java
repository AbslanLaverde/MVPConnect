package com.mint.exceptions;

import org.springframework.http.HttpStatus;

public class MediaException extends RuntimeException {

    public static final String INVALID_MEDIA_TYPE = "INVALID_MEDIA_TYPE";
    public static final String INVALID_MEDIA_CONTEXT = "INVALID_MEDIA_CONTEXT";
    public static final String INVALID_MEDIA_FILE = "INVALID_MEDIA_FILE";
    public static final String MEDIA_TOO_LARGE = "MEDIA_TOO_LARGE";
    public static final String MEDIA_NOT_FOUND = "MEDIA_NOT_FOUND";
    public static final String MEDIA_NOT_OWNED = "MEDIA_NOT_OWNED";
    public static final String MEDIA_UPLOAD_NOT_FOUND = "MEDIA_UPLOAD_NOT_FOUND";
    public static final String MEDIA_UPLOAD_MISMATCH = "MEDIA_UPLOAD_MISMATCH";
    public static final String MEDIA_NOT_READY = "MEDIA_NOT_READY";
    public static final String MEDIA_STORAGE_ERROR = "MEDIA_STORAGE_ERROR";

    private final String code;
    private final HttpStatus status;

    private MediaException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public static MediaException invalidMediaType() {
        return new MediaException(
                INVALID_MEDIA_TYPE,
                HttpStatus.BAD_REQUEST,
                "Media type must be PROFILE_IMAGE, BANNER_IMAGE, or GALLERY_IMAGE."
        );
    }

    public static MediaException invalidMediaContext() {
        return new MediaException(
                INVALID_MEDIA_CONTEXT,
                HttpStatus.BAD_REQUEST,
                "Media context must be PROFILE, PERFORMANCE, VENUE, or EVENT."
        );
    }

    public static MediaException invalidImageMimeType() {
        return new MediaException(
                INVALID_MEDIA_TYPE,
                HttpStatus.BAD_REQUEST,
                "Only JPEG, PNG, and WebP images are supported."
        );
    }

    public static MediaException invalidFileName() {
        return new MediaException(
                INVALID_MEDIA_FILE,
                HttpStatus.BAD_REQUEST,
                "A valid original file name is required."
        );
    }

    public static MediaException invalidFileSize() {
        return new MediaException(
                INVALID_MEDIA_FILE,
                HttpStatus.BAD_REQUEST,
                "Image size must be greater than zero bytes."
        );
    }

    public static MediaException tooLarge(long maximumBytes) {
        return new MediaException(
                MEDIA_TOO_LARGE,
                HttpStatus.PAYLOAD_TOO_LARGE,
                "Image size must not exceed " + maximumBytes + " bytes."
        );
    }

    public static MediaException notFound() {
        return new MediaException(MEDIA_NOT_FOUND, HttpStatus.NOT_FOUND, "Media asset was not found.");
    }

    public static MediaException notOwned() {
        return new MediaException(
                MEDIA_NOT_OWNED,
                HttpStatus.FORBIDDEN,
                "The authenticated account does not own this media asset."
        );
    }

    public static MediaException uploadNotFound() {
        return new MediaException(
                MEDIA_UPLOAD_NOT_FOUND,
                HttpStatus.CONFLICT,
                "The uploaded object could not be found in media storage."
        );
    }

    public static MediaException uploadMismatch() {
        return new MediaException(
                MEDIA_UPLOAD_MISMATCH,
                HttpStatus.CONFLICT,
                "The uploaded object does not match the initialized image metadata."
        );
    }

    public static MediaException notReady() {
        return new MediaException(
                MEDIA_NOT_READY,
                HttpStatus.CONFLICT,
                "Media asset is not ready for use."
        );
    }

    public static MediaException wrongType(String expectedType) {
        return new MediaException(
                INVALID_MEDIA_TYPE,
                HttpStatus.CONFLICT,
                "Media asset must have type " + expectedType + "."
        );
    }

    public static MediaException storageError() {
        return new MediaException(
                MEDIA_STORAGE_ERROR,
                HttpStatus.BAD_GATEWAY,
                "Media storage is temporarily unavailable."
        );
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
