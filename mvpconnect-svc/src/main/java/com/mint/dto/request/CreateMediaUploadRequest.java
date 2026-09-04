package com.mint.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record CreateMediaUploadRequest(
        @NotBlank(message = "Media type is required") String mediaType,
        @NotBlank(message = "Media context is required") String mediaContext,
        @NotBlank(message = "File name is required") String fileName,
        @NotBlank(message = "MIME type is required") String mimeType,
        @NotNull(message = "File size is required")
        @Positive(message = "File size must be positive") Long sizeBytes,
        @Positive(message = "Width must be positive") Integer width,
        @Positive(message = "Height must be positive") Integer height,
        @PositiveOrZero(message = "Sort order cannot be negative") Integer sortOrder) {
}
