package com.mint.controllers;

import com.mint.dto.request.OAuthConnectionStartRequest;
import com.mint.dto.response.externalconnection.OAuthConnectionAttemptResponse;
import com.mint.dto.response.externalconnection.OAuthConnectionStartResponse;
import com.mint.externalconnection.ExternalProvider;
import com.mint.services.OAuthConnectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/external-connections/oauth")
public class ExternalOAuthController {

    private final OAuthConnectionService service;

    public ExternalOAuthController(OAuthConnectionService service) {
        this.service = service;
    }

    @PostMapping("/{provider}/start")
    public ResponseEntity<OAuthConnectionStartResponse> start(
            @PathVariable ExternalProvider provider,
            @Valid @RequestBody OAuthConnectionStartRequest request) {
        return ResponseEntity.ok(service.start(provider, request));
    }

    @GetMapping("/attempts/{attemptId}")
    public ResponseEntity<OAuthConnectionAttemptResponse> status(@PathVariable String attemptId) {
        return ResponseEntity.ok(service.status(attemptId));
    }

    @GetMapping("/youtube/callback")
    public ResponseEntity<Void> youtubeCallback(
            @RequestParam String state,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error) {
        return redirect(service.callback(ExternalProvider.YOUTUBE, state, code, error));
    }

    @GetMapping("/soundcloud/callback")
    public ResponseEntity<Void> soundCloudCallback(
            @RequestParam String state,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error) {
        return redirect(service.callback(ExternalProvider.SOUNDCLOUD, state, code, error));
    }

    private ResponseEntity<Void> redirect(URI location) {
        return ResponseEntity.status(HttpStatus.FOUND).location(location).build();
    }
}
