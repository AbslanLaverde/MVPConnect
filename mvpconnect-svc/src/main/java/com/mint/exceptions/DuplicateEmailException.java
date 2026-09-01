package com.mint.exceptions;

/**
 * Raised when an email is already assigned to any MVPConnect account type.
 */
public class DuplicateEmailException extends RuntimeException {

    public static final String CODE = "EMAIL_ALREADY_REGISTERED";

    public DuplicateEmailException() {
        super("This email is already registered.");
    }
}
