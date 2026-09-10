package com.mint.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "oauth.encryption")
public class TokenEncryptionProperties {
    private String keyBase64;
    private int keyVersion = 1;
}
