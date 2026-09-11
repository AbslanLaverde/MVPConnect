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
import com.mint.repositories.CanonicalMediaEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

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
        when(mediaAssetRepository.findCanonicalMedia("musician-1", "MUSICIAN"))
                .thenReturn(List.of(new CanonicalMediaEntry(media, null)));
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
        verify(mediaAssetRepository).findCanonicalMedia("musician-1", "MUSICIAN");
    }

    @Test
    void canonicalBundleReturnsBannerAndDeterministicallyOrderedGallery() {
        MediaAsset profile = media("profile", MediaType.PROFILE_IMAGE, null, 1);
        MediaAsset banner = media("banner", MediaType.BANNER_IMAGE, null, 2);
        MediaAsset galleryAssetOrder = media("gallery-asset", MediaType.GALLERY_IMAGE, 2, 3);
        MediaAsset galleryRelationshipOrder = media("gallery-rel", MediaType.GALLERY_IMAGE, 9, 4);
        MediaAsset galleryFallback = media("gallery-fallback", MediaType.GALLERY_IMAGE, null, 5);
        when(mediaAssetRepository.findCanonicalMedia("venue-1", "VENUE")).thenReturn(List.of(
                new CanonicalMediaEntry(galleryFallback, null),
                new CanonicalMediaEntry(banner, null),
                new CanonicalMediaEntry(galleryAssetOrder, null),
                new CanonicalMediaEntry(profile, null),
                new CanonicalMediaEntry(galleryRelationshipOrder, 0)));
        when(objectStorageService.generatePresignedAccess(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.eq(Duration.ofMinutes(15))))
                .thenAnswer(call -> new PresignedAccess(
                        URI.create("https://storage.example/" + ((String) call.getArgument(0)).replace('/', '-')),
                        Instant.now().plusSeconds(900)));

        PublicProfileMediaService.CanonicalMediaBundle bundle =
                service.findCanonicalMedia("venue-1", PersonaType.VENUE);

        assertEquals("profile", bundle.profileImage().mediaId());
        assertEquals("banner", bundle.bannerImage().mediaId());
        assertEquals(List.of("gallery-rel", "gallery-asset", "gallery-fallback"),
                bundle.galleryImages().stream().map(PublicProfileMediaResponse::mediaId).toList());
    }

    private MediaAsset media(String id, MediaType type, Integer sortOrder, int minute) {
        MediaAsset media = new MediaAsset();
        media.setId(id);
        media.setMediaType(type);
        media.setStatus(MediaStatus.READY);
        media.setObjectKey("users/owner/" + id + ".jpg");
        media.setMimeType("image/jpeg");
        media.setSortOrder(sortOrder);
        media.setCreatedAt(LocalDateTime.of(2026, 9, 8, 12, minute));
        media.setUpdatedAt(media.getCreatedAt());
        return media;
    }
}
