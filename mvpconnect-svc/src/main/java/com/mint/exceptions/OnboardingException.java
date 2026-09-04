package com.mint.exceptions;

import com.mint.dto.response.OnboardingCompletionStepError;
import com.mint.dto.response.OnboardingCompletionValidationDetails;
import com.mint.dto.response.OnboardingFieldError;
import com.mint.dto.response.OnboardingStepValidationDetails;
import com.mint.onboarding.PersonaType;
import org.springframework.http.HttpStatus;

import java.util.List;

public class OnboardingException extends RuntimeException {

    public static final String INVALID_STEP = "INVALID_ONBOARDING_STEP";
    public static final String NOT_AVAILABLE = "ONBOARDING_NOT_AVAILABLE";
    public static final String PAYLOAD_TOO_LARGE = "ONBOARDING_STEP_PAYLOAD_TOO_LARGE";
    public static final String DRAFT_NOT_FOUND = "ONBOARDING_DRAFT_NOT_FOUND";
    public static final String ALREADY_COMPLETE = "ONBOARDING_ALREADY_COMPLETE";
    public static final String INVALID_DATA = "INVALID_ONBOARDING_DATA";
    public static final String STEP_NOT_SKIPPABLE = "ONBOARDING_STEP_NOT_SKIPPABLE";
    public static final String STEP_INVALID = "ONBOARDING_STEP_INVALID";
    public static final String NOT_READY = "ONBOARDING_NOT_READY";

    private final String code;
    private final HttpStatus status;
    private final Object details;

    private OnboardingException(String code, HttpStatus status, String message) {
        this(code, status, message, null);
    }

    private OnboardingException(String code, HttpStatus status, String message, Object details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
    }

    public static OnboardingException invalidStep(String stepKey, PersonaType persona) {
        return new OnboardingException(
                INVALID_STEP,
                HttpStatus.BAD_REQUEST,
                "Step '" + stepKey + "' is not valid for " + persona + " onboarding."
        );
    }

    public static OnboardingException notAvailable(String message) {
        return new OnboardingException(NOT_AVAILABLE, HttpStatus.NOT_FOUND, message);
    }

    public static OnboardingException unauthenticated() {
        return new OnboardingException(
                NOT_AVAILABLE,
                HttpStatus.UNAUTHORIZED,
                "An authenticated MVPConnect account is required."
        );
    }

    public static OnboardingException payloadTooLarge(int limitBytes) {
        return new OnboardingException(
                PAYLOAD_TOO_LARGE,
                HttpStatus.PAYLOAD_TOO_LARGE,
                "Onboarding step data must not exceed " + limitBytes + " bytes."
        );
    }

    public static OnboardingException draftNotFound(String stepKey) {
        return new OnboardingException(
                DRAFT_NOT_FOUND,
                HttpStatus.CONFLICT,
                "The onboarding draft does not contain the configured step '" + stepKey + "'."
        );
    }

    public static OnboardingException alreadyComplete() {
        return new OnboardingException(
                ALREADY_COMPLETE,
                HttpStatus.CONFLICT,
                "Onboarding is already complete for this account."
        );
    }

    public static OnboardingException stepNotSkippable(String stepKey) {
        return new OnboardingException(
                STEP_NOT_SKIPPABLE,
                HttpStatus.CONFLICT,
                "Onboarding step '" + stepKey + "' is required and cannot be skipped."
        );
    }

    public static OnboardingException invalidData() {
        return new OnboardingException(
                INVALID_DATA,
                HttpStatus.BAD_REQUEST,
                "Onboarding step data is invalid."
        );
    }

    public static OnboardingException stepInvalid(
            String stepKey,
            List<OnboardingFieldError> fieldErrors) {
        return new OnboardingException(
                STEP_INVALID,
                HttpStatus.BAD_REQUEST,
                "Onboarding step contains invalid fields.",
                new OnboardingStepValidationDetails(stepKey, List.copyOf(fieldErrors))
        );
    }

    public static OnboardingException notReady(
            List<OnboardingCompletionStepError> stepErrors) {
        return new OnboardingException(
                NOT_READY,
                HttpStatus.CONFLICT,
                "Onboarding is not ready to complete.",
                new OnboardingCompletionValidationDetails(List.copyOf(stepErrors))
        );
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Object getDetails() {
        return details;
    }
}
