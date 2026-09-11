package com.mint.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@Data
@ConfigurationProperties(prefix = "soundcloud.oauth")
public class SoundCloudOAuthProperties {
    private String clientId;
    private String clientSecret;
    private String redirectUri = "http://localhost:8080/external-connections/oauth/soundcloud/callback";
    private String authorizationBaseUrl = "https://secure.soundcloud.com";
    private String apiBaseUrl = "https://api.soundcloud.com";
    private Duration connectTimeout = Duration.ofSeconds(3);
    private Duration readTimeout = Duration.ofSeconds(8);
}
