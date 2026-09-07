package com.mint.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@Data
@ConfigurationProperties(prefix = "spotify")
public class SpotifyProperties {

    private String clientId;
    private String clientSecret;
    private String accountsBaseUrl = "https://accounts.spotify.com";
    private String apiBaseUrl = "https://api.spotify.com";
    private Duration connectTimeout = Duration.ofSeconds(3);
    private Duration readTimeout = Duration.ofSeconds(8);
}
