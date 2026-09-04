package com.mint.media.storage;

import java.time.Duration;
import java.util.Optional;

public interface ObjectStorageService {

    PresignedUpload generatePresignedUpload(
            String objectKey,
            String contentType,
            Duration expiration);

    PresignedAccess generatePresignedAccess(String objectKey, Duration expiration);

    Optional<StoredObjectMetadata> findObjectMetadata(String objectKey);

    void deleteObject(String objectKey);
}
