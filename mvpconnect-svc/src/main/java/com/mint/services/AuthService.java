package com.mint.services;

import com.mint.dto.request.MusicianSignupRequest;
import com.mint.dto.request.PromoterSignupRequest;
import com.mint.dto.request.VenueSignupRequest;
import com.mint.dto.request.LoginRequest;
import com.mint.dto.response.JwtAuthenticationResponse;
import com.mint.authsession.AuthIdentity;
import com.mint.authsession.AuthFailure;
import com.mint.authsession.SessionAuthException;
import com.mint.onboarding.PersonaType;
import com.mint.security.CustomUserDetails;
import com.mint.exceptions.DuplicateEmailException;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.OnboardingStepRegistry;
import com.mint.onboarding.PersonaOnboardingStatus;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Service handling authentication logic for all user types
 * Manages signup, login, and JWT token generation
 */
@Service
public class AuthService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthService.class);

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
        return legacySignupResponse(createMusician(request));
    }

    // No outer transaction: SDN repository.save commits the persona before this returns.
    // NOT_SUPPORTED also protects session-aware callers from accidentally joining an outer TX.
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public AuthIdentity createMusician(MusicianSignupRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        if (emailExists(normalizedEmail)) {
            throw new DuplicateEmailException();
        }

        Musician musician = new Musician();
        musician.setName(request.getName().trim());
        musician.setEmail(normalizedEmail);
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
        musician.setOnboardingStatus(PersonaOnboardingStatus.NOT_STARTED);
        musician.setOnboardingVersion(OnboardingStepRegistry.CURRENT_VERSION);

        musician.setCreatedAt(java.time.LocalDateTime.now());
        musician.setUpdatedAt(java.time.LocalDateTime.now());

        musician = musicianRepository.save(musician);

        LOGGER.info("account.created accountId={} persona=MUSICIAN", musician.getId());

        return new AuthIdentity(musician.getId(), PersonaType.MUSICIAN, musician.getEmail(), musician.getName());
    }

    /**
     * Register a new venue
     */
    public JwtAuthenticationResponse signupVenue(VenueSignupRequest request) {
        return legacySignupResponse(createVenue(request));
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public AuthIdentity createVenue(VenueSignupRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        if (emailExists(normalizedEmail)) {
            throw new DuplicateEmailException();
        }

        Venue venue = new Venue();
        venue.setVenueName(request.getVenueName().trim());
        venue.setEmail(normalizedEmail);
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
        venue.setOnboardingStatus(PersonaOnboardingStatus.NOT_STARTED);
        venue.setOnboardingVersion(OnboardingStepRegistry.CURRENT_VERSION);

        venue.setCreatedAt(java.time.LocalDateTime.now());
        venue.setUpdatedAt(java.time.LocalDateTime.now());

        venue = venueRepository.save(venue);

        LOGGER.info("account.created accountId={} persona=VENUE", venue.getId());

        return new AuthIdentity(venue.getId(), PersonaType.VENUE, venue.getEmail(), venue.getVenueName());
    }

    /**
     * Register a new promoter
     */
    public JwtAuthenticationResponse signupPromoter(PromoterSignupRequest request) {
        return legacySignupResponse(createPromoter(request));
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public AuthIdentity createPromoter(PromoterSignupRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        if (emailExists(normalizedEmail)) {
            throw new DuplicateEmailException();
        }

        Promoter promoter = new Promoter();
        promoter.setBusinessName(request.getBusinessName().trim());
        promoter.setEmail(normalizedEmail);
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
        promoter.setOnboardingStatus(PersonaOnboardingStatus.NOT_STARTED);
        promoter.setOnboardingVersion(OnboardingStepRegistry.CURRENT_VERSION);

        promoter.setCreatedAt(java.time.LocalDateTime.now());
        promoter.setUpdatedAt(java.time.LocalDateTime.now());
        
        promoter = promoterRepository.save(promoter);

        LOGGER.info("account.created accountId={} persona=PROMOTER", promoter.getId());

        return new AuthIdentity(promoter.getId(), PersonaType.PROMOTER, promoter.getEmail(), promoter.getBusinessName());
    }

    private JwtAuthenticationResponse legacySignupResponse(AuthIdentity identity) {
        String token = jwtTokenProvider.generateTokenFromEmail(identity.email(), identity.userId(), identity.persona().name());
        return new JwtAuthenticationResponse(token, "Bearer", identity.userId(), identity.email(), identity.persona().name(), identity.name());
    }

    /** Session-aware credential authentication deliberately does not issue a legacy JWT. */
    public AuthIdentity authenticateIdentity(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                normalizeEmail(request.getEmail()), request.getPassword()));
        CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
        SecurityContextHolder.getContext().setAuthentication(authentication);
        return (switch (PersonaType.valueOf(principal.getUserType())) {
            case MUSICIAN -> musicianRepository.findById(principal.getId())
                    .map(m -> new AuthIdentity(m.getId(), PersonaType.MUSICIAN, m.getEmail(), m.getName()));
            case VENUE -> venueRepository.findById(principal.getId())
                    .map(v -> new AuthIdentity(v.getId(), PersonaType.VENUE, v.getEmail(), v.getVenueName()));
            case PROMOTER -> promoterRepository.findById(principal.getId())
                    .map(p -> new AuthIdentity(p.getId(), PersonaType.PROMOTER, p.getEmail(), p.getBusinessName()));
        }).orElseThrow(() -> new SessionAuthException(AuthFailure.INVALID_OWNER));
    }

    /**
     * Authenticate user and generate JWT token
     * Works for all user types - searches all repositories automatically
     */
    public JwtAuthenticationResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                normalizedEmail,
                request.getPassword()
            )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String token = jwtTokenProvider.generateToken(authentication);

        // Determine user type and get display name
        String email = normalizedEmail;
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

        LOGGER.info("account.login.succeeded accountId={} persona={}", userId, userType);

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
        return musicianRepository.existsByEmailIgnoreCase(email) ||
               promoterRepository.existsByEmailIgnoreCase(email) ||
               venueRepository.existsByEmailIgnoreCase(email);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}

