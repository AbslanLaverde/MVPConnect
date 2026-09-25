package com.mint.authsession.http;

import com.mint.authsession.SessionAuthException;
import com.mint.authsession.SessionStoreException;
import com.mint.authsession.SessionTransport;
import com.mint.config.GlobalExceptionHandler;
import com.mint.controllers.AuthController;
import com.mint.dto.response.ErrorResponse;
import com.mint.exceptions.DuplicateEmailException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import static com.mint.authsession.http.AuthHttpException.Code.*;

/** Auth-only envelope mapping. Never return parser, driver, credential, or family-state details. */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthHttpExceptionHandler {
    private final RefreshCookie cookies;
    private final GlobalExceptionHandler existingErrors;

    public AuthHttpExceptionHandler(RefreshCookie cookies, GlobalExceptionHandler existingErrors) {
        this.cookies = cookies;
        this.existingErrors = existingErrors;
    }

    @ExceptionHandler(AuthHttpException.class)
    public ResponseEntity<ErrorResponse> authError(AuthHttpException error, HttpServletRequest request) {
        var response = ResponseEntity.status(error.status()).header(HttpHeaders.CACHE_CONTROL, "no-store");
        if (error.code() == SESSION_INVALID && request.getAttribute(AuthClientTransportResolver.ATTRIBUTE) == SessionTransport.WEB) {
            response.header(HttpHeaders.SET_COOKIE, cookies.clearRefreshCookie().toString());
        }
        return response.body(error.response(request.getRequestURI()));
    }

    @ExceptionHandler(SessionAuthException.class)
    public ResponseEntity<ErrorResponse> invalidSession(SessionAuthException error, HttpServletRequest request) {
        return authError(new AuthHttpException(SESSION_INVALID), request);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> invalidCredentials(AuthenticationException error, HttpServletRequest request) {
        return authError(new AuthHttpException(INVALID_CREDENTIALS), request);
    }

    @ExceptionHandler({SessionStoreException.class, DataAccessException.class})
    public ResponseEntity<ErrorResponse> unavailable(Exception error, HttpServletRequest request) {
        return authError(new AuthHttpException(AUTH_SERVICE_UNAVAILABLE), request);
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> duplicate(DuplicateEmailException error, HttpServletRequest request) {
        return existingErrors.handleDuplicateEmailException(error, request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException error, HttpServletRequest request) {
        if (request.getHeader(AuthClientTransportResolver.HEADER) == null) {
            return existingErrors.handleValidationErrors(error, request);
        }
        return authError(new AuthHttpException(AUTH_REQUEST_INVALID), request);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, HttpMediaTypeNotSupportedException.class})
    public ResponseEntity<ErrorResponse> malformed(Exception error, HttpServletRequest request) {
        return authError(new AuthHttpException(AUTH_REQUEST_INVALID), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> unexpected(Exception error, HttpServletRequest request) {
        // Narrow fallback for these credential-bearing routes; no raw exception/cause logging.
        org.slf4j.LoggerFactory.getLogger(getClass()).error("auth.transport.failed exception={}", error.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(new ErrorResponse(500, "Internal Server Error", AUTH_SERVICE_UNAVAILABLE.name(),
                        "Authentication service unavailable", request.getRequestURI()));
    }
}
