package com.mint.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Establishes a safe correlation ID and records one lifecycle pair for every HTTP request.
 * Request bodies, query strings, headers, and response bodies are deliberately excluded.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-ID";

    private static final Logger LOGGER = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final Pattern SAFE_REQUEST_ID = Pattern.compile("[A-Za-z0-9._-]{1,128}");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String requestId = requestId(request.getHeader(REQUEST_ID_HEADER));
        String method = request.getMethod();
        String path = request.getRequestURI();
        boolean healthRequest = path.startsWith("/actuator/health");
        long startedAt = System.nanoTime();

        MDC.put("requestId", requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);
        logStarted(healthRequest, method, path);

        Throwable failure = null;
        try {
            filterChain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException exception) {
            failure = exception;
            throw exception;
        } finally {
            long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
            int loggedStatus = failure != null && response.getStatus() < 400
                    ? HttpServletResponse.SC_INTERNAL_SERVER_ERROR
                    : response.getStatus();
            logCompleted(
                    healthRequest,
                    method,
                    path,
                    loggedStatus,
                    durationMs,
                    failure
            );
            MDC.remove("persona");
            MDC.remove("accountId");
            MDC.remove("requestId");
        }
    }

    private void logStarted(boolean healthRequest, String method, String path) {
        if (healthRequest) {
            LOGGER.debug("http.request.started method={} path={}", method, path);
        } else {
            LOGGER.info("http.request.started method={} path={}", method, path);
        }
    }

    private void logCompleted(
            boolean healthRequest,
            String method,
            String path,
            int responseStatus,
            long durationMs,
            Throwable failure) {
        String exceptionType = failure == null ? "none" : failure.getClass().getSimpleName();
        if (healthRequest) {
            LOGGER.debug(
                    "http.request.completed method={} path={} status={} durationMs={} exception={}",
                    method, path, responseStatus, durationMs, exceptionType
            );
        } else if (failure != null || responseStatus >= 500) {
            LOGGER.error(
                    "http.request.completed method={} path={} status={} durationMs={} exception={}",
                    method, path, responseStatus, durationMs, exceptionType
            );
        } else if (responseStatus >= 400) {
            LOGGER.warn(
                    "http.request.completed method={} path={} status={} durationMs={} exception={}",
                    method, path, responseStatus, durationMs, exceptionType
            );
        } else {
            LOGGER.info(
                    "http.request.completed method={} path={} status={} durationMs={}",
                    method, path, responseStatus, durationMs
            );
        }
    }

    private String requestId(String candidate) {
        if (candidate != null && SAFE_REQUEST_ID.matcher(candidate).matches()) {
            return candidate;
        }
        return UUID.randomUUID().toString();
    }
}
