package com.mint.nodes;

import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

import java.time.Instant;

/** Linked from exactly one AuthSession by HAS_REFRESH_CREDENTIAL. Never contains the raw secret. */
@Node("RefreshCredential")
public record RefreshCredential(@Id String hash, Instant issuedAt, Instant consumedAt) {
    @Override
    public String toString() { return "RefreshCredential[redacted]"; }
}
