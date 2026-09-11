package com.mint.services;

import com.mint.dto.response.profile.PublicLocationResponse;
import com.mint.dto.response.profile.PublicMusicianProfileResponse;
import com.mint.dto.response.profile.PublicPromoterProfileResponse;
import com.mint.dto.response.profile.PublicVenueLocationResponse;
import com.mint.dto.response.profile.PublicVenueProfileResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.EquipmentItemCodec;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import com.mint.dto.response.externalconnection.PublicExternalConnectionResponse;
import com.mint.externalconnection.ExternalProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.List;

@Service
public class PublicProfileService {

    private final MusicianRepository musicianRepository;
    private final VenueRepository venueRepository;
    private final PromoterRepository promoterRepository;
    private final PublicProfileMediaService mediaService;
    private final ProfileLocationMapper locationMapper;
    private final ExternalConnectionService externalConnectionService;
    private final ArtistIdentityService artistIdentityService;

    public PublicProfileService(
            MusicianRepository musicianRepository,
            VenueRepository venueRepository,
            PromoterRepository promoterRepository,
            PublicProfileMediaService mediaService,
            ProfileLocationMapper locationMapper,
            ExternalConnectionService externalConnectionService,
            ArtistIdentityService artistIdentityService) {
        this.musicianRepository = musicianRepository;
        this.venueRepository = venueRepository;
        this.promoterRepository = promoterRepository;
        this.mediaService = mediaService;
        this.locationMapper = locationMapper;
        this.externalConnectionService = externalConnectionService;
        this.artistIdentityService = artistIdentityService;
    }

    @Transactional(readOnly = true)
    public Optional<PublicMusicianProfileResponse> findMusician(String id) {
        return musicianRepository.findById(id).map(musician -> {
            PublicProfileMediaService.CanonicalMediaBundle media =
                    mediaService.findCanonicalMedia(musician.getId(), PersonaType.MUSICIAN);
            List<PublicExternalConnectionResponse> connections =
                    externalConnectionService.publicConnections(musician.getId(), PersonaType.MUSICIAN);
            String legacyInstagram = connections.stream()
                    .anyMatch(item -> item.provider() == ExternalProvider.INSTAGRAM)
                    ? null : musician.getInstagramHandle();
            return new PublicMusicianProfileResponse(
                musician.getId(),
                musician.getName(),
                musician.getBio(),
                locationMapper.publicLocation(musician),
                musician.getGenres(),
                musician.getVibes(),
                musician.getEventTypes(),
                musician.getBookingStatus(),
                musician.getTypicalDraw(),
                musician.getTravelRadiusMiles(),
                musician.getTouring(),
                musician.getSetLengthMinutes(),
                EquipmentItemCodec.decode(musician.getEquipmentBrought()),
                musician.getWebsiteUrl(),
                legacyInstagram, media.profileImage(), media.bannerImage(), media.galleryImages(), connections,
                artistIdentityService.findFor(musician.getId())
            );
        });
    }

    @Transactional(readOnly = true)
    public Optional<PublicVenueProfileResponse> findVenue(String id) {
        return venueRepository.findById(id).map(venue -> {
            PublicProfileMediaService.CanonicalMediaBundle media =
                    mediaService.findCanonicalMedia(venue.getId(), PersonaType.VENUE);
            return new PublicVenueProfileResponse(
                venue.getId(),
                venue.getVenueName(),
                venue.getDescription(),
                locationMapper.publicLocation(venue),
                venue.getCapacity(),
                venue.getGenrePreferences(),
                venue.getAmbience(),
                venue.getEventTypes(),
                venue.getStageWidthFeet(),
                venue.getStageDepthFeet(),
                venue.getSoundEngineerAvailability(),
                venue.getSoundcheckAvailability(),
                venue.getPaAvailability(),
                EquipmentItemCodec.decode(venue.getEquipmentAvailable()),
                venue.getProductionAmenities(),
                venue.getBookingStatus(),
                venue.getBookingMethod(),
                venue.getDesiredArtistDraw(),
                venue.getWebsiteUrl(), media.profileImage(), media.bannerImage(), media.galleryImages(),
                externalConnectionService.publicConnections(venue.getId(), PersonaType.VENUE)
            );
        });
    }

    @Transactional(readOnly = true)
    public Optional<PublicPromoterProfileResponse> findPromoter(String id) {
        return promoterRepository.findById(id).map(promoter -> {
            PublicProfileMediaService.CanonicalMediaBundle media =
                    mediaService.findCanonicalMedia(promoter.getId(), PersonaType.PROMOTER);
            return new PublicPromoterProfileResponse(
                promoter.getId(),
                promoter.getBusinessName(),
                promoter.getBio(),
                promoter.getWebsiteUrl(),
                locationMapper.publicLocation(promoter),
                promoter.getGenreSpecialties(),
                promoter.getEventTypes(),
                promoter.getVibePreferences(),
                promoter.getAcceptingStatus(),
                promoter.getRosterSizeRange(),
                media.profileImage(), media.bannerImage(), media.galleryImages(),
                externalConnectionService.publicConnections(promoter.getId(), PersonaType.PROMOTER)
            );
        });
    }

}
