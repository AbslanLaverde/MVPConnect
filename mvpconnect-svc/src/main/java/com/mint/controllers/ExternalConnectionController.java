package com.mint.controllers;

import com.mint.dto.request.UpsertUrlExternalConnectionRequest;
import com.mint.dto.response.externalconnection.SelfExternalConnectionResponse;
import com.mint.externalconnection.ExternalProvider;
import com.mint.services.ExternalConnectionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/external-connections")
public class ExternalConnectionController {

    private final ExternalConnectionService service;

    public ExternalConnectionController(ExternalConnectionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<SelfExternalConnectionResponse>> current() {
        return ResponseEntity.ok(service.currentConnections());
    }

    @PutMapping("/url")
    public ResponseEntity<SelfExternalConnectionResponse> upsertUrl(
            @Valid @RequestBody UpsertUrlExternalConnectionRequest request) {
        return ResponseEntity.ok(service.upsertUrl(request));
    }

    @DeleteMapping("/{provider}")
    public ResponseEntity<Void> disconnect(@PathVariable ExternalProvider provider) {
        service.disconnect(provider);
        return ResponseEntity.noContent().build();
    }
}
