package com.mint.config;

import com.mint.authsession.http.AuthClientTransportResolver;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
@EnableConfigurationProperties({AuthSessionHttpProperties.class, CorsProperties.class})
public class AuthSessionHttpConfig {
    @Bean
    public AuthClientTransportResolver authClientTransportResolver(AuthSessionHttpProperties properties,
            CorsProperties cors, Environment environment) {
        properties.validate(cors, environment);
        return new AuthClientTransportResolver(properties, cors);
    }
}
