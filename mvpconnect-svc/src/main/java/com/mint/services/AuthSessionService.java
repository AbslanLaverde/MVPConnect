package com.mint.services;

import com.mint.authsession.*;
import com.mint.config.AuthSessionProperties;
import com.mint.nodes.AuthSession;
import com.mint.nodes.RefreshCredential;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.AuthSessionRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import static com.mint.authsession.SessionValidity.earlier;

@Service
public class AuthSessionService {
    // Keep complete credential history until seven days after a session becomes unusable.
    public static final Duration TERMINAL_RETENTION = Duration.ofDays(7);
    private final AuthSessionRepository repository;
    private final RefreshCredentialGenerator credentials;
    private final AuthSessionProperties properties;
    private final Clock clock;

    public AuthSessionService(AuthSessionRepository repository, RefreshCredentialGenerator credentials,
            AuthSessionProperties properties, @Qualifier("authSessionClock") Clock clock) {
        this.repository = repository;
        this.credentials = credentials;
        this.properties = properties;
        this.clock = clock;
    }

    public SessionResult createSession(String ownerId, PersonaType persona, SessionTransport transport,
            Instant authenticatedAt) {
        if (ownerId == null || ownerId.isBlank() || persona == null || transport == null) {
            return SessionResult.failed(AuthFailure.INVALID_OWNER);
        }
        return repository.write(tx -> {
            Instant now = clock.instant();
            Instant authenticated = authenticatedAt == null ? now : authenticatedAt;
            if (authenticated.isAfter(now)) return SessionResult.failed(AuthFailure.INVALID_SESSION_STATE);
            RefreshSecret secret = credentials.generate();
            String hash = credentials.hash(secret.reveal());
            Instant absoluteExpiry = now.plus(properties.getAbsoluteTtl());
            AuthSession session = new AuthSession(UUID.randomUUID().toString(), ownerId, persona, transport,
                    now, authenticated, now, earlier(now.plus(properties.getInactivityTtl()), absoluteExpiry),
                    absoluteExpiry, hash, null, null);
            if (!tx.create(session, new RefreshCredential(hash, now, null))) {
                return SessionResult.failed(AuthFailure.INVALID_OWNER);
            }
            return SessionResult.success(session, secret);
        });
    }

    public SessionResult rotateRefreshCredential(String rawCredential) {
        return rotateRefreshCredential(rawCredential, null);
    }

    /** HTTP callers must supply the resolved transport. Check it under the SAME rotation lock. */
    public SessionResult rotateRefreshCredential(String rawCredential, SessionTransport expectedTransport) {
        final String hash;
        try {
            hash = credentials.hash(rawCredential);
        } catch (SessionAuthException invalid) {
            return SessionResult.failed(AuthFailure.INVALID_CREDENTIAL);
        }
        return repository.write(tx -> {
            var id = tx.sessionIdForCredential(hash);
            if (id.isEmpty() || !tx.lock(id.get())) return SessionResult.failed(AuthFailure.INVALID_CREDENTIAL);
            // No dependent state is accepted before the write lock. Read time AFTER waiting.
            Instant now = clock.instant();
            var stored = tx.find(id.get());
            if (stored.isEmpty()) return SessionResult.failed(AuthFailure.INVALID_CREDENTIAL);
            AuthSession session = stored.get().session();
            if (expectedTransport != null && session.transport() != expectedTransport) {
                return SessionResult.failed(AuthFailure.TRANSPORT_MISMATCH);
            }
            AuthFailure failure = SessionValidity.failure(session, now);
            if (failure != null) return SessionResult.failed(failure);
            if (!stored.get().ownerValid()) return SessionResult.failed(AuthFailure.INVALID_OWNER);
            var credential = tx.credential(session.id(), hash);
            if (credential.isEmpty()) return SessionResult.failed(AuthFailure.INVALID_CREDENTIAL);
            if (credential.get().consumedAt() != null) {
                tx.revoke(session.id(), now, RevocationReason.REFRESH_REUSE);
                // Return, do not throw: the repository commits this revocation before returning.
                return SessionResult.failed(AuthFailure.REFRESH_REUSED);
            }
            if (!credentials.matches(hash, session.currentRefreshHash())) {
                return SessionResult.failed(AuthFailure.INVALID_SESSION_STATE);
            }
            RefreshSecret next = credentials.generate();
            String nextHash = credentials.hash(next.reveal());
            Instant expiry = earlier(now.plus(properties.getInactivityTtl()), session.absoluteExpiresAt());
            tx.rotate(session, hash, nextHash, now, expiry);
            return SessionResult.success(tx.find(session.id()).orElseThrow().session(), next);
        });
    }

    public AuthSession requireActiveSession(String id) {
        if (id == null || id.isBlank()) throw new SessionAuthException(AuthFailure.TOKEN_INVALID);
        var stored = repository.find(id).orElseThrow(() -> new SessionAuthException(AuthFailure.TOKEN_INVALID));
        AuthFailure failure = SessionValidity.failure(stored.session(), clock.instant());
        if (failure != null) throw new SessionAuthException(failure);
        if (!stored.ownerValid()) throw new SessionAuthException(AuthFailure.INVALID_OWNER);
        return stored.session();
    }

    /** Revocation only: known consumed credentials may revoke, never rotate or issue access. */
    public AuthFailure revokeRefreshSession(String rawCredential, SessionTransport expectedTransport) {
        Objects.requireNonNull(expectedTransport);
        final String hash;
        try { hash = credentials.hash(rawCredential); }
        catch (SessionAuthException invalid) { return AuthFailure.INVALID_CREDENTIAL; }
        return repository.write(tx -> {
            var id = tx.sessionIdForCredential(hash);
            if (id.isEmpty() || !tx.lock(id.get())) return AuthFailure.INVALID_CREDENTIAL;
            var stored = tx.find(id.get());
            if (stored.isEmpty() || tx.credential(id.get(), hash).isEmpty()) return AuthFailure.INVALID_CREDENTIAL;
            if (stored.get().session().transport() != expectedTransport) return AuthFailure.TRANSPORT_MISMATCH;
            tx.revoke(id.get(), clock.instant(), RevocationReason.EXPLICIT_LOGOUT);
            return null;
        });
    }

    /** Internal primitive; HTTP logout resolves the family from its refresh credential instead. */
    public boolean revokeSession(String id, RevocationReason reason) {
        Objects.requireNonNull(reason);
        if (id == null || id.isBlank()) return false;
        return repository.write(tx -> {
            if (!tx.lock(id)) return false;
            tx.revoke(id, clock.instant(), reason);
            return true;
        });
    }

    /** Bounded manual/job integration point; no scheduler is introduced in Phase 1. */
    public int cleanupTerminalSessions(int limit) {
        if (limit < 1 || limit > 1000) throw new IllegalArgumentException("Cleanup limit must be 1..1000");
        Instant cutoff = clock.instant().minus(TERMINAL_RETENTION);
        int deleted = 0;
        for (String id : repository.cleanupCandidates(cutoff, limit)) {
            boolean removed = repository.write(tx -> {
                if (!tx.lock(id)) return false;
                var stored = tx.find(id);
                if (stored.isEmpty()) return false;
                AuthSession s = stored.get().session();
                // Recheck after lock: a refresh may have extended inactivity since candidate selection.
                if ((s.revokedAt() != null && !s.revokedAt().isAfter(cutoff))
                        || !s.inactivityExpiresAt().isAfter(cutoff) || !s.absoluteExpiresAt().isAfter(cutoff)) {
                    tx.delete(id);
                    return true;
                }
                return false;
            });
            if (removed) deleted++;
        }
        return deleted;
    }
}
