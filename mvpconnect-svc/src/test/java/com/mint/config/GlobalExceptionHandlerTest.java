package com.mint.config;

import com.mint.dto.response.ErrorResponse;
import com.mint.exceptions.DuplicateEmailException;
import com.mint.exceptions.OnboardingException;
import com.mint.onboarding.PersonaType;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

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
}
