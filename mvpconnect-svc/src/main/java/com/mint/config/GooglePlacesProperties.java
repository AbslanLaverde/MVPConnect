package com.mint.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "google.places")
public class GooglePlacesProperties {

    private String apiKey;
    private String baseUrl = "https://places.googleapis.com";
}
