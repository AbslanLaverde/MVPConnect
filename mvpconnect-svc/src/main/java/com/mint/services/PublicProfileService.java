package com.mint.services;

import com.mint.dto.response.profile.PublicLocationResponse;
import com.mint.dto.response.profile.PublicMusicianProfileResponse;
import com.mint.dto.response.profile.PublicPromoterProfileResponse;
import com.mint.dto.response.profile.PublicVenueLocationResponse;
import com.mint.dto.response.profile.PublicVenueProfileResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class PublicProfileService {

    private final MusicianRepository musicianRepository;
    private final VenueRepository venueRepository;
    private final PromoterRepository promoterRepository;
    private final PublicProfileMediaService mediaService;
    private final ProfileLocationMapper locationMapper;

    public PublicProfileService(
            MusicianRepository musicianRepository,
            VenueRepository venueRepository,
            PromoterRepository promoterRepository,
            PublicProfileMediaService mediaService,
            ProfileLocationMapper locationMapper) {
        this.musicianRepository = musicianRepository;
        this.venueRepository = venueRepository;
        this.promoterRepository = promoterRepository;
        this.mediaService = mediaService;
        this.locationMapper = locationMapper;
    }

    @Transactional(readOnly = true)
    public Optional<PublicMusicianProfileResponse> findMusician(String id) {
        return musicianRepository.findById(id).map(musician -> new PublicMusicianProfileResponse(
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
                musician.getEquipmentBrought(),
                musician.getConnectionGoals(),
                musician.getWebsiteUrl(),
                musician.getInstagramHandle(),
                mediaService.findProfileImage(musician.getId(), PersonaType.MUSICIAN)
        ));
    }

    @Transactional(readOnly = true)
    public Optional<PublicVenueProfileResponse> findVenue(String id) {
        return venueRepository.findById(id).map(venue -> new PublicVenueProfileResponse(
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
                venue.getPaAvailability(),
                venue.getEquipmentAvailable(),
                venue.getProductionAmenities(),
                venue.getBookingStatus(),
                venue.getBookingMethod(),
                venue.getDesiredArtistDraw(),
                venue.getConnectionGoals(),
                venue.getWebsiteUrl(),
                mediaService.findProfileImage(venue.getId(), PersonaType.VENUE)
        ));
    }

    @Transactional(readOnly = true)
    public Optional<PublicPromoterProfileResponse> findPromoter(String id) {
        return promoterRepository.findById(id).map(promoter -> new PublicPromoterProfileResponse(
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
                promoter.getConnectionGoals(),
                mediaService.findProfileImage(promoter.getId(), PersonaType.PROMOTER)
        ));
    }

}
