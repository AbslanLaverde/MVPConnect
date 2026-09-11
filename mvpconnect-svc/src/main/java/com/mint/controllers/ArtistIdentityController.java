package com.mint.controllers;

import com.mint.dto.request.SetArtistIdentityRequest;
import com.mint.dto.response.externalartist.ExternalArtistResponse;
import com.mint.services.ArtistIdentityService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/me/artist-identity")
public class ArtistIdentityController {

    private final ArtistIdentityService service;

    public ArtistIdentityController(ArtistIdentityService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ExternalArtistResponse> current() {
        ExternalArtistResponse identity = service.current();
        return identity == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(identity);
    }

    @PutMapping
    public ResponseEntity<ExternalArtistResponse> replace(
            @Valid @RequestBody SetArtistIdentityRequest request) {
        return ResponseEntity.ok(service.replace(request));
    }

    @DeleteMapping
    public ResponseEntity<Void> disconnect() {
        service.disconnect();
        return ResponseEntity.noContent().build();
    }
}
