package com.mint.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@Data
@ConfigurationProperties(prefix = "youtube.oauth")
public class YouTubeOAuthProperties {
    private String clientId;
    private String clientSecret;
    private String redirectUri = "http://localhost:8080/external-connections/oauth/youtube/callback";
    private String authorizationBaseUrl = "https://accounts.google.com";
    private String tokenBaseUrl = "https://oauth2.googleapis.com";
    private String apiBaseUrl = "https://www.googleapis.com";
    private Duration connectTimeout = Duration.ofSeconds(3);
    private Duration readTimeout = Duration.ofSeconds(8);
}
