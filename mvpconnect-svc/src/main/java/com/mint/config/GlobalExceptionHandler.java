package com.mint.config;

import com.mint.dto.response.ErrorResponse;
import com.mint.exceptions.DuplicateEmailException;
import com.mint.exceptions.ExternalArtistException;
import com.mint.exceptions.MediaException;
import com.mint.exceptions.LocationLookupException;
import com.mint.exceptions.OnboardingException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.ArrayList;
import java.util.List;

/**
 * Global Exception Handler
 * Handles all exceptions across the application and returns consistent error responses
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ExternalArtistException.class)
    public ResponseEntity<ErrorResponse> handleExternalArtistException(
            ExternalArtistException ex,
            HttpServletRequest request) {
        logHandled(ex.getStatus().value(), ex.getCode(), request, ex);
        return ResponseEntity.status(ex.getStatus()).body(new ErrorResponse(
                ex.getStatus().value(),
                ex.getStatus().getReasonPhrase(),
                ex.getCode(),
                ex.getMessage(),
                request.getRequestURI()
        ));
    }

    @ExceptionHandler(LocationLookupException.class)
    public ResponseEntity<ErrorResponse> handleLocationLookupException(
            LocationLookupException ex,
            HttpServletRequest request) {
        logHandled(ex.getStatus().value(), ex.getCode(), request, ex);
        ErrorResponse errorResponse = new ErrorResponse(
                ex.getStatus().value(),
                ex.getStatus().getReasonPhrase(),
                ex.getCode(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(ex.getStatus()).body(errorResponse);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableRequest(
            HttpMessageNotReadableException ex,
            HttpServletRequest request) {
        logHandled(HttpStatus.BAD_REQUEST.value(), "INVALID_REQUEST_BODY", request, ex);
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "INVALID_REQUEST_BODY",
                "The request body is malformed or contains unsupported fields or value types.",
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(errorResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex,
            HttpServletRequest request) {
        logHandled(HttpStatus.FORBIDDEN.value(), "ACCESS_DENIED", request, ex);
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                "ACCESS_DENIED",
                "The authenticated account is not allowed to perform this operation.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    @ExceptionHandler(MediaException.class)
    public ResponseEntity<ErrorResponse> handleMediaException(
            MediaException ex,
            HttpServletRequest request) {
        logHandled(ex.getStatus().value(), ex.getCode(), request, ex);
        ErrorResponse errorResponse = new ErrorResponse(
                ex.getStatus().value(),
                ex.getStatus().getReasonPhrase(),
                ex.getCode(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(ex.getStatus()).body(errorResponse);
    }

    @ExceptionHandler(OnboardingException.class)
    public ResponseEntity<ErrorResponse> handleOnboardingException(
            OnboardingException ex,
            HttpServletRequest request) {
        logHandled(ex.getStatus().value(), ex.getCode(), request, ex);
        ErrorResponse errorResponse = ex.getDetails() == null
                ? new ErrorResponse(
                        ex.getStatus().value(),
                        ex.getStatus().getReasonPhrase(),
                        ex.getCode(),
                        ex.getMessage(),
                        request.getRequestURI()
                )
                : new ErrorResponse(
                        ex.getStatus().value(),
                        ex.getStatus().getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        ex.getDetails()
                );
        if (ex.getDetails() != null) {
            errorResponse.setCode(ex.getCode());
        }
        return ResponseEntity.status(ex.getStatus()).body(errorResponse);
    }

    /**
     * Handle a duplicate email across musician, venue, and promoter accounts.
     */
    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmailException(
            DuplicateEmailException ex,
            HttpServletRequest request) {

        logHandled(HttpStatus.BAD_REQUEST.value(), DuplicateEmailException.CODE, request, ex);

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                DuplicateEmailException.CODE,
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Handle validation errors
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        logHandled(HttpStatus.BAD_REQUEST.value(), "VALIDATION_FAILED", request, ex);

        List<String> details = new ArrayList<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            details.add(error.getField() + ": " + error.getDefaultMessage());
        }

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Validation Failed",
                "Invalid input data",
                request.getRequestURI(),
                details
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Handle authentication errors
     */
    @ExceptionHandler({BadCredentialsException.class})
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            BadCredentialsException ex,
            HttpServletRequest request) {

        logHandled(HttpStatus.UNAUTHORIZED.value(), "AUTHENTICATION_FAILED", request, ex);

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                "Authentication Failed",
                "Invalid email or password",
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    /**
     * Handle user not found
     */
    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFoundException(
            UsernameNotFoundException ex,
            HttpServletRequest request) {

        logHandled(HttpStatus.NOT_FOUND.value(), "USER_NOT_FOUND", request, ex);

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "User Not Found",
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    /**
     * Handle duplicate email (will be used when creating users)
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex,
            HttpServletRequest request) {

        logHandled(HttpStatus.BAD_REQUEST.value(), "ILLEGAL_ARGUMENT", request, ex);

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Handle all other exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(
            Exception ex,
            HttpServletRequest request) {

        logHandled(HttpStatus.INTERNAL_SERVER_ERROR.value(), "UNEXPECTED_ERROR", request, ex);

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "An unexpected error occurred: " + ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    private void logHandled(
            int status,
            String code,
            HttpServletRequest request,
            Exception exception) {
        if (status >= 500) {
            LOGGER.error(
                    "api.exception.handled method={} path={} status={} code={} exception={}",
                    request.getMethod(), request.getRequestURI(), status, code,
                    exception.getClass().getSimpleName(), exception
            );
        } else {
            LOGGER.warn(
                    "api.exception.handled method={} path={} status={} code={} exception={}",
                    request.getMethod(), request.getRequestURI(), status, code,
                    exception.getClass().getSimpleName()
            );
        }
    }
}

