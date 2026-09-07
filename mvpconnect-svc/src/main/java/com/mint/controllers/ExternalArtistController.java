package com.mint.controllers;

import com.mint.dto.request.CreateFreeFormExternalArtistRequest;
import com.mint.dto.request.ResolveExternalArtistRequest;
import com.mint.dto.response.externalartist.ExternalArtistResponse;
import com.mint.dto.response.externalartist.SpotifyArtistResponse;
import com.mint.services.ExternalArtistService;
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
@RequestMapping("/external-artists")
public class ExternalArtistController {

    private final ExternalArtistService service;

    public ExternalArtistController(ExternalArtistService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public ResponseEntity<List<ExternalArtistResponse>> search(@RequestParam("q") String query) {
        return ResponseEntity.ok(service.searchLocal(query));
    }

    @GetMapping("/search/spotify")
    public ResponseEntity<List<SpotifyArtistResponse>> searchSpotify(
            @RequestParam("q") String query) {
        return ResponseEntity.ok(service.searchSpotify(query));
    }

    @PostMapping("/resolve")
    public ResponseEntity<ExternalArtistResponse> resolve(
            @Valid @RequestBody ResolveExternalArtistRequest request) {
        return ResponseEntity.ok(service.resolveSpotify(request));
    }

    @PostMapping("/free-form")
    public ResponseEntity<ExternalArtistResponse> freeForm(
            @Valid @RequestBody CreateFreeFormExternalArtistRequest request) {
        return ResponseEntity.ok(service.createFreeForm(request));
    }
}
