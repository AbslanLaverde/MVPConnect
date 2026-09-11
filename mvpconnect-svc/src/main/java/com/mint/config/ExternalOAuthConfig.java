package com.mint.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties({
        OAuthReturnProperties.class,
        TokenEncryptionProperties.class,
        YouTubeOAuthProperties.class,
        SoundCloudOAuthProperties.class
})
public class ExternalOAuthConfig {

    @Bean
    @Qualifier("youtubeTokenRestClient")
    RestClient youtubeTokenRestClient(RestClient.Builder builder, YouTubeOAuthProperties properties) {
        return builder.baseUrl(properties.getTokenBaseUrl())
                .requestFactory(requestFactory(properties.getConnectTimeout(), properties.getReadTimeout()))
                .build();
    }

    @Bean
    @Qualifier("youtubeApiRestClient")
    RestClient youtubeApiRestClient(RestClient.Builder builder, YouTubeOAuthProperties properties) {
        return builder.baseUrl(properties.getApiBaseUrl())
                .requestFactory(requestFactory(properties.getConnectTimeout(), properties.getReadTimeout()))
                .build();
    }

    @Bean
    @Qualifier("soundCloudAccountsRestClient")
    RestClient soundCloudAccountsRestClient(RestClient.Builder builder, SoundCloudOAuthProperties properties) {
        return builder.baseUrl(properties.getAuthorizationBaseUrl())
                .requestFactory(requestFactory(properties.getConnectTimeout(), properties.getReadTimeout()))
                .build();
    }

    @Bean
    @Qualifier("soundCloudApiRestClient")
    RestClient soundCloudApiRestClient(RestClient.Builder builder, SoundCloudOAuthProperties properties) {
        return builder.baseUrl(properties.getApiBaseUrl())
                .requestFactory(requestFactory(properties.getConnectTimeout(), properties.getReadTimeout()))
                .build();
    }

    private SimpleClientHttpRequestFactory requestFactory(Duration connect, Duration read) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connect);
        factory.setReadTimeout(read);
        return factory;
    }
}
