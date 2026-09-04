package com.mint.config;

import com.mint.media.storage.ObjectStorageException;
import com.mint.media.storage.ObjectStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.actuate.health.Status;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ObjectStorageHealthIndicatorTest {

    @Mock
    private ObjectStorageService objectStorageService;

    private ObjectStorageHealthIndicator indicator;

    @BeforeEach
    void setUp() {
        indicator = new ObjectStorageHealthIndicator(objectStorageService);
    }

    @Test
    void storageHealthIsUpWhenTheBucketIsReachable() {
        assertEquals(Status.UP, indicator.health().getStatus());
        verify(objectStorageService).checkAvailability();
    }

    @Test
    void storageHealthIsDownWithoutLeakingTheRawException() {
        doThrow(new ObjectStorageException(
                "secret endpoint and credentials",
                new RuntimeException("provider detail")
        )).when(objectStorageService).checkAvailability();

        var health = indicator.health();

        assertEquals(Status.DOWN, health.getStatus());
        assertFalse(health.getDetails().toString().contains("secret endpoint and credentials"));
        assertFalse(health.getDetails().toString().contains("provider detail"));
    }
}
