package com.mint.services;

import com.mint.dto.response.account.MusicianSelfAccountResponse;
import com.mint.dto.response.account.PromoterSelfAccountResponse;
import com.mint.dto.response.account.SelfAccountResponse;
import com.mint.dto.response.account.VenueSelfAccountResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.EquipmentItemCodec;
import com.mint.onboarding.LocationListCodec;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SelfAccountService {

    private final AuthenticatedPersonaProvider authenticatedPersonaProvider;
    private final MusicianRepository musicianRepository;
    private final VenueRepository venueRepository;
    private final PromoterRepository promoterRepository;
    private final PublicProfileMediaService mediaService;
    private final ProfileLocationMapper locationMapper;
    private final ExternalConnectionService externalConnectionService;
    private final ArtistIdentityService artistIdentityService;

    public SelfAccountService(
            AuthenticatedPersonaProvider authenticatedPersonaProvider,
            MusicianRepository musicianRepository,
            VenueRepository venueRepository,
            PromoterRepository promoterRepository,
            PublicProfileMediaService mediaService,
            ProfileLocationMapper locationMapper,
            ExternalConnectionService externalConnectionService,
            ArtistIdentityService artistIdentityService) {
        this.authenticatedPersonaProvider = authenticatedPersonaProvider;
        this.musicianRepository = musicianRepository;
        this.venueRepository = venueRepository;
        this.promoterRepository = promoterRepository;
        this.mediaService = mediaService;
        this.locationMapper = locationMapper;
        this.externalConnectionService = externalConnectionService;
        this.artistIdentityService = artistIdentityService;
    }

    @Transactional(readOnly = true)
    public SelfAccountResponse getCurrentAccount() {
        AuthenticatedPersona identity = authenticatedPersonaProvider.current();
        return switch (identity.persona()) {
            case MUSICIAN -> musician(identity);
            case VENUE -> venue(identity);
            case PROMOTER -> promoter(identity);
        };
    }

    private MusicianSelfAccountResponse musician(AuthenticatedPersona identity) {
        Musician musician = musicianRepository.findById(identity.userId())
                .orElseThrow(SelfAccountService::accountNotFound);
        PublicProfileMediaService.CanonicalMediaBundle media =
                mediaService.findCanonicalMedia(musician.getId(), PersonaType.MUSICIAN);
        return new MusicianSelfAccountResponse(
                musician.getId(), PersonaType.MUSICIAN, musician.getName(), musician.getEmail(),
                musician.getBio(), locationMapper.selfLocation(musician),
                musician.getGenres(), musician.getVibes(), musician.getEventTypes(),
                musician.getMinimumFee(), musician.getWillingToTravel(), musician.getBookingStatus(),
                musician.getTypicalDraw(), musician.getTravelRadiusMiles(), musician.getTouring(),
                musician.getSetLengthMinutes(), EquipmentItemCodec.decode(musician.getEquipmentBrought()),
                musician.getConnectionGoals(), musician.getWebsiteUrl(), musician.getInstagramHandle(),
                musician.getOnboardingStatus(), musician.getOnboardingCompletedAt(),
                musician.getOnboardingVersion(), media.profileImage(), media.bannerImage(), media.galleryImages(),
                externalConnectionService.selfConnections(
                        musician.getId(), PersonaType.MUSICIAN, musician.getInstagramHandle()),
                artistIdentityService.findFor(musician.getId())
        );
    }

    private VenueSelfAccountResponse venue(AuthenticatedPersona identity) {
        Venue venue = venueRepository.findById(identity.userId())
                .orElseThrow(SelfAccountService::accountNotFound);
        PublicProfileMediaService.CanonicalMediaBundle media =
                mediaService.findCanonicalMedia(venue.getId(), PersonaType.VENUE);
        return new VenueSelfAccountResponse(
                venue.getId(), PersonaType.VENUE, venue.getVenueName(), venue.getEmail(),
                venue.getDescription(), locationMapper.selfLocation(venue),
                venue.getCapacity(), venue.getGenrePreferences(), venue.getAmbience(), venue.getEventTypes(),
                venue.getStageWidthFeet(), venue.getStageDepthFeet(),
                venue.getSoundEngineerAvailability(), venue.getSoundcheckAvailability(), venue.getPaAvailability(),
                EquipmentItemCodec.decode(venue.getEquipmentAvailable()), venue.getProductionAmenities(), venue.getTypicalBudget(),
                venue.getLiveMusic(), venue.getBookingStatus(), venue.getBookingMethod(),
                venue.getDesiredArtistDraw(), venue.getConnectionGoals(), venue.getWebsiteUrl(),
                venue.getBookingEmail(), venue.getOnboardingStatus(), venue.getOnboardingCompletedAt(),
                venue.getOnboardingVersion(), media.profileImage(), media.bannerImage(), media.galleryImages(),
                externalConnectionService.selfConnections(venue.getId(), PersonaType.VENUE)
        );
    }

    private PromoterSelfAccountResponse promoter(AuthenticatedPersona identity) {
        Promoter promoter = promoterRepository.findById(identity.userId())
                .orElseThrow(SelfAccountService::accountNotFound);
        PublicProfileMediaService.CanonicalMediaBundle media =
                mediaService.findCanonicalMedia(promoter.getId(), PersonaType.PROMOTER);
        return new PromoterSelfAccountResponse(
                promoter.getId(), PersonaType.PROMOTER, promoter.getBusinessName(), promoter.getEmail(),
                promoter.getBio(), locationMapper.selfLocation(promoter),
                promoter.getGenreSpecialties(), promoter.getEventTypes(), promoter.getVibePreferences(),
                promoter.getAcceptingNewArtists(), promoter.getCurrentRosterSize(),
                promoter.getAcceptingStatus(), promoter.getRosterSizeRange(),
                LocationListCodec.decode(promoter.getAdditionalMarkets()).stream()
                        .map(locationMapper::selfLocation)
                        .toList(),
                promoter.getConnectionGoals(), promoter.getWebsiteUrl(), promoter.getPhone(),
                promoter.getOnboardingStatus(), promoter.getOnboardingCompletedAt(),
                promoter.getOnboardingVersion(), media.profileImage(), media.bannerImage(), media.galleryImages(),
                externalConnectionService.selfConnections(promoter.getId(), PersonaType.PROMOTER)
        );
    }

    private static UsernameNotFoundException accountNotFound() {
        return new UsernameNotFoundException("The authenticated account no longer exists.");
    }
}
