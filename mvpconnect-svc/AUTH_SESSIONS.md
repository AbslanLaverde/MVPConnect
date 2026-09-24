# Application login sessions — Phase 1

This backend foundation is additive. `AuthController` / `AuthService` still issue the existing
email-subject JWT through `JwtTokenProvider`, with the unchanged `jwt.expiration=86400000`.
No refresh/logout controller, cookies, native credential storage, or frontend cutover is included.
Provider OAuth credentials and refresh behavior are unchanged.

## Configuration and deployment

Production/default-profile startup requires these **new**, explicit settings:

| Property | Environment variable / default |
| --- | --- |
| `auth.session.signing-key-base64` | `AUTH_SESSION_SIGNING_KEY_BASE64`; Base64 encoding of at least 64 cryptographically random bytes |
| `auth.session.issuer` | `AUTH_SESSION_ISSUER`; required |
| `auth.session.audience` | `AUTH_SESSION_AUDIENCE`; required |
| `auth.session.access-ttl` | `30m` maximum/default |
| `auth.session.inactivity-ttl` | `30d` maximum/default |
| `auth.session.absolute-ttl` | `90d` maximum/default |

Provision the three new environment values before deploying this phase. Store the signing key in
secret management; do not put it in source control, command logs, or client configuration. Use a
separate key from the legacy signing key. `JWT_SECRET` remains **raw UTF-8**, not Base64, and
continues to be required for legacy clients. This phase does not reinterpret it or change its TTL.

Missing/invalid/undersized new keys and missing issuer/audience fail startup. The checked-in legacy
development fallback is denied as a new signing key (checked by fingerprint, without logging it).
TTL overrides can only shorten the limits, must be at least one second, and inactivity cannot
exceed absolute lifetime.

Only when `local` is the **sole** active profile, a missing new key generates an ephemeral HS512 key.
Local issuer/audience defaults are in `application-local.properties`. Restart invalidates tokens
signed with that ephemeral key; set the explicit new environment key for persistent local sessions.
Combining `local` with a production/other profile does not enable this exception. No known new
development signing key is shipped. Tests generate their own random keys.

## Persistence

The existing `Neo4jSchemaInitializer` adds idempotent statements for:

* unique `AuthSession.id`;
* unique `RefreshCredential.hash`;
* range indexes on `AuthSession.inactivityExpiresAt`, `absoluteExpiresAt`, and `revokedAt`.

```text
(Musician | Venue | Promoter)-[:HAS_AUTH_SESSION]->(AuthSession)
(AuthSession)-[:HAS_REFRESH_CREDENTIAL]->(RefreshCredential)
```

The random UUID session ID is both the family identifier and access-token `sid`. There is no
duplicate Account node or separate token-family entity. The repository requires exactly one
matching owner relationship and an existing owner with the appropriate persona label.

`AuthSession` fields: `id`, `ownerId`, `ownerPersona`, `transport`, `createdAt`, `authenticatedAt`,
`lastUsedAt`, `inactivityExpiresAt`, `absoluteExpiresAt`, `currentRefreshHash`, nullable `revokedAt`,
nullable `revocationReason`. Transport is `WEB` or `NATIVE`; revocation reasons are
`EXPLICIT_LOGOUT`, `REFRESH_REUSE`, and `SECURITY_EVENT`.

`RefreshCredential` fields: `hash`, `issuedAt`, nullable `consumedAt`. Only SHA-256 of the canonical
opaque credential is stored. The generator uses 32 SecureRandom bytes, encoded URL-safe without
padding. Raw credentials exist in a redacted `RefreshSecret` returned to the immediate caller;
transports will have to explicitly call `reveal()`. Entities/results never include secrets/hashes
in their `toString()` methods. Do not return internal session/result objects as public DTOs.

Java timestamps are `Instant`, persisted as UTC Neo4j datetimes. The injected `authSessionClock`
supplies time. `authenticatedAt` defaults to creation, can carry an earlier actual authentication
time, rejects future time, and never advances on refresh. Absolute expiration is immutable.

## Transaction and rotation guarantees

`AuthSessionRepository` uses the same Boot-managed driver/database as Spring Data Neo4j. Its
`write` callback owns a driver-managed transaction; it does **not** join an outer Spring transaction.
This explicit boundary allows returning a refresh failure while committing its reuse revocation.
Future signup/session orchestration must commit the persona before creating its session, and must
not send a credential or perform external side effects inside a retryable repository callback.

```text
hash A -> locate session ID -> acquire AuthSession write lock
       -> re-read session, ownership, credential and current time under lock
       -> reject revoked/expired/invalid state
       -> consumed A: revoke this session, return REFRESH_REUSED, commit
       -> current A: consume A, create hash B, update session, commit
       -> deliver raw B only after commit
```

The repository obtains the write lock using `SET s._authLock = true REMOVE s._authLock` in a
separate statement **before** dependent state is read. Removing the property does not release
the lock; Neo4j retains it until commit/rollback. See the
[Neo4j locking documentation](https://neo4j.com/docs/operations-manual/current/database-internals/concurrent-data-access/).
Rotation, revocation and cleanup use the same lock. `@Transactional` alone is not used as a
substitute for serialization. Driver retries may regenerate secrets, but only the committed
attempt's result can reach a caller.

Successful rotation updates `lastUsedAt` and `inactivityExpiresAt=min(now+30d, absoluteExpiresAt)`;
it preserves creation, authentication and absolute-expiration timestamps. At either expiration
boundary, `now >= expiry` is invalid. Unknown credentials produce an invalid result without
revoking any session. A recognized consumed credential revokes only its own family, and the
typed failure commits instead of throwing and rolling back.

Under the deliberately strict replay policy, simultaneous A/A requests create exactly one B,
then the second request revokes the family. B is consequently unusable. A lost refresh response
or uncoordinated retry can require signing in again; later clients must coordinate refresh.

## Session-aware access tokens

`SessionAccessTokenService.issueAccessToken(sid)` checks authoritative session/owner state, then
`SessionJwtTokenProvider` signs with explicitly pinned HS512. The exact claims are:

* `sub`: immutable persona ID;
* `userType`: `MUSICIAN`, `VENUE`, or `PROMOTER`;
* `sid`: AuthSession ID;
* `iat`, `exp`;
* configured `iss`, `aud`.

Expiration is `min(now+30m, inactivityExpiresAt, absoluteExpiresAt)`, rounded **down** to JWT
whole-second precision. No valid whole-second lifetime remaining means no token is issued.
Email, profile information and entitlements are not authoritative JWT claims.

Parsing requires signature/HS512, issuer, audience, required claims, valid persona, and token
times. `SessionAccessTokenService.authenticate` additionally loads the current session, checks
revocation/expiry/owner existence and binding, and resolves the principal by persona + immutable
ID. Validation uses writer-routed database reads, not potentially stale follower reads. There is
no session validity cache. A request already accepted when revocation occurs may finish; subsequent
validation rejects it. Database errors fail closed and are sanitized before escaping this boundary.

## Cleanup

`AuthSessionService.cleanupTerminalSessions(limit)` is the bounded integration point (`1..1000`
families per invocation). No new scheduler is introduced. It retains **all** history while a
session is usable, then retains it for seven days after revocation or expiration. Candidate
queries use the expiration/revocation indexes; each family is locked and its terminal state
rechecked before its session/history are deleted together. Owners are preserved. A single family
may contain many credential nodes; the batch limit bounds families, not individual node count.
Expiration enforcement never depends on cleanup running. Deployment should schedule bounded calls
through its existing job mechanism when session issuance is enabled.

## Phase 2 integration points

* Login: after credential validation / committed owner creation, call
  `AuthSessionService.createSession(ownerId, persona, transport, authenticatedAt)`, then
  `SessionAccessTokenService.issueAccessToken(sessionId)`.
* Refresh: call `rotateRefreshCredential(rawCredential)`, check its committed typed result,
  then issue an access token from the returned session ID. Map all invalid/revoked/reused results
  to the future generic public contract; do not leak internal status or session snapshots.
* Logout: resolve the current session from trusted authentication/refresh state, then call
  `revokeSession(sessionId, EXPLICIT_LOGOUT)`. The primitive is internal, not an authorization API
  for arbitrary caller-supplied session IDs.

Phase 2 owns Web cookie/CSRF/CORS details and native transport. Later frontend phases own secure
storage, coordinated refresh, startup restoration, API/cache reset and session-exit UX. Review
frontend login error logging in Phase 3; this phase intentionally changes no frontend files.
Rate limiting and refresh-response delivery belong to the transport rollout. Billing, step-up
auth, MFA and session-management UI remain deferred.

## Compatibility to remove at Phase 5 cutover

1. `JwtAuthenticationFilter`'s parse-failure fallback and legacy `JwtTokenProvider` injection.
   Session-validation failures already cannot enter this fallback.
2. `JwtTokenProvider`'s legacy issuance, validation and email/userId/userType parsing helpers.
3. `AuthService` login/signup calls to `generateToken` / `generateTokenFromEmail`, after all clients
   have switched to session issuance.
4. `jwt.secret`, `jwt.expiration`, and the local legacy fallback; retire `JWT_SECRET` deployment config.
5. `LegacyJwtCompatibilityTest` and legacy test-provider wiring in security tests.

Keep `CustomUserDetailsService.loadUserByUsername` for email/password **login**; only bearer-token
identity lookup stops using it. Preserve generic error hardening and secret-redacted DTO output.
The fallback verifies the legacy signature and explicitly rejects any `sid`, `iss`, or `aud`
marker, including malformed values. New tokens never gain authentication through a failed session
check. This is temporary compatibility, not a second permanent authentication architecture.

## Verification

Run `mvn -B test` with Java 21 from `mvpconnect-svc`. `neo4j-harness:5.26.23` is test-only and
starts a disposable real Neo4j database with Bolt; Docker or a running developer database is not
required. The harness suite runs with normal Surefire tests (not an optional/skipped profile).
It covers graph relationships, hash-only persistence, expiry boundaries, reuse/revocation,
retention, repeated simultaneous rotation, an explicit held-lock test, and refresh/revoke races.
Unit/security tests use real isolated JWT signing, the actual Spring Security chain, immutable
principal lookup, config startup validation and transitional legacy regression coverage.
