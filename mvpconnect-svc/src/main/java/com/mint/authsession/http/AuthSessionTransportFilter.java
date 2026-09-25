package com.mint.authsession.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.DefaultCorsProcessor;

import java.io.IOException;
import java.util.Set;

/** Registered only in the security chain, before CORS, to return bounded auth error envelopes. */
public class AuthSessionTransportFilter extends OncePerRequestFilter {
    private static final Set<String> PATHS = Set.of("/auth/login", "/auth/signup/musician", "/auth/signup/venue",
            "/auth/signup/promoter", "/auth/refresh", "/auth/logout");
    private final AuthClientTransportResolver resolver;
    private final ObjectMapper mapper;
    private final CorsConfigurationSource cors;

    public AuthSessionTransportFilter(AuthClientTransportResolver resolver, ObjectMapper mapper, CorsConfigurationSource cors) {
        this.resolver = resolver;
        this.mapper = mapper;
        this.cors = cors;
    }

    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !PATHS.contains(path(request));
    }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        try {
            resolver.resolve(request, Set.of("/auth/refresh", "/auth/logout").contains(path(request)));
        } catch (AuthHttpException rejected) {
            // CORS has not run yet. Trusted browser clients must still be able to read this error.
            // Reuse its exact policy; untrusted origins never receive an allow-origin header.
            var configuration = cors.getCorsConfiguration(request);
            String origin = request.getHeader("Origin");
            if (configuration != null && origin != null && configuration.checkOrigin(origin) != null) {
                new DefaultCorsProcessor().processRequest(configuration, request, response);
            }
            response.setStatus(rejected.status().value());
            response.setContentType("application/json");
            response.setHeader("Cache-Control", "no-store");
            mapper.writeValue(response.getWriter(), rejected.response(request.getRequestURI()));
            return;
        }
        chain.doFilter(request, response);
    }

    private String path(HttpServletRequest request) {
        return request.getRequestURI().substring(request.getContextPath().length());
    }
}
