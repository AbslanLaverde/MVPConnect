package com.mint.controllers;

import com.mint.dto.response.profile.PublicPromoterProfileResponse;
import com.mint.services.PublicProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/promoters")
public class PromoterController {

    private final PublicProfileService publicProfileService;

    public PromoterController(PublicProfileService publicProfileService) {
        this.publicProfileService = publicProfileService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PublicPromoterProfileResponse> getPromoter(@PathVariable String id) {
        return publicProfileService.findPromoter(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
