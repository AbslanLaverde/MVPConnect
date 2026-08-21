package com.mint.controllers;

import com.mint.nodes.Venue;
import com.mint.repositories.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/venues")
public class VenueController {

    @Autowired
    private VenueRepository venueRepository;

    @GetMapping("/{id}")
    public ResponseEntity<?> getVenue(@PathVariable String id) {
        return venueRepository.findById(id)
                .map(v -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("id", v.getId());
                    result.put("venueName", v.getVenueName());
                    result.put("email", v.getEmail());
                    result.put("description", v.getDescription());
                    result.put("location", v.getLocation());
                    result.put("capacity", v.getCapacity());
                    result.put("genrePreferences", v.getGenrePreferences());
                    result.put("ambience", v.getAmbience());
                    result.put("typicalBudget", v.getTypicalBudget());
                    result.put("liveMusic", v.getLiveMusic());
                    result.put("websiteUrl", v.getWebsiteUrl());
                    result.put("bookingEmail", v.getBookingEmail());
                    return ResponseEntity.ok(result);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchVenues(
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

        List<Map<String, Object>> output = results.stream().map(v -> {
            Map<String, Object> o = new HashMap<>();
            o.put("id", v.getId());
            o.put("venueName", v.getVenueName());
            o.put("location", v.getLocation());
            o.put("capacity", v.getCapacity());
            o.put("genrePreferences", v.getGenrePreferences());
            o.put("ambience", v.getAmbience());
            o.put("typicalBudget", v.getTypicalBudget());
            o.put("liveMusic", v.getLiveMusic());
            return o;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(output);
    }
}
