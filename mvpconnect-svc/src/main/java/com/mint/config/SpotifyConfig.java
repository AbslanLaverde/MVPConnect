package com.mint.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(SpotifyProperties.class)
public class SpotifyConfig {

    @Bean
    @Qualifier("spotifyAccountsRestClient")
    RestClient spotifyAccountsRestClient(RestClient.Builder builder, SpotifyProperties properties) {
        return builder
                .baseUrl(properties.getAccountsBaseUrl())
                .requestFactory(requestFactory(properties))
                .build();
    }

    @Bean
    @Qualifier("spotifyApiRestClient")
    RestClient spotifyApiRestClient(RestClient.Builder builder, SpotifyProperties properties) {
        return builder
                .baseUrl(properties.getApiBaseUrl())
                .requestFactory(requestFactory(properties))
                .build();
    }

    private SimpleClientHttpRequestFactory requestFactory(SpotifyProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeout());
        factory.setReadTimeout(properties.getReadTimeout());
        return factory;
    }
}
