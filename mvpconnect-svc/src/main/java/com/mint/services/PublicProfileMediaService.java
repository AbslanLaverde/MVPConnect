package com.mint.services;

import com.mint.config.MediaStorageProperties;
import com.mint.dto.response.profile.PublicProfileMediaResponse;
import com.mint.exceptions.MediaException;
import com.mint.media.storage.ObjectStorageException;
import com.mint.media.storage.ObjectStorageService;
import com.mint.media.storage.PresignedAccess;
import com.mint.nodes.MediaAsset;
import com.mint.media.MediaType;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.CanonicalMediaEntry;
import com.mint.repositories.MediaAssetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

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
        return findCanonicalMedia(ownerId, persona).profileImage();
    }

    @Transactional(readOnly = true)
    public CanonicalMediaBundle findCanonicalMedia(String ownerId, PersonaType persona) {
        List<CanonicalMediaEntry> entries = mediaAssetRepository.findCanonicalMedia(ownerId, persona.name());
        PublicProfileMediaResponse profileImage = latest(entries, MediaType.PROFILE_IMAGE);
        PublicProfileMediaResponse bannerImage = latest(entries, MediaType.BANNER_IMAGE);
        List<PublicProfileMediaResponse> galleryImages = entries.stream()
                .filter(entry -> entry.media().getMediaType() == MediaType.GALLERY_IMAGE)
                .sorted(Comparator
                        .comparingInt((CanonicalMediaEntry entry) -> effectiveSortOrder(entry))
                        .thenComparing(entry -> timestamp(entry.media()))
                        .thenComparing(entry -> entry.media().getId()))
                .map(entry -> toPublicResponse(entry.media()))
                .toList();
        return new CanonicalMediaBundle(profileImage, bannerImage, galleryImages);
    }

    private PublicProfileMediaResponse latest(List<CanonicalMediaEntry> entries, MediaType type) {
        return entries.stream()
                .map(CanonicalMediaEntry::media)
                .filter(media -> media.getMediaType() == type)
                .max(Comparator.comparing(this::timestamp).thenComparing(MediaAsset::getId))
                .map(this::toPublicResponse)
                .orElse(null);
    }

    private int effectiveSortOrder(CanonicalMediaEntry entry) {
        if (entry.relationshipSortOrder() != null) return entry.relationshipSortOrder();
        if (entry.media().getSortOrder() != null) return entry.media().getSortOrder();
        return Integer.MAX_VALUE;
    }

    private LocalDateTime timestamp(MediaAsset media) {
        if (media.getUpdatedAt() != null) return media.getUpdatedAt();
        if (media.getCreatedAt() != null) return media.getCreatedAt();
        return LocalDateTime.MIN;
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

    public record CanonicalMediaBundle(
            PublicProfileMediaResponse profileImage,
            PublicProfileMediaResponse bannerImage,
            List<PublicProfileMediaResponse> galleryImages) {
    }
}
