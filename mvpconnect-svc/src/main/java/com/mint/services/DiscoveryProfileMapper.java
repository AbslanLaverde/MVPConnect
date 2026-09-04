package com.mint.services;

import com.mint.dto.response.discovery.MusicianSearchResultResponse;
import com.mint.dto.response.discovery.VenueMatchResponse;
import com.mint.dto.response.discovery.VenueSearchResultResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Venue;
import com.mint.onboarding.PersonaType;
import org.springframework.stereotype.Component;

@Component
public class DiscoveryProfileMapper {

    private final ProfileLocationMapper locationMapper;
    private final PublicProfileMediaService mediaService;

    public DiscoveryProfileMapper(
            ProfileLocationMapper locationMapper,
            PublicProfileMediaService mediaService) {
        this.locationMapper = locationMapper;
        this.mediaService = mediaService;
    }

    public MusicianSearchResultResponse musicianSearchResult(Musician musician) {
        return new MusicianSearchResultResponse(
                musician.getId(),
                musician.getName(),
                locationMapper.publicLocation(musician),
                musician.getGenres(),
                musician.getVibes(),
                mediaService.findProfileImage(musician.getId(), PersonaType.MUSICIAN)
        );
    }

    public VenueSearchResultResponse venueSearchResult(Venue venue) {
        return new VenueSearchResultResponse(
                venue.getId(),
                venue.getVenueName(),
                locationMapper.publicLocation(venue),
                venue.getCapacity(),
                venue.getGenrePreferences(),
                venue.getAmbience(),
                mediaService.findProfileImage(venue.getId(), PersonaType.VENUE)
        );
    }

    public VenueMatchResponse venueMatch(Venue venue, String matchScore) {
        return new VenueMatchResponse(
                venue.getId(),
                venue.getVenueName(),
                locationMapper.publicLocation(venue),
                venue.getCapacity(),
                venue.getGenrePreferences(),
                venue.getAmbience(),
                venue.getWebsiteUrl(),
                matchScore,
                mediaService.findProfileImage(venue.getId(), PersonaType.VENUE)
        );
    }
}
