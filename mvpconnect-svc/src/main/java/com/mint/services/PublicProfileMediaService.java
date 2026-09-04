package com.mint.services;

import com.mint.config.MediaStorageProperties;
import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.exceptions.MediaException;
import com.mint.media.storage.ObjectStorageException;
import com.mint.media.storage.ObjectStorageService;
import com.mint.media.storage.PresignedAccess;
import com.mint.nodes.MediaAsset;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MediaAssetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicProfileMediaService {

    private final MediaAssetRepository mediaAssetRepository;
    private final ObjectStorageService objectStorageService;
    private final MediaStorageProperties storageProperties;

    public PublicProfileMediaService(
            MediaAssetRepository mediaAssetRepository,
            ObjectStorageService objectStorageService,
            MediaStorageProperties storageProperties) {
        this.mediaAssetRepository = mediaAssetRepository;
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
    }

    @Transactional(readOnly = true)
    public PublicProfileMediaResponse findProfileImage(String ownerId, PersonaType persona) {
        return mediaAssetRepository.findCanonicalProfileMedia(ownerId, persona.name())
                .map(this::toPublicResponse)
                .orElse(null);
    }

    private PublicProfileMediaResponse toPublicResponse(MediaAsset media) {
        PresignedAccess access;
        try {
            access = objectStorageService.generatePresignedAccess(
                    media.getObjectKey(),
                    storageProperties.getAccessUrlExpiration()
            );
        } catch (ObjectStorageException exception) {
            throw MediaException.storageError();
        }
        return new PublicProfileMediaResponse(
                media.getId(),
                access.url().toString(),
                media.getMimeType(),
                media.getWidth(),
                media.getHeight()
        );
    }
}
