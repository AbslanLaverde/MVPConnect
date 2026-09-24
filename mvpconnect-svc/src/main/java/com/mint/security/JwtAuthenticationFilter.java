package com.mint.security;

import com.mint.authsession.SessionAuthException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT Authentication Filter
 * Intercepts every request to validate JWT token and set authentication
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private SessionJwtTokenProvider sessionTokenProvider;

    @Autowired
    private SessionAccessTokenService sessionAccessTokens;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && jwt.length() <= 8192) {
                SessionJwtTokenProvider.AccessClaims claims = null;
                UserDetails userDetails;
                try {
                    claims = sessionTokenProvider.parse(jwt);
                } catch (SessionAuthException invalid) {
                    // Transitional fallback is limited to parsing. A successfully parsed new
                    // token that fails session/principal validation NEVER reaches legacy auth.
                    if (!tokenProvider.validateToken(jwt)) throw invalid;
                }
                userDetails = claims != null ? sessionAccessTokens.authenticate(claims)
                        : userDetailsService.loadUserByUsername(tokenProvider.getEmailFromToken(jwt));

                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);

                if (userDetails instanceof CustomUserDetails principal) {
                    MDC.put("accountId", principal.getId());
                    MDC.put("persona", principal.getUserType());
                    logger.debug(
                            "auth.context.established accountId={} persona={}",
                            principal.getId(), principal.getUserType()
                    );
                }
            }
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            logger.warn("auth.context.rejected exception={}", ex.getClass().getSimpleName());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extract JWT token from Authorization header
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        return null;
    }
}

