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
import com.mint.repositories.MediaAssetRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class MediaService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MediaService.class);

    private static final Map<String, String> EXTENSION_BY_MIME_TYPE = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private final AuthenticatedPersonaProvider authenticatedPersonaProvider;
    private final MediaAssetRepository mediaAssetRepository;
    private final ObjectStorageService objectStorageService;
    private final MediaStorageProperties storageProperties;

    public MediaService(
            AuthenticatedPersonaProvider authenticatedPersonaProvider,
            MediaAssetRepository mediaAssetRepository,
            ObjectStorageService objectStorageService,
            MediaStorageProperties storageProperties) {
        this.authenticatedPersonaProvider = authenticatedPersonaProvider;
        this.mediaAssetRepository = mediaAssetRepository;
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
    }

    @Transactional(noRollbackFor = MediaException.class)
    public MediaUploadResponse initializeUpload(CreateMediaUploadRequest request) {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        MediaType mediaType = parseMediaType(request.mediaType());
        MediaContext mediaContext = parseMediaContext(request.mediaContext());
        String mimeType = normalizeAndValidateMimeType(request.mimeType());
        validateFileSize(request.sizeBytes());
        String originalFileName = normalizeFileName(request.fileName());

        LocalDateTime now = LocalDateTime.now();
        MediaAsset asset = new MediaAsset();
        asset.setId(UUID.randomUUID().toString());
        asset.setOwnerId(owner.userId());
        asset.setOwnerPersona(owner.persona());
        asset.setMediaType(mediaType);
        asset.setMediaContext(mediaContext);
        asset.setOriginalFileName(originalFileName);
        asset.setMimeType(mimeType);
        asset.setSizeBytes(request.sizeBytes());
        asset.setWidth(request.width());
        asset.setHeight(request.height());
        asset.setSortOrder(request.sortOrder());
        asset.setStatus(MediaStatus.PENDING);
        asset.setObjectKey(objectKey(owner.userId(), asset.getId(), mimeType));
        asset.setCreatedAt(now);
        asset.setUpdatedAt(now);
        mediaAssetRepository.save(asset);

        try {
            PresignedUpload upload = objectStorageService.generatePresignedUpload(
                    asset.getObjectKey(),
                    mimeType,
                    storageProperties.getUploadUrlExpiration()
            );
            return new MediaUploadResponse(
                    asset.getId(),
                    asset.getStatus(),
                    upload.url().toString(),
                    upload.expiresAt(),
                    upload.requiredHeaders()
            );
        } catch (ObjectStorageException exception) {
            markFailed(asset);
            throw MediaException.storageError();
        }
    }

    @Transactional(noRollbackFor = MediaException.class)
    public MediaAssetResponse completeUpload(String mediaId) {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        MediaAsset asset = requireOwnedMedia(owner, mediaId);
        if (asset.getStatus() == MediaStatus.READY) {
            return toResponse(asset);
        }

        Optional<StoredObjectMetadata> storedObject;
        try {
            storedObject = objectStorageService.findObjectMetadata(asset.getObjectKey());
        } catch (ObjectStorageException exception) {
            markFailed(asset);
            throw MediaException.storageError();
        }
        if (storedObject.isEmpty()) {
            markFailed(asset);
            throw MediaException.uploadNotFound();
        }

        StoredObjectMetadata metadata = storedObject.orElseThrow();
        String storedMimeType;
        try {
            storedMimeType = normalizeAndValidateMimeType(metadata.contentType());
        } catch (MediaException exception) {
            markFailed(asset);
            throw MediaException.uploadMismatch();
        }
        if (metadata.contentLength() <= 0
                || metadata.contentLength() > storageProperties.getMaxFileSize().toBytes()
                || metadata.contentLength() != asset.getSizeBytes()
                || !storedMimeType.equals(asset.getMimeType())) {
            markFailed(asset);
            throw MediaException.uploadMismatch();
        }

        asset.setMimeType(storedMimeType);
        asset.setSizeBytes(metadata.contentLength());
        asset.setStatus(MediaStatus.READY);
        asset.setUpdatedAt(LocalDateTime.now());
        mediaAssetRepository.save(asset);
        return toResponse(asset);
    }

    @Transactional(readOnly = true)
    public MediaAssetResponse getOwnedMedia(String mediaId) {
        return toResponse(requireOwnedMedia(authenticatedPersonaProvider.current(), mediaId));
    }

    @Transactional
    public void deleteOwnedMedia(String mediaId) {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        MediaAsset asset = requireOwnedMedia(owner, mediaId);
        try {
            objectStorageService.deleteObject(asset.getObjectKey());
        } catch (ObjectStorageException exception) {
            throw MediaException.storageError();
        }
        try {
            mediaAssetRepository.deleteWithOnboardingRelationships(asset.getId());
        } catch (RuntimeException exception) {
            LOGGER.error(
                    "Media object was deleted but Neo4j cleanup failed for media asset {}. "
                            + "A retry is safe because object deletion is idempotent.",
                    asset.getId(),
                    exception
            );
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public MediaAsset validateOwnedReadyMedia(
            AuthenticatedPersona owner,
            String mediaId,
            MediaType expectedMediaType) {
        MediaAsset asset = requireOwnedMedia(owner, mediaId);
        if (asset.getStatus() != MediaStatus.READY) {
            throw MediaException.notReady();
        }
        if (expectedMediaType != null && asset.getMediaType() != expectedMediaType) {
            throw MediaException.wrongType(expectedMediaType.name());
        }
        return asset;
    }

    @Transactional(readOnly = true)
    public MediaAsset validateOwnedReadyMedia(AuthenticatedPersona owner, String mediaId) {
        return validateOwnedReadyMedia(owner, mediaId, null);
    }

    private MediaAsset requireOwnedMedia(AuthenticatedPersona owner, String mediaId) {
        MediaAsset asset = mediaAssetRepository.findById(mediaId)
                .orElseThrow(MediaException::notFound);
        if (!owner.userId().equals(asset.getOwnerId()) || owner.persona() != asset.getOwnerPersona()) {
            throw MediaException.notOwned();
        }
        return asset;
    }

    private MediaAssetResponse toResponse(MediaAsset asset) {
        PresignedAccess access = null;
        if (asset.getStatus() == MediaStatus.READY) {
            try {
                access = objectStorageService.generatePresignedAccess(
                        asset.getObjectKey(),
                        storageProperties.getAccessUrlExpiration()
                );
            } catch (ObjectStorageException exception) {
                throw MediaException.storageError();
            }
        }
        return new MediaAssetResponse(
                asset.getId(),
                asset.getMediaType(),
                asset.getMediaContext(),
                asset.getOriginalFileName(),
                asset.getMimeType(),
                asset.getSizeBytes(),
                asset.getWidth(),
                asset.getHeight(),
                asset.getSortOrder(),
                asset.getStatus(),
                access == null ? null : access.url().toString(),
                access == null ? null : access.expiresAt(),
                asset.getCreatedAt(),
                asset.getUpdatedAt()
        );
    }

    private MediaType parseMediaType(String value) {
        try {
            return MediaType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (RuntimeException exception) {
            throw MediaException.invalidMediaType();
        }
    }

    private MediaContext parseMediaContext(String value) {
        try {
            return MediaContext.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (RuntimeException exception) {
            throw MediaException.invalidMediaContext();
        }
    }

    private String normalizeAndValidateMimeType(String value) {
        if (value == null) throw MediaException.invalidImageMimeType();
        String normalized = value.strip().toLowerCase(Locale.ROOT);
        if (!EXTENSION_BY_MIME_TYPE.containsKey(normalized)) {
            throw MediaException.invalidImageMimeType();
        }
        return normalized;
    }

    private void validateFileSize(Long sizeBytes) {
        if (sizeBytes == null || sizeBytes <= 0) {
            throw MediaException.invalidFileSize();
        }
        if (sizeBytes > storageProperties.getMaxFileSize().toBytes()) {
            throw MediaException.tooLarge(storageProperties.getMaxFileSize().toBytes());
        }
    }

    private String normalizeFileName(String value) {
        if (value == null) throw MediaException.invalidFileName();
        String normalized = value.replace('\\', '/').strip();
        int finalSeparator = normalized.lastIndexOf('/');
        if (finalSeparator >= 0) normalized = normalized.substring(finalSeparator + 1);
        if (normalized.isBlank()) throw MediaException.invalidFileName();
        return normalized.length() > 255 ? normalized.substring(normalized.length() - 255) : normalized;
    }

    private String objectKey(String ownerId, String mediaId, String mimeType) {
        return "users/" + ownerId + "/" + mediaId + "." + EXTENSION_BY_MIME_TYPE.get(mimeType);
    }

    private void markFailed(MediaAsset asset) {
        asset.setStatus(MediaStatus.FAILED);
        asset.setUpdatedAt(LocalDateTime.now());
        mediaAssetRepository.save(asset);
    }
}
