package com.mint.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(GooglePlacesProperties.class)
public class GooglePlacesConfig {

    @Bean
    @Qualifier("googlePlacesRestClient")
    RestClient googlePlacesRestClient(RestClient.Builder builder, GooglePlacesProperties properties) {
        return builder.baseUrl(properties.getBaseUrl()).build();
    }
}
