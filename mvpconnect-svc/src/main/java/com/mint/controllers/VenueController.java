package com.mint.controllers;

import com.mint.dto.response.discovery.VenueSearchResultResponse;
import com.mint.dto.response.profile.PublicVenueProfileResponse;
import com.mint.nodes.Venue;
import com.mint.repositories.VenueRepository;
import com.mint.services.DiscoveryProfileMapper;
import com.mint.services.PublicProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/venues")
public class VenueController {

    private final VenueRepository venueRepository;
    private final PublicProfileService publicProfileService;
    private final DiscoveryProfileMapper discoveryProfileMapper;

    public VenueController(
            VenueRepository venueRepository,
            PublicProfileService publicProfileService,
            DiscoveryProfileMapper discoveryProfileMapper) {
        this.venueRepository = venueRepository;
        this.publicProfileService = publicProfileService;
        this.discoveryProfileMapper = discoveryProfileMapper;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PublicVenueProfileResponse> getVenue(@PathVariable String id) {
        return publicProfileService.findVenue(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<List<VenueSearchResultResponse>> searchVenues(
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false, defaultValue = "false") Boolean liveMusic) {

        List<Venue> results;
        if (genre != null && !genre.isBlank()) {
            results = venueRepository.findByGenrePreferenceContaining(genre);
            if (location != null && !location.isBlank()) {
                results = results.stream()
                        .filter(v -> v.getLocation() != null && v.getLocation().toLowerCase().contains(location.toLowerCase()))
                        .collect(Collectors.toList());
            }
        } else if (location != null && !location.isBlank()) {
            results = venueRepository.findByLocationContaining(location);
        } else if (liveMusic && minCapacity != null) {
            results = venueRepository.findByLiveMusicAndCapacity(minCapacity.longValue());
        } else {
            results = venueRepository.findAll();
        }

        if (liveMusic) {
            results = results.stream().filter(v -> Boolean.TRUE.equals(v.getLiveMusic())).collect(Collectors.toList());
        }
        if (minCapacity != null) {
            results = results.stream().filter(v -> v.getCapacity() != null && v.getCapacity() >= minCapacity).collect(Collectors.toList());
        }

        List<VenueSearchResultResponse> output = results.stream()
                .map(discoveryProfileMapper::venueSearchResult)
                .toList();

        return ResponseEntity.ok(output);
    }
}
