package com.mint.authsession;

import com.mint.config.AuthSessionProperties;
import com.mint.config.Neo4jSchemaInitializer;
import com.mint.nodes.AuthSession;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.AuthSessionRepository;
import com.mint.security.CustomUserDetails;
import com.mint.security.CustomUserDetailsService;
import com.mint.security.SessionAccessTokenService;
import com.mint.security.SessionJwtTokenProvider;
import com.mint.services.AuthSessionService;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.neo4j.driver.*;
import org.neo4j.harness.Neo4j;
import org.neo4j.harness.Neo4jBuilders;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

import static com.mint.authsession.SessionTestSupport.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real Neo4j 5.26 database, Bolt connections and production repository/service; no mocked locking. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthSessionIntegrationTest {
    private Neo4j neo4j;
    private Driver driver;
    private AuthSessionRepository repository;
    private AuthSessionService sessions;
    private final MutableClock clock = new MutableClock();
    private final RefreshCredentialGenerator generator = new RefreshCredentialGenerator();
    private final AuthSessionProperties properties = properties();
    private SessionJwtTokenProvider tokens;
    private SessionAccessTokenService access;

    @BeforeAll void startDatabase() {
        neo4j = Neo4jBuilders.newInProcessBuilder().withDisabledServer()
                .withConfig(org.neo4j.configuration.GraphDatabaseSettings.pagecache_memory, 64L * 1024 * 1024)
                .build();
        driver = GraphDatabase.driver(neo4j.boltURI(), AuthTokens.none());
        new Neo4jSchemaInitializer(driver, "neo4j").run(null);
        new Neo4jSchemaInitializer(driver, "neo4j").run(null); // Actually exercise idempotence.
        repository = new AuthSessionRepository(driver, "neo4j");
        sessions = new AuthSessionService(repository, generator, properties, clock);
        tokens = new SessionJwtTokenProvider(Jwts.SIG.HS512.key().build(), properties, clock);
        var principals = mock(CustomUserDetailsService.class);
        when(principals.loadByOwnerId(anyString(), any())).thenAnswer(invocation -> new CustomUserDetails(
                invocation.getArgument(0), "current@example.test", "unused", ((PersonaType) invocation.getArgument(1)).name()));
        access = new SessionAccessTokenService(sessions, tokens, principals);
    }

    @AfterAll void stopDatabase() {
        if (driver != null) driver.close();
        if (neo4j != null) neo4j.close();
    }

    @BeforeEach void fixture() {
        clock.set(START);
        query("MATCH (n) DETACH DELETE n", Map.of());
        query("CREATE (:Musician {id:'musician-1'}), (:Venue {id:'venue-1'}), (:Promoter {id:'promoter-1'})", Map.of());
    }

    @ParameterizedTest @EnumSource(PersonaType.class)
    void createsAtomicOwnerSessionAndCredentialGraphForEveryPersona(PersonaType persona) {
        String ownerId = persona.name().toLowerCase() + "-1";
        SessionResult result = sessions.createSession(ownerId, persona, SessionTransport.NATIVE, null);
        assertTrue(result.succeeded());
        AuthSession session = repository.find(result.session().id()).orElseThrow().session();
        assertEquals(ownerId, session.ownerId());
        assertEquals(persona, session.ownerPersona());
        assertEquals(SessionTransport.NATIVE, session.transport());
        assertEquals(START, session.createdAt());
        assertEquals(START, session.authenticatedAt());
        assertEquals(START, session.lastUsedAt());
        assertEquals(START.plus(Duration.ofDays(30)), session.inactivityExpiresAt());
        assertEquals(START.plus(Duration.ofDays(90)), session.absoluteExpiresAt());
        String raw = result.refreshCredential().reveal();
        assertEquals(generator.hash(raw), session.currentRefreshHash());
        var graph = query("""
                MATCH (owner)-[:HAS_AUTH_SESSION]->(s:AuthSession {id:$id})-[:HAS_REFRESH_CREDENTIAL]->(c:RefreshCredential)
                RETURN owner.id AS owner, properties(s) AS session, properties(c) AS credential
                """, Map.of("id", session.id()));
        assertEquals(1, graph.size());
        assertEquals(ownerId, graph.getFirst().get("owner").asString());
        assertFalse(graph.toString().contains(raw));
        var persistedCredential = graph.getFirst().get("credential");
        assertEquals(java.util.Set.of("hash", "issuedAt"), persistedCredential.asMap().keySet());
        assertEquals(generator.hash(raw), persistedCredential.get("hash").asString());
        assertEquals(START, persistedCredential.get("issuedAt").asZonedDateTime().toInstant());
        assertFalse(result.toString().contains(raw));
        assertFalse(session.toString().contains(session.currentRefreshHash()));
    }

    @Test void missingOrMismatchedOwnerCannotCreateOrUseSession() {
        assertEquals(AuthFailure.INVALID_OWNER,
                sessions.createSession("absent", PersonaType.MUSICIAN, SessionTransport.WEB, null).failure());
        assertEquals(AuthFailure.INVALID_OWNER,
                sessions.createSession("musician-1", PersonaType.VENUE, SessionTransport.WEB, null).failure());
        assertEquals(0, scalar("MATCH (s:AuthSession) RETURN count(s) AS count", Map.of()));
        SessionResult created = create();
        String token = access.issueAccessToken(created.session().id());
        query("MATCH (owner:Musician {id:'musician-1'}) DETACH DELETE owner", Map.of());
        assertEquals(AuthFailure.INVALID_OWNER, rotate(created).failure());
        assertEquals(AuthFailure.INVALID_OWNER, assertThrows(SessionAuthException.class,
                () -> access.authenticate(tokens.parse(token))).failure());
    }

    @Test void missingOrInconsistentOwnershipRelationshipIsRejected() {
        var created = create();
        query("MATCH ()-[r:HAS_AUTH_SESSION]->(s:AuthSession {id:$id}) DELETE r", Map.of("id", created.session().id()));
        assertEquals(AuthFailure.INVALID_OWNER, rotate(created).failure());
        query("MATCH (v:Venue {id:'venue-1'}), (s:AuthSession {id:$id}) CREATE (v)-[:HAS_AUTH_SESSION]->(s)",
                Map.of("id", created.session().id()));
        assertEquals(AuthFailure.INVALID_OWNER, rotate(created).failure());
        assertThrows(SessionAuthException.class, () -> access.issueAccessToken(created.session().id()));
    }

    @Test void rotationConsumesOldHashAndPreservesAbsoluteAndAuthenticationTimes() {
        Instant authenticatedAt = START.minusSeconds(10);
        var first = sessions.createSession("musician-1", PersonaType.MUSICIAN, SessionTransport.WEB, authenticatedAt);
        clock.set(START.plus(Duration.ofDays(10)));
        var next = rotate(first);
        assertTrue(next.succeeded());
        assertNotEquals(first.refreshCredential().reveal(), next.refreshCredential().reveal());
        assertEquals(clock.instant(), next.session().lastUsedAt());
        assertEquals(START.plus(Duration.ofDays(40)), next.session().inactivityExpiresAt());
        assertEquals(first.session().absoluteExpiresAt(), next.session().absoluteExpiresAt());
        assertEquals(authenticatedAt, next.session().authenticatedAt());
        var old = repository.write(tx -> tx.credential(first.session().id(), first.session().currentRefreshHash()).orElseThrow());
        assertEquals(clock.instant(), old.consumedAt());
        var current = repository.write(tx -> tx.credential(first.session().id(), next.session().currentRefreshHash()).orElseThrow());
        assertNull(current.consumedAt());
        assertEquals(clock.instant(), current.issuedAt());
        String graph = query("MATCH (n) RETURN properties(n)", Map.of()).toString();
        assertFalse(graph.contains(first.refreshCredential().reveal()));
        assertFalse(graph.contains(next.refreshCredential().reveal()));
    }

    @Test void reuseFailureCommitsFamilyRevocationAndInvalidatesSuccessorAccessButNotOtherDevices() {
        var first = create();
        var unrelated = create();
        var next = rotate(first);
        String token = access.issueAccessToken(next.session().id());
        assertNotNull(access.authenticate(tokens.parse(token)));
        assertEquals(AuthFailure.REFRESH_REUSED, rotate(first).failure());
        // Independent committed read, not a snapshot inside the failed rotation transaction.
        var revoked = repository.find(first.session().id()).orElseThrow().session();
        assertEquals(START, revoked.revokedAt());
        assertEquals(RevocationReason.REFRESH_REUSE, revoked.revocationReason());
        assertEquals(AuthFailure.SESSION_REVOKED, rotate(next).failure());
        assertEquals(AuthFailure.SESSION_REVOKED, assertThrows(SessionAuthException.class,
                () -> access.authenticate(tokens.parse(token))).failure());
        assertTrue(rotate(unrelated).succeeded());
        assertNull(repository.find(unrelated.session().id()).orElseThrow().session().revokedAt());
    }

    @Test void unknownOrMalformedCredentialDoesNotRevokeAnything() {
        var first = create();
        for (String raw : List.of(generator.generate().reveal(), "invalid", "x".repeat(1000))) {
            assertEquals(AuthFailure.INVALID_CREDENTIAL, sessions.rotateRefreshCredential(raw).failure());
        }
        assertEquals(AuthFailure.INVALID_CREDENTIAL, sessions.rotateRefreshCredential(null).failure());
        assertNull(repository.find(first.session().id()).orElseThrow().session().revokedAt());
        assertTrue(rotate(first).succeeded());
    }

    @ParameterizedTest @CsvSource({"30,-1", "30,0", "30,1", "90,-1", "90,0", "90,1"})
    void exactInactivityAndAbsoluteExpiryBoundaries(int days, int secondOffset) {
        SessionResult current = create();
        if (days == 90) {
            for (int day : new int[]{29, 58, 87}) {
                clock.set(START.plus(Duration.ofDays(day)));
                current = rotate(current);
                assertTrue(current.succeeded());
            }
            assertEquals(START.plus(Duration.ofDays(90)), current.session().inactivityExpiresAt());
        }
        clock.set(START.plus(Duration.ofDays(days)).plusSeconds(secondOffset));
        var result = rotate(current);
        if (secondOffset < 0) assertTrue(result.succeeded());
        else assertEquals(AuthFailure.SESSION_EXPIRED, result.failure());
    }

    @Test void expiredSessionRejectsStillCryptographicallyValidAccessToken() {
        var first = create();
        String token = access.issueAccessToken(first.session().id());
        query("MATCH (s:AuthSession {id:$id}) SET s.inactivityExpiresAt=$expiry",
                Map.of("id", first.session().id(), "expiry", START.atOffset(ZoneOffset.UTC)));
        assertEquals(AuthFailure.SESSION_EXPIRED, assertThrows(SessionAuthException.class,
                () -> access.authenticate(tokens.parse(token))).failure());
        assertThrows(SessionAuthException.class, () -> access.issueAccessToken(first.session().id()));
    }

    @Test void explicitRevocationIsIdempotentAndRetainsHistory() {
        var first = create();
        assertTrue(sessions.revokeSession(first.session().id(), RevocationReason.EXPLICIT_LOGOUT));
        clock.set(START.plusSeconds(60));
        assertTrue(sessions.revokeSession(first.session().id(), RevocationReason.SECURITY_EVENT));
        var revoked = repository.find(first.session().id()).orElseThrow().session();
        assertEquals(START, revoked.revokedAt());
        assertEquals(RevocationReason.EXPLICIT_LOGOUT, revoked.revocationReason());
        assertEquals(AuthFailure.SESSION_REVOKED, rotate(first).failure());
        assertEquals(1, credentialCount(first.session().id()));
        assertFalse(sessions.revokeSession("missing", RevocationReason.EXPLICIT_LOGOUT));
    }

    @Test void repositoryRejectsMutationsWithoutTheSessionLock() {
        var first = create();
        assertThrows(IllegalStateException.class, () -> repository.write(tx -> {
            tx.revoke(first.session().id(), START, RevocationReason.EXPLICIT_LOGOUT);
            return null;
        }));
        assertNull(repository.find(first.session().id()).orElseThrow().session().revokedAt());
    }

    @RepeatedTest(5)
    void simultaneousRefreshesCreateOnlyOneSuccessorAndCommitStrictReplayRevocation() throws Exception {
        var first = create();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var ready = new CyclicBarrier(2);
            Callable<SessionResult> refresh = () -> { ready.await(5, TimeUnit.SECONDS); return rotate(first); };
            var one = pool.submit(refresh);
            var two = pool.submit(refresh);
            var results = List.of(one.get(20, TimeUnit.SECONDS), two.get(20, TimeUnit.SECONDS));
            assertEquals(1, results.stream().filter(SessionResult::succeeded).count());
            assertEquals(1, results.stream().filter(r -> r.failure() == AuthFailure.REFRESH_REUSED).count());
            assertEquals(2, credentialCount(first.session().id())); // A + exactly one B.
            assertEquals(RevocationReason.REFRESH_REUSE,
                    repository.find(first.session().id()).orElseThrow().session().revocationReason());
            var successor = results.stream().filter(SessionResult::succeeded).findFirst().orElseThrow();
            assertEquals(AuthFailure.SESSION_REVOKED, rotate(successor).failure());
        }
    }

    @Test void lockReallyBlocksIndependentRefreshUntilCommitAndStateIsReread() throws Exception {
        var first = create();
        var locked = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var holder = pool.submit(() -> repository.write(tx -> {
                assertTrue(tx.lock(first.session().id()));
                locked.countDown();
                await(release);
                tx.revoke(first.session().id(), START, RevocationReason.SECURITY_EVENT);
                return null;
            }));
            assertTrue(locked.await(5, TimeUnit.SECONDS));
            var refresh = pool.submit(() -> rotate(first));
            try {
                assertThrows(TimeoutException.class, () -> refresh.get(250, TimeUnit.MILLISECONDS));
            } finally { release.countDown(); }
            holder.get(10, TimeUnit.SECONDS);
            assertEquals(AuthFailure.SESSION_REVOKED, refresh.get(10, TimeUnit.SECONDS).failure());
            assertEquals(1, credentialCount(first.session().id()));
        } finally { release.countDown(); }
    }

    @RepeatedTest(5)
    void refreshAndRevocationRaceCannotLeaveAnActiveSuccessor() throws Exception {
        var first = create();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var ready = new CyclicBarrier(2);
            var refresh = pool.submit(() -> { ready.await(5, TimeUnit.SECONDS); return rotate(first); });
            var revoke = pool.submit(() -> { ready.await(5, TimeUnit.SECONDS);
                return sessions.revokeSession(first.session().id(), RevocationReason.EXPLICIT_LOGOUT); });
            var refreshed = refresh.get(20, TimeUnit.SECONDS);
            assertTrue(revoke.get(20, TimeUnit.SECONDS));
            assertNotNull(repository.find(first.session().id()).orElseThrow().session().revokedAt());
            assertTrue(credentialCount(first.session().id()) <= 2);
            if (refreshed.succeeded()) assertEquals(AuthFailure.SESSION_REVOKED, rotate(refreshed).failure());
            else assertEquals(AuthFailure.SESSION_REVOKED, refreshed.failure());
            assertThrows(SessionAuthException.class, () -> access.issueAccessToken(first.session().id()));
        }
    }

    @Test void cleanupIsBoundedRetainsLiveHistoryAndDeletesWholeTerminalFamiliesAfterRetention() {
        var live = create();
        rotate(live);
        var revoked1 = create();
        var revoked2 = create();
        sessions.revokeSession(revoked1.session().id(), RevocationReason.EXPLICIT_LOGOUT);
        sessions.revokeSession(revoked2.session().id(), RevocationReason.EXPLICIT_LOGOUT);
        clock.set(START.plus(Duration.ofDays(7)).minusSeconds(1));
        assertEquals(0, sessions.cleanupTerminalSessions(100));
        clock.set(START.plus(Duration.ofDays(7)));
        assertEquals(1, sessions.cleanupTerminalSessions(1));
        assertEquals(1, sessions.cleanupTerminalSessions(100));
        assertEquals(2, credentialCount(live.session().id()));
        clock.set(START.plus(Duration.ofDays(37)));
        assertEquals(1, sessions.cleanupTerminalSessions(100));
        assertEquals(0, scalar("MATCH (c:RefreshCredential) RETURN count(c) AS count", Map.of()));
        assertEquals(3, scalar("MATCH (owner) WHERE owner:Musician OR owner:Venue OR owner:Promoter RETURN count(owner) AS count", Map.of()));
    }

    private SessionResult create() {
        var result = sessions.createSession("musician-1", PersonaType.MUSICIAN, SessionTransport.WEB, null);
        assertTrue(result.succeeded());
        return result;
    }

    private SessionResult rotate(SessionResult current) { return sessions.rotateRefreshCredential(current.refreshCredential().reveal()); }
    private long credentialCount(String id) {
        return scalar("MATCH (:AuthSession {id:$id})-[:HAS_REFRESH_CREDENTIAL]->(c) RETURN count(c) AS count", Map.of("id", id));
    }
    private long scalar(String cypher, Map<String, Object> params) { return query(cypher, params).getFirst().get("count").asLong(); }
    private List<org.neo4j.driver.Record> query(String cypher, Map<String, Object> params) {
        try (var session = driver.session()) { return session.executeWrite(tx -> tx.run(cypher, params).list()); }
    }
    private void await(CountDownLatch latch) {
        try { assertTrue(latch.await(10, TimeUnit.SECONDS)); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new AssertionError(e); }
    }
}
