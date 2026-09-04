package com.mint.media.storage;

import java.net.URI;
import java.time.Instant;

public record PresignedAccess(URI url, Instant expiresAt) {
}
