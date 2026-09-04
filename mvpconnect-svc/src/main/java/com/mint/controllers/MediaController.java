package com.mint.controllers;

import com.mint.dto.request.CreateMediaUploadRequest;
import com.mint.dto.response.MediaAssetResponse;
import com.mint.dto.response.MediaUploadResponse;
import com.mint.services.MediaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/media")
public class MediaController {

    private final MediaService mediaService;

    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @PostMapping("/uploads")
    public ResponseEntity<MediaUploadResponse> initializeUpload(
            @Valid @RequestBody CreateMediaUploadRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mediaService.initializeUpload(request));
    }

    @PostMapping("/{mediaId}/complete")
    public ResponseEntity<MediaAssetResponse> completeUpload(@PathVariable String mediaId) {
        return ResponseEntity.ok(mediaService.completeUpload(mediaId));
    }

    @GetMapping("/{mediaId}")
    public ResponseEntity<MediaAssetResponse> getMedia(@PathVariable String mediaId) {
        return ResponseEntity.ok(mediaService.getOwnedMedia(mediaId));
    }

    @DeleteMapping("/{mediaId}")
    public ResponseEntity<Void> deleteMedia(@PathVariable String mediaId) {
        mediaService.deleteOwnedMedia(mediaId);
        return ResponseEntity.noContent().build();
    }
}
