package com.mint.config;

import com.mint.media.storage.ObjectStorageService;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class ObjectStorageHealthIndicator implements HealthIndicator {

    private final ObjectStorageService objectStorageService;

    public ObjectStorageHealthIndicator(ObjectStorageService objectStorageService) {
        this.objectStorageService = objectStorageService;
    }

    @Override
    public Health health() {
        try {
            objectStorageService.checkAvailability();
            return Health.up().build();
        } catch (RuntimeException exception) {
            return Health.down().build();
        }
    }
}
