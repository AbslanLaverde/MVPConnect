package com.mint.controllers;

import com.mint.dto.request.CreateFreeFormVenueIdentityRequest;
import com.mint.dto.request.ResolveVenueIdentityRequest;
import com.mint.dto.response.venueidentity.GoogleVenueSearchResponse;
import com.mint.dto.response.venueidentity.VenueIdentityResponse;
import com.mint.services.VenueIdentityService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/venue-identities")
public class VenueIdentityController {

    private final VenueIdentityService service;

    public VenueIdentityController(VenueIdentityService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public ResponseEntity<List<VenueIdentityResponse>> search(
            @RequestParam("q") String query) {
        return ResponseEntity.ok(service.searchLocal(query));
    }

    @GetMapping("/search/google")
    public ResponseEntity<List<GoogleVenueSearchResponse>> searchGoogle(
            @RequestParam("q") String query) {
        return ResponseEntity.ok(service.searchGoogle(query));
    }

    @PostMapping("/resolve")
    public ResponseEntity<VenueIdentityResponse> resolve(
            @Valid @RequestBody ResolveVenueIdentityRequest request) {
        return ResponseEntity.ok(service.resolveGoogle(request));
    }

    @PostMapping("/free-form")
    public ResponseEntity<VenueIdentityResponse> freeForm(
            @Valid @RequestBody CreateFreeFormVenueIdentityRequest request) {
        return ResponseEntity.ok(service.createFreeForm(request));
    }
}
