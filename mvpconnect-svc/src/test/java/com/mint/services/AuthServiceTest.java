package com.mint.services;

import com.mint.dto.request.MusicianSignupRequest;
import com.mint.dto.request.PromoterSignupRequest;
import com.mint.dto.request.VenueSignupRequest;
import com.mint.dto.response.JwtAuthenticationResponse;
import com.mint.exceptions.DuplicateEmailException;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.PersonaOnboardingStatus;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.JwtTokenProvider;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private enum AccountType {
        MUSICIAN,
        VENUE,
        PROMOTER
    }

    @Mock
    private MusicianRepository musicianRepository;

    @Mock
    private VenueRepository venueRepository;

    @Mock
    private PromoterRepository promoterRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    static Stream<Arguments> duplicateEmailMatrix() {
        return Stream.of(AccountType.values())
                .flatMap(existingType -> Stream.of(AccountType.values())
                        .map(attemptedType -> Arguments.of(existingType, attemptedType)));
    }

    @ParameterizedTest(name = "existing {0} email rejects {1} signup")
    @MethodSource("duplicateEmailMatrix")
    void rejectsDuplicateEmailAcrossEveryPersonaCombination(
            AccountType existingType,
            AccountType attemptedType) {
        String normalizedEmail = "alex@example.com";

        switch (existingType) {
            case MUSICIAN -> when(musicianRepository.existsByEmailIgnoreCase(normalizedEmail)).thenReturn(true);
            case VENUE -> when(venueRepository.existsByEmailIgnoreCase(normalizedEmail)).thenReturn(true);
            case PROMOTER -> when(promoterRepository.existsByEmailIgnoreCase(normalizedEmail)).thenReturn(true);
        }

        assertThrows(
                DuplicateEmailException.class,
                () -> signup(attemptedType, "  Alex@Example.com  ")
        );

        verify(musicianRepository, never()).save(any(Musician.class));
        verify(venueRepository, never()).save(any(Venue.class));
        verify(promoterRepository, never()).save(any(Promoter.class));
    }

    @ParameterizedTest(name = "new normalized email creates a {0} account")
    @EnumSource(AccountType.class)
    void createsEachPersonaWithANewNormalizedEmail(AccountType attemptedType) {
        when(passwordEncoder.encode("secret1")).thenReturn("hashed-password");
        switch (attemptedType) {
            case MUSICIAN -> when(musicianRepository.save(any(Musician.class))).thenAnswer(invocation -> {
                Musician musician = invocation.getArgument(0);
                musician.setId("musician-id");
                return musician;
            });
            case VENUE -> when(venueRepository.save(any(Venue.class))).thenAnswer(invocation -> {
                Venue venue = invocation.getArgument(0);
                venue.setId("venue-id");
                return venue;
            });
            case PROMOTER -> when(promoterRepository.save(any(Promoter.class))).thenAnswer(invocation -> {
                Promoter promoter = invocation.getArgument(0);
                promoter.setId("promoter-id");
                return promoter;
            });
        }
        when(jwtTokenProvider.generateTokenFromEmail(any(String.class), any(String.class), any(String.class)))
                .thenReturn("access-token");

        JwtAuthenticationResponse response = signup(attemptedType, "  New@Example.com  ");

        assertEquals("new@example.com", response.getEmail());
        assertEquals("access-token", response.getAccessToken());
        assertEquals(attemptedType.name(), response.getUserType());

        switch (attemptedType) {
            case MUSICIAN -> verify(musicianRepository).save(
                    org.mockito.ArgumentMatchers.argThat(account ->
                            account.getEmail().equals("new@example.com") &&
                            account.getName().equals("Test Name") &&
                            account.getOnboardingStatus() == PersonaOnboardingStatus.NOT_STARTED &&
                            account.getOnboardingVersion() == 1)
            );
            case VENUE -> verify(venueRepository).save(
                    org.mockito.ArgumentMatchers.argThat(account ->
                            account.getEmail().equals("new@example.com") &&
                            account.getVenueName().equals("Test Name") &&
                            account.getOnboardingStatus() == PersonaOnboardingStatus.NOT_STARTED &&
                            account.getOnboardingVersion() == 1)
            );
            case PROMOTER -> verify(promoterRepository).save(
                    org.mockito.ArgumentMatchers.argThat(account ->
                            account.getEmail().equals("new@example.com") &&
                            account.getBusinessName().equals("Test Name") &&
                            account.getOnboardingStatus() == PersonaOnboardingStatus.NOT_STARTED &&
                            account.getOnboardingVersion() == 1)
            );
        }
    }

    private JwtAuthenticationResponse signup(AccountType accountType, String email) {
        return switch (accountType) {
            case MUSICIAN -> {
                MusicianSignupRequest request = new MusicianSignupRequest();
                request.setName("  Test Name  ");
                request.setEmail(email);
                request.setPassword("secret1");
                yield authService.signupMusician(request);
            }
            case VENUE -> {
                VenueSignupRequest request = new VenueSignupRequest();
                request.setVenueName("  Test Name  ");
                request.setEmail(email);
                request.setPassword("secret1");
                yield authService.signupVenue(request);
            }
            case PROMOTER -> {
                PromoterSignupRequest request = new PromoterSignupRequest();
                request.setBusinessName("  Test Name  ");
                request.setEmail(email);
                request.setPassword("secret1");
                yield authService.signupPromoter(request);
            }
        };
    }
}
