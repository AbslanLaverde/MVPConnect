package com.mint.services;

import com.mint.nodes.MediaAsset;
import com.mint.repositories.MediaAssetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Internal planning primitive for a future guarded media cleanup job.
 * It deliberately performs no deletion: storage must be removed successfully
 * before graph metadata is deleted through the existing media lifecycle.
 */
@Service
public class MediaCleanupService {

    private static final int MAX_BATCH_SIZE = 1_000;

    private final MediaAssetRepository repository;

    public MediaCleanupService(MediaAssetRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<MediaAsset> findStaleCandidates(Duration minimumAge, int requestedLimit) {
        if (minimumAge == null || minimumAge.isNegative() || minimumAge.isZero()) {
            throw new IllegalArgumentException("minimumAge must be positive");
        }
        if (requestedLimit < 1) {
            throw new IllegalArgumentException("requestedLimit must be positive");
        }
        int limit = Math.min(requestedLimit, MAX_BATCH_SIZE);
        return List.copyOf(repository.findCleanupCandidates(
                LocalDateTime.now().minus(minimumAge), limit));
    }
}
