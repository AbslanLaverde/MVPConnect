package com.mint.media.storage;

import com.mint.config.MediaStorageProperties;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Service
public class S3ObjectStorageService implements ObjectStorageService {

    private final S3Client s3Client;
    private final S3Presigner presigner;
    private final MediaStorageProperties properties;

    public S3ObjectStorageService(
            S3Client s3Client,
            S3Presigner presigner,
            MediaStorageProperties properties) {
        this.s3Client = s3Client;
        this.presigner = presigner;
        this.properties = properties;
    }

    @Override
    public void checkAvailability() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder()
                    .bucket(properties.getBucket())
                    .build());
        } catch (SdkException exception) {
            throw new ObjectStorageException("Object storage is unavailable.", exception);
        }
    }

    @Override
    public PresignedUpload generatePresignedUpload(
            String objectKey,
            String contentType,
            Duration expiration) {
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(properties.getBucket())
                    .key(objectKey)
                    .contentType(contentType)
                    .build();
            PresignedPutObjectRequest presigned = presigner.presignPutObject(
                    PutObjectPresignRequest.builder()
                            .signatureDuration(expiration)
                            .putObjectRequest(putObjectRequest)
                            .build()
            );
            return new PresignedUpload(
                    java.net.URI.create(presigned.url().toString()),
                    Instant.now().plus(expiration),
                    Map.of("Content-Type", contentType)
            );
        } catch (SdkException exception) {
            throw new ObjectStorageException("Could not create an upload URL.", exception);
        }
    }

    @Override
    public PresignedAccess generatePresignedAccess(String objectKey, Duration expiration) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(properties.getBucket())
                    .key(objectKey)
                    .build();
            PresignedGetObjectRequest presigned = presigner.presignGetObject(
                    GetObjectPresignRequest.builder()
                            .signatureDuration(expiration)
                            .getObjectRequest(getObjectRequest)
                            .build()
            );
            return new PresignedAccess(
                    java.net.URI.create(presigned.url().toString()),
                    Instant.now().plus(expiration)
            );
        } catch (SdkException exception) {
            throw new ObjectStorageException("Could not create a media access URL.", exception);
        }
    }

    @Override
    public Optional<StoredObjectMetadata> findObjectMetadata(String objectKey) {
        try {
            HeadObjectResponse response = s3Client.headObject(
                    HeadObjectRequest.builder()
                            .bucket(properties.getBucket())
                            .key(objectKey)
                            .build()
            );
            return Optional.of(new StoredObjectMetadata(
                    response.contentLength(),
                    response.contentType()
            ));
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) return Optional.empty();
            throw new ObjectStorageException("Could not verify the uploaded object.", exception);
        } catch (SdkException exception) {
            throw new ObjectStorageException("Could not verify the uploaded object.", exception);
        }
    }

    @Override
    public void deleteObject(String objectKey) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(properties.getBucket())
                    .key(objectKey)
                    .build());
        } catch (SdkException exception) {
            throw new ObjectStorageException("Could not delete the stored object.", exception);
        }
    }
}
