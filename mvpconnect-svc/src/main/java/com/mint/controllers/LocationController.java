package com.mint.controllers;

import com.mint.dto.response.location.LocationSuggestionResponse;
import com.mint.dto.response.location.ResolvedLocationResponse;
import com.mint.services.GooglePlacesService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/locations")
public class LocationController {

    private final GooglePlacesService googlePlacesService;

    public LocationController(GooglePlacesService googlePlacesService) {
        this.googlePlacesService = googlePlacesService;
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<LocationSuggestionResponse>> suggestions(
            @RequestParam String query,
            @RequestParam(defaultValue = "CITY") String mode) {
        return ResponseEntity.ok(googlePlacesService.suggest(query, mode));
    }

    @GetMapping("/place")
    public ResponseEntity<ResolvedLocationResponse> place(@RequestParam String placeId) {
        return ResponseEntity.ok(googlePlacesService.resolve(placeId));
    }
}
