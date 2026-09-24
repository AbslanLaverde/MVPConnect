package com.mint.security;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
import java.util.Base64;
import java.util.Date;

/**
 * Transitional legacy JWT issuance/validation. Remove at the Phase 5 client cutover.
 * Login/signup intentionally keep their existing raw UTF-8 key and configured 24-hour TTL.
 */
@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
    private static final ObjectMapper LEGACY_SHAPE_READER = new ObjectMapper()
            .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION);

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpirationMs;

    /**
     * Generate JWT token from authentication
     */
    public String generateToken(Authentication authentication) {
        CustomUserDetails userPrincipal = (CustomUserDetails) authentication.getPrincipal();

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
                .subject(userPrincipal.getUsername()) // email
                .claim("userId", userPrincipal.getId())
                .claim("userType", userPrincipal.getUserType())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    /**
     * Generate token from email (for registration)
     */
    public String generateTokenFromEmail(String email, String userId, String userType) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("userType", userType)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    /**
     * Get email from JWT token
     */
    public String getEmailFromToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();
    }

    /**
     * Get user ID from JWT token
     */
    public String getUserIdFromToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("userId", String.class);
    }

    /**
     * Get user type from JWT token
     */
    public String getUserTypeFromToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("userType", String.class);
    }

    /**
     * Validate JWT token
     */
    public boolean validateToken(String token) {
        try {
            if (token == null || token.length() > 8192) return false;
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token).getPayload();

            // JJWT normalizes away null/empty claims. Inspect the verified original JSON too,
            // so sid:null (or empty iss/aud) cannot downgrade into the legacy path.
            var original = LEGACY_SHAPE_READER.readTree(Base64.getUrlDecoder().decode(token.split("\\.", -1)[1]));
            return original.isObject() && !original.has("sid") && !original.has("iss") && !original.has("aud")
                    && claims.getSubject() != null && !claims.getSubject().isBlank()
                    && claims.get("userId", String.class) != null
                    && claims.get("userType", String.class) != null && claims.getExpiration() != null;
        } catch (JwtException | IllegalArgumentException | IOException e) {
            logger.debug("auth.legacy-token.rejected");
        }
        return false;
    }
}

