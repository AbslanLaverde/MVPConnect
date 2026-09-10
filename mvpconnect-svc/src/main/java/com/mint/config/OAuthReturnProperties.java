package com.mint.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Data
@ConfigurationProperties(prefix = "oauth.return")
public class OAuthReturnProperties {
    private Duration attemptTtl = Duration.ofMinutes(10);
    private List<String> allowedTargets = new ArrayList<>(List.of(
            "mvpconnect://oauth/result",
            "http://localhost:19006/oauth/result",
            "http://localhost:8081/oauth/result",
            "http://localhost:8082/oauth/result",
            "http://localhost:8097/oauth/result"
    ));
}
