package com.mint.nodes;

import com.mint.authsession.RevocationReason;
import com.mint.authsession.SessionTransport;
import com.mint.onboarding.PersonaType;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

import java.time.Instant;

/** Immutable snapshot. Writes/relationships are owned exclusively by AuthSessionRepository. */
@Node("AuthSession")
public record AuthSession(
        @Id String id, String ownerId, PersonaType ownerPersona, SessionTransport transport,
        Instant createdAt, Instant authenticatedAt, Instant lastUsedAt,
        Instant inactivityExpiresAt, Instant absoluteExpiresAt, String currentRefreshHash,
        Instant revokedAt, RevocationReason revocationReason) {

    @Override
    public String toString() { return "AuthSession[id=" + id + ", persona=" + ownerPersona + "]"; }
}
