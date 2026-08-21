package com.mint.controllers;

import com.mint.dto.request.LoginRequest;
import com.mint.dto.request.MusicianSignupRequest;
import com.mint.dto.request.PromoterSignupRequest;
import com.mint.dto.request.VenueSignupRequest;
import com.mint.dto.response.JwtAuthenticationResponse;
import com.mint.services.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication Controller
 * Handles signup and login for all user types (Musician, Promoter, Venue)
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @RequestMapping(method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleOptions() {
        return ResponseEntity.ok().build();
    }

    /**
     * Signup endpoint for musicians
     * POST /auth/signup/musician
     */
    @PostMapping("/signup/musician")
    public ResponseEntity<JwtAuthenticationResponse> signupMusician(
        @Valid @RequestBody MusicianSignupRequest request
    ) {
        JwtAuthenticationResponse response = authService.signupMusician(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Signup endpoint for venues
     * POST /auth/signup/venue
     */
    @PostMapping("/signup/venue")
    public ResponseEntity<JwtAuthenticationResponse> signupVenue(
        @Valid @RequestBody VenueSignupRequest request
    ) {
        JwtAuthenticationResponse response = authService.signupVenue(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Signup endpoint for promoters
     * POST /auth/signup/promoter
     */
    @PostMapping("/signup/promoter")
    public ResponseEntity<JwtAuthenticationResponse> signupPromoter(
        @Valid @RequestBody PromoterSignupRequest request
    ) {
        JwtAuthenticationResponse response = authService.signupPromoter(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Unified login endpoint for all user types
     * POST /auth/login
     *
     * Automatically determines user type by searching all repositories
     */
    @PostMapping("/login")
    public ResponseEntity<JwtAuthenticationResponse> login(
        @Valid @RequestBody LoginRequest request
    ) {
        JwtAuthenticationResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}

