package com.mint.controllers;

import com.mint.nodes.Musician;
import com.mint.nodes.Venue;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/musicians")
public class MusicianController {

    @Autowired
    private MusicianRepository musicianRepository;

    @Autowired
    private VenueRepository venueRepository;

    @GetMapping("/{id}")
    public ResponseEntity<?> getMusician(@PathVariable String id) {
        return musicianRepository.findById(id)
                .map(m -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("id", m.getId());
                    result.put("name", m.getName());
                    result.put("email", m.getEmail());
                    result.put("bio", m.getBio());
                    result.put("location", m.getLocation());
                    result.put("profileImageUrl", m.getProfileImageUrl());
                    result.put("genres", m.getGenres());
                    result.put("vibes", m.getVibes());
                    result.put("minimumFee", m.getMinimumFee());
                    result.put("willingToTravel", m.getWillingToTravel());
                    result.put("websiteUrl", m.getWebsiteUrl());
                    result.put("instagramHandle", m.getInstagramHandle());
                    return ResponseEntity.ok(result);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/matches")
    public ResponseEntity<?> getVenueMatches(@PathVariable String id) {
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

        List<Map<String, Object>> matches = new ArrayList<>();
        for (Venue venue : venueRepository.findAll()) {
            if (!Boolean.TRUE.equals(venue.getLiveMusic())) continue;

            List<String> venuePrefs = venue.getGenrePreferences();
            if (venuePrefs == null) continue;

            long matchCount = venuePrefs.stream()
                    .filter(p -> lowerGenres.contains(p.toLowerCase()))
                    .count();

            if (matchCount > 0) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", venue.getId());
                m.put("venueName", venue.getVenueName());
                m.put("location", venue.getLocation());
                m.put("capacity", venue.getCapacity());
                m.put("genrePreferences", venue.getGenrePreferences());
                m.put("ambience", venue.getAmbience());
                m.put("typicalBudget", venue.getTypicalBudget());
                m.put("websiteUrl", venue.getWebsiteUrl());
                m.put("matchScore", matchCount + "/" + venuePrefs.size() + " genres matched");
                matches.add(m);
            }
        }

        matches.sort((a, b) -> {
            int scoreA = Integer.parseInt(a.get("matchScore").toString().split("/")[0]);
            int scoreB = Integer.parseInt(b.get("matchScore").toString().split("/")[0]);
            return Integer.compare(scoreB, scoreA);
        });

        return ResponseEntity.ok(matches);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMusician(@PathVariable String id, @RequestBody Map<String, Object> updates) {
        return musicianRepository.findById(id)
                .map(m -> {
                    if (updates.containsKey("bio")) m.setBio((String) updates.get("bio"));
                    if (updates.containsKey("location")) m.setLocation((String) updates.get("location"));
                    if (updates.containsKey("genres")) m.setGenres((List<String>) updates.get("genres"));
                    if (updates.containsKey("vibes")) m.setVibes((List<String>) updates.get("vibes"));
                    if (updates.containsKey("minimumFee")) m.setMinimumFee((String) updates.get("minimumFee"));
                    if (updates.containsKey("willingToTravel")) m.setWillingToTravel((Boolean) updates.get("willingToTravel"));
                    if (updates.containsKey("websiteUrl")) m.setWebsiteUrl((String) updates.get("websiteUrl"));
                    if (updates.containsKey("instagramHandle")) m.setInstagramHandle((String) updates.get("instagramHandle"));
                    m.setUpdatedAt(LocalDateTime.now());
                    musicianRepository.save(m);
                    return ResponseEntity.ok(Map.of("status", "updated"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchMusicians(
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

        List<Map<String, Object>> output = results.stream().map(m -> {
            Map<String, Object> o = new HashMap<>();
            o.put("id", m.getId());
            o.put("name", m.getName());
            o.put("location", m.getLocation());
            o.put("genres", m.getGenres());
            o.put("vibes", m.getVibes());
            o.put("minimumFee", m.getMinimumFee());
            o.put("willingToTravel", m.getWillingToTravel());
            return o;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(output);
    }
}
