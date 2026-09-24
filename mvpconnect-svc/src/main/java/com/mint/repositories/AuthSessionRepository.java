package com.mint.repositories;

import com.mint.authsession.SessionStoreException;
import com.mint.authsession.RevocationReason;
import com.mint.authsession.SessionTransport;
import com.mint.nodes.AuthSession;
import com.mint.nodes.RefreshCredential;
import com.mint.onboarding.PersonaType;
import org.neo4j.driver.Driver;
import org.neo4j.driver.SessionConfig;
import org.neo4j.driver.TransactionContext;
import org.neo4j.driver.Value;
import org.neo4j.driver.exceptions.Neo4jException;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

/**
 * Narrow custom repository on the same Boot-managed driver/database as SDN.
 * Each callback owns one driver-managed transaction (not an outer Spring transaction).
 * No HTTP response/secret delivery or other external side effect may occur in a callback:
 * the driver can retry it, and a result is returned only after commit succeeds.
 */
@Repository
public class AuthSessionRepository {
    private final Driver driver;
    private final SessionConfig sessionConfig;

    public AuthSessionRepository(Driver driver,
            @org.springframework.beans.factory.annotation.Value("${spring.data.neo4j.database:neo4j}") String database) {
        this.driver = driver;
        this.sessionConfig = SessionConfig.forDatabase(database);
    }

    public <T> T write(Function<Transaction, T> work) {
        try (var session = driver.session(sessionConfig)) {
            return session.executeWrite(tx -> work.apply(new Transaction(tx)));
        } catch (Neo4jException failure) {
            throw new SessionStoreException();
        }
    }

    public Optional<StoredSession> find(String id) {
        // Use a writer-routed transaction even for validation: avoid stale follower reads
        // accepting a revoked session when deployed against a Neo4j cluster.
        return write(tx -> tx.find(id));
    }

    public List<String> cleanupCandidates(Instant cutoff, int limit) {
        return write(tx -> tx.tx.run("""
                CALL {
                  MATCH (s:AuthSession) WHERE s.inactivityExpiresAt <= $cutoff
                  RETURN s.id AS id LIMIT $limit
                  UNION
                  MATCH (s:AuthSession) WHERE s.absoluteExpiresAt <= $cutoff
                  RETURN s.id AS id LIMIT $limit
                  UNION
                  MATCH (s:AuthSession) WHERE s.revokedAt <= $cutoff
                  RETURN s.id AS id LIMIT $limit
                }
                RETURN id ORDER BY id LIMIT $limit
                """, Map.of("cutoff", utc(cutoff), "limit", limit))
                .list(row -> row.get("id").asString()));
    }

    public record StoredSession(AuthSession session, boolean ownerValid) { }

    public static final class Transaction {
        private final TransactionContext tx;
        private final Set<String> lockedSessions = new HashSet<>();

        private Transaction(TransactionContext tx) { this.tx = tx; }

        public Optional<String> sessionIdForCredential(String hash) {
            var rows = tx.run("""
                    MATCH (s:AuthSession)-[:HAS_REFRESH_CREDENTIAL]->(c:RefreshCredential {hash: $hash})
                    RETURN s.id AS id LIMIT 2
                    """, Map.of("hash", hash)).list();
            return rows.size() == 1 ? Optional.of(rows.getFirst().get("id").asString()) : Optional.empty();
        }

        public boolean lock(String id) {
            // SET acquires an exclusive node write lock; REMOVE does NOT release it.
            // Lock is retained until this transaction commits/rolls back. Dependent
            // properties and credential state MUST be read in subsequent statements.
            // https://neo4j.com/docs/operations-manual/current/database-internals/concurrent-data-access/
            boolean found = tx.run("""
                    MATCH (s:AuthSession {id: $id})
                    SET s._authLock = true REMOVE s._authLock
                    RETURN s.id
                    """, Map.of("id", id)).hasNext();
            if (found) lockedSessions.add(id);
            return found;
        }

        public Optional<StoredSession> find(String id) {
            var rows = tx.run("""
                    MATCH (s:AuthSession {id: $id})
                    OPTIONAL MATCH (owner)-[:HAS_AUTH_SESSION]->(s)
                    WITH s, collect(owner) AS owners
                    RETURN s, size(owners) = 1 AND single(owner IN owners WHERE owner.id = s.ownerId AND
                      ((s.ownerPersona = 'MUSICIAN' AND owner:Musician AND NOT owner:Venue AND NOT owner:Promoter) OR
                       (s.ownerPersona = 'VENUE' AND owner:Venue AND NOT owner:Musician AND NOT owner:Promoter) OR
                       (s.ownerPersona = 'PROMOTER' AND owner:Promoter AND NOT owner:Musician AND NOT owner:Venue)))
                      AS ownerValid
                    """, Map.of("id", id)).list();
            if (rows.isEmpty()) return Optional.empty();
            var row = rows.getFirst();
            return Optional.of(new StoredSession(mapSession(row.get("s")), row.get("ownerValid").asBoolean(false)));
        }

        public Optional<RefreshCredential> credential(String id, String hash) {
            var rows = tx.run("""
                    MATCH (:AuthSession {id: $id})-[:HAS_REFRESH_CREDENTIAL]->(c:RefreshCredential {hash: $hash})
                    RETURN c
                    """, Map.of("id", id, "hash", hash)).list();
            if (rows.size() != 1) return Optional.empty();
            var c = rows.getFirst().get("c");
            return Optional.of(new RefreshCredential(c.get("hash").asString(), instant(c.get("issuedAt")),
                    instant(c.get("consumedAt"))));
        }

        public boolean create(AuthSession session, RefreshCredential credential) {
            // Label is chosen from an enum, never interpolated from request input.
            String label = switch (session.ownerPersona()) {
                case MUSICIAN -> "Musician";
                case VENUE -> "Venue";
                case PROMOTER -> "Promoter";
            };
            return tx.run("MATCH (owner:" + label + " {id: $ownerId}) " + """
                    WHERE size([label IN labels(owner) WHERE label IN ['Musician', 'Venue', 'Promoter']]) = 1
                    CREATE (s:AuthSession) SET s = $session
                    CREATE (c:RefreshCredential) SET c = $credential
                    CREATE (owner)-[:HAS_AUTH_SESSION]->(s)-[:HAS_REFRESH_CREDENTIAL]->(c)
                    RETURN s.id
                    """, Map.of("ownerId", session.ownerId(), "session", properties(session),
                    "credential", Map.of("hash", credential.hash(), "issuedAt", utc(credential.issuedAt())))).hasNext();
        }

        public void rotate(AuthSession session, String oldHash, String newHash, Instant now, Instant inactivityExpiry) {
            requireLock(session.id());
            tx.run("""
                    MATCH (s:AuthSession {id: $id})-[:HAS_REFRESH_CREDENTIAL]->(old:RefreshCredential {hash: $oldHash})
                    SET old.consumedAt = $now, s.currentRefreshHash = $newHash,
                        s.lastUsedAt = $now, s.inactivityExpiresAt = $inactivityExpiry
                    CREATE (s)-[:HAS_REFRESH_CREDENTIAL]->(:RefreshCredential {hash: $newHash, issuedAt: $now})
                    """, Map.of("id", session.id(), "oldHash", oldHash, "newHash", newHash,
                    "now", utc(now), "inactivityExpiry", utc(inactivityExpiry))).consume();
        }

        public void revoke(String id, Instant now, RevocationReason reason) {
            requireLock(id);
            tx.run("""
                    MATCH (s:AuthSession {id: $id}) WHERE s.revokedAt IS NULL
                    SET s.revokedAt = $now, s.revocationReason = $reason
                    """, Map.of("id", id, "now", utc(now), "reason", reason.name())).consume();
        }

        public void delete(String id) {
            requireLock(id);
            tx.run("""
                    MATCH (s:AuthSession {id: $id})
                    OPTIONAL MATCH (s)-[:HAS_REFRESH_CREDENTIAL]->(c:RefreshCredential)
                    DETACH DELETE c, s
                    """, Map.of("id", id)).consume();
        }

        private void requireLock(String id) {
            if (!lockedSessions.contains(id)) throw new IllegalStateException("Auth session write lock required");
        }
    }

    private static Map<String, Object> properties(AuthSession s) {
        Map<String, Object> values = new HashMap<>();
        values.put("id", s.id());
        values.put("ownerId", s.ownerId());
        values.put("ownerPersona", s.ownerPersona().name());
        values.put("transport", s.transport().name());
        values.put("createdAt", utc(s.createdAt()));
        values.put("authenticatedAt", utc(s.authenticatedAt()));
        values.put("lastUsedAt", utc(s.lastUsedAt()));
        values.put("inactivityExpiresAt", utc(s.inactivityExpiresAt()));
        values.put("absoluteExpiresAt", utc(s.absoluteExpiresAt()));
        values.put("currentRefreshHash", s.currentRefreshHash());
        return values;
    }

    private static AuthSession mapSession(Value s) {
        return new AuthSession(s.get("id").asString(), s.get("ownerId").asString(),
                PersonaType.valueOf(s.get("ownerPersona").asString()),
                SessionTransport.valueOf(s.get("transport").asString()),
                instant(s.get("createdAt")), instant(s.get("authenticatedAt")), instant(s.get("lastUsedAt")),
                instant(s.get("inactivityExpiresAt")), instant(s.get("absoluteExpiresAt")),
                s.get("currentRefreshHash").asString(), instant(s.get("revokedAt")),
                s.get("revocationReason").isNull() ? null : RevocationReason.valueOf(s.get("revocationReason").asString()));
    }

    private static Instant instant(Value value) {
        return value.isNull() ? null : value.asZonedDateTime().toInstant();
    }

    private static Object utc(Instant instant) { return instant.atOffset(ZoneOffset.UTC); }
}
