package com.mint.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.convert.DurationUnit;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import java.time.temporal.ChronoUnit;

@Data
@Validated
@ConfigurationProperties(prefix = "media.storage")
public class MediaStorageProperties {

    @NotBlank
    private String bucket = "mvpconnect-media";

    @NotBlank
    private String region = "us-east-1";

    private String endpoint;
    private boolean pathStyleAccess;
    private String accessKey;
    private String secretKey;

    @NotNull
    private DataSize maxFileSize = DataSize.ofMegabytes(10);

    @NotNull
    @DurationUnit(ChronoUnit.MINUTES)
    private Duration uploadUrlExpiration = Duration.ofMinutes(15);

    @NotNull
    @DurationUnit(ChronoUnit.MINUTES)
    private Duration accessUrlExpiration = Duration.ofMinutes(15);
}
