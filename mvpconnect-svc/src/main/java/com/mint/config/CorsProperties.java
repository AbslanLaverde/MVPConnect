package com.mint.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Data
@ConfigurationProperties(prefix = "cors")
public class CorsProperties {
    private List<String> allowedOrigins = new ArrayList<>(List.of(
            "http://localhost:3000",
            "http://localhost:4200",
            "http://localhost:8081",
            "http://localhost:8082",
            "http://localhost:19000",
            "http://localhost:19006",
            "http://localhost:8097"
    ));
}
