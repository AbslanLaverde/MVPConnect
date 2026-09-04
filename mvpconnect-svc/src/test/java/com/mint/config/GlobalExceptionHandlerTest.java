package com.mint.config;

import com.mint.dto.response.ErrorResponse;
import com.mint.dto.response.OnboardingCompletionStepError;
import com.mint.dto.response.OnboardingCompletionValidationDetails;
import com.mint.dto.response.OnboardingFieldError;
import com.mint.exceptions.DuplicateEmailException;
import com.mint.exceptions.MediaException;
import com.mint.exceptions.OnboardingException;
import com.mint.onboarding.PersonaType;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    @Test
    void accessDeniedResponseDoesNotRevealTargetExistence() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/musicians/another-user");

        ResponseEntity<ErrorResponse> response = new GlobalExceptionHandler()
                .handleAccessDeniedException(new AccessDeniedException("sensitive detail"), request);

        assertEquals(403, response.getStatusCode().value());
        assertEquals("ACCESS_DENIED", response.getBody().getCode());
        assertEquals(
                "The authenticated account is not allowed to perform this operation.",
                response.getBody().getMessage()
        );
    }

    @Test
    void duplicateEmailResponseIncludesMachineReadableCode() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/auth/signup/venue");

        ResponseEntity<ErrorResponse> response = new GlobalExceptionHandler()
                .handleDuplicateEmailException(new DuplicateEmailException(), request);

        assertEquals(400, response.getStatusCode().value());
        assertEquals(DuplicateEmailException.CODE, response.getBody().getCode());
        assertEquals("This email is already registered.", response.getBody().getMessage());
    }

    @Test
    void onboardingResponseIncludesMachineReadableCodeAndStatus() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/onboarding/steps/booking");

        ResponseEntity<ErrorResponse> response = new GlobalExceptionHandler()
                .handleOnboardingException(
                        OnboardingException.invalidStep("booking", PersonaType.MUSICIAN),
                        request
                );

        assertEquals(400, response.getStatusCode().value());
        assertEquals(OnboardingException.INVALID_STEP, response.getBody().getCode());
    }

    @Test
    void onboardingCompletionResponseIncludesStructuredStepErrors() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/onboarding/complete");
        OnboardingFieldError fieldError = new OnboardingFieldError("genres", "REQUIRED");

        ResponseEntity<ErrorResponse> response = new GlobalExceptionHandler()
                .handleOnboardingException(
                        OnboardingException.notReady(List.of(
                                new OnboardingCompletionStepError("sound", List.of(fieldError)))),
                        request
                );

        assertEquals(409, response.getStatusCode().value());
        assertEquals(OnboardingException.NOT_READY, response.getBody().getCode());
        assertEquals("Onboarding is not ready to complete.", response.getBody().getMessage());
        OnboardingCompletionValidationDetails details = assertInstanceOf(
                OnboardingCompletionValidationDetails.class,
                response.getBody().getDetails()
        );
        assertEquals("sound", details.steps().getFirst().key());
        assertEquals(fieldError, details.steps().getFirst().errors().getFirst());
    }

    @Test
    void mediaStorageResponseUsesTheSafeMediaErrorContract() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/media/uploads");

        ResponseEntity<ErrorResponse> response = new GlobalExceptionHandler()
                .handleMediaException(MediaException.storageError(), request);

        assertEquals(502, response.getStatusCode().value());
        assertEquals(MediaException.MEDIA_STORAGE_ERROR, response.getBody().getCode());
        assertEquals("Media storage is temporarily unavailable.", response.getBody().getMessage());
        assertEquals("/media/uploads", response.getBody().getPath());
    }
}
