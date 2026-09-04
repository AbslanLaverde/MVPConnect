package com.mint.controllers;

import com.mint.dto.request.UpdateMusicianProfileRequest;
import com.mint.dto.response.discovery.MusicianSearchResultResponse;
import com.mint.dto.response.discovery.VenueMatchResponse;
import com.mint.dto.response.profile.PublicMusicianProfileResponse;
import com.mint.nodes.Musician;
import com.mint.nodes.Venue;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.PersonaAuthorizationService;
import com.mint.services.DiscoveryProfileMapper;
import com.mint.services.PublicProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/musicians")
public class MusicianController {

    private final MusicianRepository musicianRepository;
    private final VenueRepository venueRepository;
    private final PublicProfileService publicProfileService;
    private final PersonaAuthorizationService personaAuthorizationService;
    private final DiscoveryProfileMapper discoveryProfileMapper;

    public MusicianController(
            MusicianRepository musicianRepository,
            VenueRepository venueRepository,
            PublicProfileService publicProfileService,
            PersonaAuthorizationService personaAuthorizationService,
            DiscoveryProfileMapper discoveryProfileMapper) {
        this.musicianRepository = musicianRepository;
        this.venueRepository = venueRepository;
        this.publicProfileService = publicProfileService;
        this.personaAuthorizationService = personaAuthorizationService;
        this.discoveryProfileMapper = discoveryProfileMapper;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PublicMusicianProfileResponse> getMusician(@PathVariable String id) {
        return publicProfileService.findMusician(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/matches")
    public ResponseEntity<List<VenueMatchResponse>> getVenueMatches(@PathVariable String id) {
        Optional<Musician> optMusician = musicianRepository.findById(id);
        if (optMusician.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Musician musician = optMusician.get();
        List<String> musicianGenres = musician.getGenres();
        if (musicianGenres == null || musicianGenres.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        Set<String> lowerGenres = musicianGenres.stream()
                .map(String::toLowerCase)
                .collect(Collectors.toSet());

        List<ScoredVenueMatch> matches = new ArrayList<>();
        for (Venue venue : venueRepository.findAll()) {
            if (!Boolean.TRUE.equals(venue.getLiveMusic())) continue;

            List<String> venuePrefs = venue.getGenrePreferences();
            if (venuePrefs == null) continue;

            long matchCount = venuePrefs.stream()
                    .filter(p -> lowerGenres.contains(p.toLowerCase()))
                    .count();

            if (matchCount > 0) {
                matches.add(new ScoredVenueMatch(
                        matchCount,
                        discoveryProfileMapper.venueMatch(
                                venue,
                                matchCount + "/" + venuePrefs.size() + " genres matched"
                        )
                ));
            }
        }

        matches.sort(Comparator.comparingLong(ScoredVenueMatch::score).reversed());

        return ResponseEntity.ok(matches.stream().map(ScoredVenueMatch::response).toList());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, String>> updateMusician(
            @PathVariable String id,
            @Valid @RequestBody UpdateMusicianProfileRequest updates) {
        personaAuthorizationService.requireOwner(PersonaType.MUSICIAN, id);
        return musicianRepository.findById(id)
                .map(m -> {
                    if (updates.hasBio()) m.setBio(updates.getBio());
                    if (updates.hasLocation()) m.setLocation(updates.getLocation());
                    if (updates.hasGenres()) m.setGenres(updates.getGenres());
                    if (updates.hasVibes()) m.setVibes(updates.getVibes());
                    if (updates.hasMinimumFee()) m.setMinimumFee(updates.getMinimumFee());
                    if (updates.hasWillingToTravel()) m.setWillingToTravel(updates.getWillingToTravel());
                    if (updates.hasWebsiteUrl()) m.setWebsiteUrl(updates.getWebsiteUrl());
                    if (updates.hasInstagramHandle()) m.setInstagramHandle(updates.getInstagramHandle());
                    m.setUpdatedAt(LocalDateTime.now());
                    musicianRepository.save(m);
                    return ResponseEntity.ok(Map.of("status", "updated"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<List<MusicianSearchResultResponse>> searchMusicians(
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String location) {

        List<Musician> results;
        if (genre != null && !genre.isBlank() && location != null && !location.isBlank()) {
            results = musicianRepository.findByGenreAndLocation(genre, location);
        } else if (genre != null && !genre.isBlank()) {
            results = musicianRepository.findByGenreContaining(genre);
        } else if (location != null && !location.isBlank()) {
            results = musicianRepository.findByLocationContaining(location);
        } else {
            results = musicianRepository.findAll();
        }

        List<MusicianSearchResultResponse> output = results.stream()
                .map(discoveryProfileMapper::musicianSearchResult)
                .toList();

        return ResponseEntity.ok(output);
    }

    private record ScoredVenueMatch(long score, VenueMatchResponse response) {
    }
}
