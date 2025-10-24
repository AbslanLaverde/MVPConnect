package com.mint.services;

import com.mint.dto.request.MusicianSignupRequest;
import com.mint.dto.request.PromoterSignupRequest;
import com.mint.dto.request.VenueSignupRequest;
import com.mint.dto.request.LoginRequest;
import com.mint.dto.response.JwtAuthenticationResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Service handling authentication logic for all user types
 * Manages signup, login, and JWT token generation
 */
@Service
public class AuthService {

    @Autowired
    private MusicianRepository musicianRepository;

    @Autowired
    private PromoterRepository promoterRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private AuthenticationManager authenticationManager;

    /**
     * Register a new musician
     */
    public JwtAuthenticationResponse signupMusician(MusicianSignupRequest request) {
        if (emailExists(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        Musician musician = new Musician();
        musician.setName(request.getName());
        musician.setEmail(request.getEmail());
        musician.setPassword(passwordEncoder.encode(request.getPassword()));
        musician.setBio(request.getBio());
        musician.setLocation(request.getLocation());
        musician.setProfileImageUrl(request.getProfileImageUrl());
        musician.setGenres(request.getGenres());
        musician.setVibes(request.getVibes());
        musician.setMinimumFee(request.getMinimumFee());
        musician.setWillingToTravel(request.getWillingToTravel());
        musician.setWebsiteUrl(request.getWebsiteUrl());
        musician.setInstagramHandle(request.getInstagramHandle());

        musician = musicianRepository.save(musician);

        String token = jwtTokenProvider.generateTokenFromEmail(
            musician.getEmail(),
            musician.getId(),
            "MUSICIAN"
        );

        return new JwtAuthenticationResponse(
            token,
            "Bearer",
            musician.getId(),
            musician.getEmail(),
            "MUSICIAN",
            musician.getName()
        );
    }

    /**
     * Register a new venue
     */
    public JwtAuthenticationResponse signupVenue(VenueSignupRequest request) {
        if (emailExists(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        Venue venue = new Venue();
        venue.setVenueName(request.getVenueName());
        venue.setEmail(request.getEmail());
        venue.setPassword(passwordEncoder.encode(request.getPassword()));
        venue.setDescription(request.getDescription());
        venue.setLocation(request.getLocation());
        venue.setLogoUrl(request.getLogoUrl());
        venue.setCapacity(request.getCapacity());
        venue.setGenrePreferences(request.getGenrePreferences());
        venue.setAmbience(request.getAmbience());
        venue.setTypicalBudget(request.getTypicalBudget());
        venue.setLiveMusic(request.getLiveMusic());
        venue.setWebsiteUrl(request.getWebsiteUrl());
        venue.setBookingEmail(request.getBookingEmail());

        venue = venueRepository.save(venue);

        String token = jwtTokenProvider.generateTokenFromEmail(
            venue.getEmail(),
            venue.getId(),
            "VENUE"
        );

        return new JwtAuthenticationResponse(
            token,
            "Bearer",
            venue.getId(),
            venue.getEmail(),
            "VENUE",
            venue.getVenueName()
        );
    }

    /**
     * Register a new promoter
     */
    public JwtAuthenticationResponse signupPromoter(PromoterSignupRequest request) {
        if (emailExists(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        Promoter promoter = new Promoter();
        promoter.setBusinessName(request.getBusinessName());
        promoter.setEmail(request.getEmail());
        promoter.setPassword(passwordEncoder.encode(request.getPassword()));
        promoter.setBio(request.getBio());
        promoter.setLocation(request.getLocation());
        promoter.setLogoUrl(request.getLogoUrl());
        promoter.setGenreSpecialties(request.getGenreSpecialties());
        promoter.setEventTypes(request.getEventTypes());
        promoter.setAcceptingNewArtists(request.getAcceptingNewArtists());
        promoter.setCurrentRosterSize(request.getCurrentRosterSize());
        promoter.setWebsiteUrl(request.getWebsiteUrl());
        promoter.setPhone(request.getPhone());

        promoter = promoterRepository.save(promoter);

        String token = jwtTokenProvider.generateTokenFromEmail(
            promoter.getEmail(),
            promoter.getId(),
            "PROMOTER"
        );

        return new JwtAuthenticationResponse(
            token,
            "Bearer",
            promoter.getId(),
            promoter.getEmail(),
            "PROMOTER",
            promoter.getBusinessName()
        );
    }

    /**
     * Authenticate user and generate JWT token
     * Works for all user types - searches all repositories automatically
     */
    public JwtAuthenticationResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()
            )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String token = jwtTokenProvider.generateToken(authentication);

        // Determine user type and get display name
        String email = request.getEmail();
        String userId = null;
        String userType = null;
        String displayName = null;

        var musician = musicianRepository.findByEmail(email);
        if (musician.isPresent()) {
            userId = musician.get().getId();
            userType = "MUSICIAN";
            displayName = musician.get().getName();
        } else {
            var promoter = promoterRepository.findByEmail(email);
            if (promoter.isPresent()) {
                userId = promoter.get().getId();
                userType = "PROMOTER";
                displayName = promoter.get().getBusinessName();
            } else {
                var venue = venueRepository.findByEmail(email);
                if (venue.isPresent()) {
                    userId = venue.get().getId();
                    userType = "VENUE";
                    displayName = venue.get().getVenueName();
                }
            }
        }

        return new JwtAuthenticationResponse(
            token,
            "Bearer",
            userId,
            email,
            userType,
            displayName
        );
    }

    /**
     * Check if email exists across all user types
     */
    private boolean emailExists(String email) {
        return musicianRepository.existsByEmail(email) ||
               promoterRepository.existsByEmail(email) ||
               venueRepository.existsByEmail(email);
    }
}

