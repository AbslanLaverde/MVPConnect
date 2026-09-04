package com.mint.services;

import com.mint.config.MediaStorageProperties;
import com.mint.dto.request.CreateMediaUploadRequest;
import com.mint.dto.response.MediaAssetResponse;
import com.mint.dto.response.MediaUploadResponse;
import com.mint.exceptions.MediaException;
import com.mint.media.MediaContext;
import com.mint.media.MediaStatus;
import com.mint.media.MediaType;
import com.mint.media.storage.ObjectStorageException;
import com.mint.media.storage.ObjectStorageService;
import com.mint.media.storage.PresignedAccess;
import com.mint.media.storage.PresignedUpload;
import com.mint.media.storage.StoredObjectMetadata;
import com.mint.nodes.MediaAsset;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MediaAssetRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.util.unit.DataSize;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaServiceTest {

    @Mock
    private AuthenticatedPersonaProvider authenticatedPersonaProvider;

    @Mock
    private MediaAssetRepository mediaAssetRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    private final AuthenticatedPersona owner =
            new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN);
    private MediaStorageProperties properties;
    private MediaService mediaService;

    @BeforeEach
    void setUp() {
        properties = new MediaStorageProperties();
        properties.setMaxFileSize(DataSize.ofMegabytes(10));
        properties.setUploadUrlExpiration(Duration.ofMinutes(15));
        properties.setAccessUrlExpiration(Duration.ofMinutes(15));
        mediaService = new MediaService(
                authenticatedPersonaProvider,
                mediaAssetRepository,
                objectStorageService,
                properties
        );
    }

    @Test
    void initializationCreatesOwnedPendingAssetWithServerKeyAndPresignedUrl() {
        when(authenticatedPersonaProvider.current()).thenReturn(owner);
        Instant expiration = Instant.now().plusSeconds(900);
        when(objectStorageService.generatePresignedUpload(anyString(), anyString(), any()))
                .thenReturn(new PresignedUpload(
                        URI.create("http://storage/upload"),
                        expiration,
                        Map.of("Content-Type", "image/jpeg")
                ));

        MediaUploadResponse response = mediaService.initializeUpload(validRequest());

        ArgumentCaptor<MediaAsset> assetCaptor = ArgumentCaptor.forClass(MediaAsset.class);
        verify(mediaAssetRepository).save(assetCaptor.capture());
        MediaAsset saved = assetCaptor.getValue();
        assertEquals(owner.userId(), saved.getOwnerId());
        assertEquals(owner.persona(), saved.getOwnerPersona());
        assertEquals(MediaStatus.PENDING, saved.getStatus());
        assertTrue(saved.getObjectKey().matches("users/musician-1/[0-9a-f-]+\\.jpg"));
        assertFalse(saved.getObjectKey().contains("PROFILE_IMAGE"));
        assertEquals(saved.getId(), response.mediaId());
        assertEquals("http://storage/upload", response.uploadUrl());
        assertEquals(expiration, response.expiresAt());
        verify(objectStorageService).generatePresignedUpload(
                saved.getObjectKey(),
                "image/jpeg",
                Duration.ofMinutes(15)
        );
    }

    @Test
    void unsupportedMimeTypeIsRejectedBeforePersistence() {
        when(authenticatedPersonaProvider.current()).thenReturn(owner);

        MediaException exception = assertThrows(
                MediaException.class,
                () -> mediaService.initializeUpload(request("image/svg+xml", 100L))
        );

        assertEquals(MediaException.INVALID_MEDIA_TYPE, exception.getCode());
        verify(mediaAssetRepository, never()).save(any());
    }

    @Test
    void oversizedImageIsRejectedBeforePersistence() {
        when(authenticatedPersonaProvider.current()).thenReturn(owner);

        MediaException exception = assertThrows(
                MediaException.class,
                () -> mediaService.initializeUpload(request("image/jpeg", DataSize.ofMegabytes(10).toBytes() + 1))
        );

        assertEquals(MediaException.MEDIA_TOO_LARGE, exception.getCode());
        verify(mediaAssetRepository, never()).save(any());
    }

    @Test
    void zeroByteImageIsRejectedWithAFileError() {
        when(authenticatedPersonaProvider.current()).thenReturn(owner);

        MediaException exception = assertThrows(
                MediaException.class,
                () -> mediaService.initializeUpload(request("image/jpeg", 0L))
        );

        assertEquals(MediaException.INVALID_MEDIA_FILE, exception.getCode());
        assertEquals("Image size must be greater than zero bytes.", exception.getMessage());
        verify(mediaAssetRepository, never()).save(any());
    }

    @Test
    void completionVerifiesStoredObjectAndMarksPendingAssetReady() {
        MediaAsset asset = asset(MediaType.PROFILE_IMAGE, MediaStatus.PENDING, owner);
        when(authenticatedPersonaProvider.current()).thenReturn(owner);
        when(mediaAssetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(objectStorageService.findObjectMetadata(asset.getObjectKey()))
                .thenReturn(Optional.of(new StoredObjectMetadata(1_843_920L, "image/jpeg")));
        stubAccess(asset);

        MediaAssetResponse response = mediaService.completeUpload(asset.getId());

        verify(objectStorageService).findObjectMetadata(asset.getObjectKey());
        verify(mediaAssetRepository).save(asset);
        assertEquals(MediaStatus.READY, asset.getStatus());
        assertEquals(MediaStatus.READY, response.status());
        assertEquals("http://storage/read", response.url());
    }

    @Test
    void completionIsIdempotentForOwnedReadyAsset() {
        MediaAsset asset = asset(MediaType.PROFILE_IMAGE, MediaStatus.READY, owner);
        when(authenticatedPersonaProvider.current()).thenReturn(owner);
        when(mediaAssetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        stubAccess(asset);

        MediaAssetResponse response = mediaService.completeUpload(asset.getId());

        assertEquals(MediaStatus.READY, response.status());
        verify(objectStorageService, never()).findObjectMetadata(anyString());
        verify(mediaAssetRepository, never()).save(any());
    }

    @Test
    void missingUploadedObjectMarksAssetFailed() {
        MediaAsset asset = asset(MediaType.PROFILE_IMAGE, MediaStatus.PENDING, owner);
        when(authenticatedPersonaProvider.current()).thenReturn(owner);
        when(mediaAssetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(objectStorageService.findObjectMetadata(asset.getObjectKey())).thenReturn(Optional.empty());

        MediaException exception = assertThrows(
                MediaException.class,
                () -> mediaService.completeUpload(asset.getId())
        );

        assertEquals(MediaException.MEDIA_UPLOAD_NOT_FOUND, exception.getCode());
        assertEquals(MediaStatus.FAILED, asset.getStatus());
        verify(mediaAssetRepository).save(asset);
    }

    @Test
    void anotherUserCannotCompleteAsset() {
        AuthenticatedPersona anotherUser =
                new AuthenticatedPersona("musician-2", PersonaType.MUSICIAN);
        MediaAsset asset = asset(MediaType.PROFILE_IMAGE, MediaStatus.PENDING, owner);
        when(authenticatedPersonaProvider.current()).thenReturn(anotherUser);
        when(mediaAssetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        MediaException exception = assertThrows(
                MediaException.class,
                () -> mediaService.completeUpload(asset.getId())
        );

        assertEquals(MediaException.MEDIA_NOT_OWNED, exception.getCode());
        verify(objectStorageService, never()).findObjectMetadata(anyString());
    }

    @Test
    void anotherUserCannotDeleteAsset() {
        AuthenticatedPersona anotherUser =
                new AuthenticatedPersona("venue-1", PersonaType.VENUE);
        MediaAsset asset = asset(MediaType.PROFILE_IMAGE, MediaStatus.READY, owner);
        when(authenticatedPersonaProvider.current()).thenReturn(anotherUser);
        when(mediaAssetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        MediaException exception = assertThrows(
                MediaException.class,
                () -> mediaService.deleteOwnedMedia(asset.getId())
        );

        assertEquals(MediaException.MEDIA_NOT_OWNED, exception.getCode());
        verify(objectStorageService, never()).deleteObject(anyString());
    }

    @Test
    void deleteRemovesOwnedObjectAndAssetRelationships() {
        MediaAsset asset = asset(MediaType.GALLERY_IMAGE, MediaStatus.READY, owner);
        when(authenticatedPersonaProvider.current()).thenReturn(owner);
        when(mediaAssetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        mediaService.deleteOwnedMedia(asset.getId());

        verify(objectStorageService).deleteObject(asset.getObjectKey());
        verify(mediaAssetRepository).deleteWithOnboardingRelationships(asset.getId());
    }

    @Test
    void ownedReadyProfileImageCanBeValidated() {
        MediaAsset asset = asset(MediaType.PROFILE_IMAGE, MediaStatus.READY, owner);
        when(mediaAssetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        MediaAsset validated = mediaService.validateOwnedReadyMedia(
                owner,
                asset.getId(),
                MediaType.PROFILE_IMAGE
        );

        assertSame(asset, validated);
    }

    @Test
    void profileImageValidationRejectsBannerImage() {
        MediaAsset asset = asset(MediaType.BANNER_IMAGE, MediaStatus.READY, owner);
        when(mediaAssetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        MediaException exception = assertThrows(
                MediaException.class,
                () -> mediaService.validateOwnedReadyMedia(
                        owner,
                        asset.getId(),
                        MediaType.PROFILE_IMAGE
                )
        );

        assertEquals(MediaException.INVALID_MEDIA_TYPE, exception.getCode());
    }

    @Test
    void validationRejectsPendingMedia() {
        MediaAsset asset = asset(MediaType.PROFILE_IMAGE, MediaStatus.PENDING, owner);
        when(mediaAssetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        MediaException exception = assertThrows(
                MediaException.class,
                () -> mediaService.validateOwnedReadyMedia(owner, asset.getId())
        );

        assertEquals(MediaException.MEDIA_NOT_READY, exception.getCode());
    }

    @Test
    void storageFailuresReturnSafeMediaErrorAndMarkInitializationFailed() {
        when(authenticatedPersonaProvider.current()).thenReturn(owner);
        when(objectStorageService.generatePresignedUpload(anyString(), anyString(), any()))
                .thenThrow(new ObjectStorageException("secret provider detail", new RuntimeException()));

        MediaException exception = assertThrows(
                MediaException.class,
                () -> mediaService.initializeUpload(validRequest())
        );

        assertEquals(MediaException.MEDIA_STORAGE_ERROR, exception.getCode());
        assertFalse(exception.getMessage().contains("secret provider detail"));
        ArgumentCaptor<MediaAsset> captor = ArgumentCaptor.forClass(MediaAsset.class);
        verify(mediaAssetRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        assertEquals(MediaStatus.FAILED, captor.getAllValues().getLast().getStatus());
    }

    private CreateMediaUploadRequest validRequest() {
        return request("image/jpeg", 1_843_920L);
    }

    private CreateMediaUploadRequest request(String mimeType, long sizeBytes) {
        return new CreateMediaUploadRequest(
                "PROFILE_IMAGE",
                "PROFILE",
                "band-photo.jpg",
                mimeType,
                sizeBytes,
                1600,
                2000,
                null
        );
    }

    private MediaAsset asset(
            MediaType mediaType,
            MediaStatus status,
            AuthenticatedPersona assetOwner) {
        MediaAsset asset = new MediaAsset();
        asset.setId("media-1");
        asset.setOwnerId(assetOwner.userId());
        asset.setOwnerPersona(assetOwner.persona());
        asset.setMediaType(mediaType);
        asset.setMediaContext(MediaContext.PROFILE);
        asset.setObjectKey("users/" + assetOwner.userId() + "/media-1.jpg");
        asset.setOriginalFileName("band-photo.jpg");
        asset.setMimeType("image/jpeg");
        asset.setSizeBytes(1_843_920L);
        asset.setWidth(1600);
        asset.setHeight(2000);
        asset.setStatus(status);
        asset.setCreatedAt(LocalDateTime.now());
        asset.setUpdatedAt(LocalDateTime.now());
        return asset;
    }

    private void stubAccess(MediaAsset asset) {
        when(objectStorageService.generatePresignedAccess(
                asset.getObjectKey(),
                Duration.ofMinutes(15)
        )).thenReturn(new PresignedAccess(
                URI.create("http://storage/read"),
                Instant.now().plusSeconds(900)
        ));
    }
}
