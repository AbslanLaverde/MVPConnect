package com.mint.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mint.config.MediaStorageProperties;
import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.media.MediaStatus;
import com.mint.media.MediaType;
import com.mint.media.storage.ObjectStorageService;
import com.mint.media.storage.PresignedAccess;
import com.mint.nodes.MediaAsset;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MediaAssetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicProfileMediaServiceTest {

    @Mock
    private MediaAssetRepository mediaAssetRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private PublicProfileMediaService service;

    @BeforeEach
    void setUp() {
        MediaStorageProperties properties = new MediaStorageProperties();
        properties.setAccessUrlExpiration(Duration.ofMinutes(15));
        service = new PublicProfileMediaService(
                mediaAssetRepository,
                objectStorageService,
                properties
        );
    }

    @Test
    void canonicalRelationshipProducesAnIsolatedPublicRepresentation() {
        MediaAsset media = new MediaAsset();
        media.setId("media-1");
        media.setMediaType(MediaType.PROFILE_IMAGE);
        media.setStatus(MediaStatus.READY);
        media.setObjectKey("users/musician-1/media-1.jpg");
        media.setMimeType("image/jpeg");
        media.setWidth(600);
        media.setHeight(300);
        when(mediaAssetRepository.findCanonicalProfileMedia("musician-1", "MUSICIAN"))
                .thenReturn(Optional.of(media));
        when(objectStorageService.generatePresignedAccess(
                media.getObjectKey(),
                Duration.ofMinutes(15)
        )).thenReturn(new PresignedAccess(
                URI.create("https://storage.example/read"),
                Instant.now().plusSeconds(900)
        ));

        PublicProfileMediaResponse response = service.findProfileImage(
                "musician-1",
                PersonaType.MUSICIAN
        );
        JsonNode json = objectMapper.valueToTree(response);

        assertEquals("media-1", response.mediaId());
        assertEquals("https://storage.example/read", response.url());
        assertFalse(json.has("objectKey"));
        assertFalse(json.has("ownerId"));
        assertFalse(json.has("bucket"));
        verify(mediaAssetRepository).findCanonicalProfileMedia("musician-1", "MUSICIAN");
    }
}
