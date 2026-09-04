package com.mint.media.storage;

import com.mint.config.MediaStorageProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class S3ObjectStorageServiceTest {

    @Mock
    private S3Client s3Client;

    @Mock
    private S3Presigner presigner;

    @Mock
    private PresignedPutObjectRequest presignedPutObjectRequest;

    private S3ObjectStorageService storageService;

    @BeforeEach
    void setUp() {
        MediaStorageProperties properties = new MediaStorageProperties();
        properties.setBucket("test-media");
        storageService = new S3ObjectStorageService(s3Client, presigner, properties);
    }

    @Test
    void availabilityCheckUsesConfiguredBucket() {
        when(s3Client.headBucket(any(HeadBucketRequest.class)))
                .thenReturn(HeadBucketResponse.builder().build());

        storageService.checkAvailability();

        ArgumentCaptor<HeadBucketRequest> requestCaptor =
                ArgumentCaptor.forClass(HeadBucketRequest.class);
        verify(s3Client).headBucket(requestCaptor.capture());
        assertEquals("test-media", requestCaptor.getValue().bucket());
    }

    @Test
    void availabilityFailureUsesTheStorageAbstractionError() {
        when(s3Client.headBucket(any(HeadBucketRequest.class))).thenThrow(
                S3Exception.builder().statusCode(503).message("private provider detail").build()
        );

        ObjectStorageException exception = assertThrows(
                ObjectStorageException.class,
                storageService::checkAvailability
        );

        assertEquals("Object storage is unavailable.", exception.getMessage());
    }

    @Test
    void uploadPresignRestrictsBucketKeyContentTypeAndExpiration() throws Exception {
        when(presignedPutObjectRequest.url())
                .thenReturn(URI.create("http://storage.test/upload").toURL());
        when(presigner.presignPutObject(any(PutObjectPresignRequest.class)))
                .thenReturn(presignedPutObjectRequest);

        PresignedUpload upload = storageService.generatePresignedUpload(
                "users/user-1/media-1.jpg",
                "image/jpeg",
                Duration.ofMinutes(15)
        );

        ArgumentCaptor<PutObjectPresignRequest> requestCaptor =
                ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        verify(presigner).presignPutObject(requestCaptor.capture());
        PutObjectPresignRequest request = requestCaptor.getValue();
        assertEquals(Duration.ofMinutes(15), request.signatureDuration());
        assertEquals("test-media", request.putObjectRequest().bucket());
        assertEquals("users/user-1/media-1.jpg", request.putObjectRequest().key());
        assertEquals("image/jpeg", request.putObjectRequest().contentType());
        assertEquals("image/jpeg", upload.requiredHeaders().get("Content-Type"));
        assertEquals(URI.create("http://storage.test/upload"), upload.url());
    }

    @Test
    void headReturnsStoredMetadata() {
        when(s3Client.headObject(any(HeadObjectRequest.class))).thenReturn(
                HeadObjectResponse.builder()
                        .contentLength(1_024L)
                        .contentType("image/webp")
                        .build()
        );

        Optional<StoredObjectMetadata> metadata =
                storageService.findObjectMetadata("users/user-1/media-1.webp");

        assertTrue(metadata.isPresent());
        assertEquals(1_024L, metadata.orElseThrow().contentLength());
        assertEquals("image/webp", metadata.orElseThrow().contentType());
    }

    @Test
    void missingObjectProducesAnEmptyMetadataResult() {
        when(s3Client.headObject(any(HeadObjectRequest.class))).thenThrow(
                S3Exception.builder().statusCode(404).message("not found").build()
        );

        Optional<StoredObjectMetadata> metadata =
                storageService.findObjectMetadata("users/user-1/missing.jpg");

        assertTrue(metadata.isEmpty());
    }
}
