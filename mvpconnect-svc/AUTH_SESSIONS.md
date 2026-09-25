# Application login sessions — Phases 1 and 2

The backend now exposes login/signup, refresh and logout for explicitly opted-in Web and Native
clients. Requests to login/signup **without** `X-MVP-Client` still receive the existing email-subject
JWT through `JwtTokenProvider`, with unchanged `jwt.expiration=86400000` (24 hours) and response
fields. This is temporary compatibility for the current frontend, not the target session design.
No frontend cutover, native storage, or application-shell changes are included. Provider OAuth
credentials, encryption, callbacks, state/PKCE and provider refresh behavior are unchanged.

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
| `auth.session.http.cookie-name` | `AUTH_REFRESH_COOKIE_NAME`; default `__Secure-mvp-refresh` |
| `auth.session.http.cookie-path` | `AUTH_REFRESH_COOKIE_PATH`; default `/auth` |
| `auth.session.http.cookie-secure` | `true`; only the sole `local` profile permits `false` |
| `auth.session.http.cookie-same-site` | `AUTH_REFRESH_COOKIE_SAME_SITE`; default `Lax` |
| `cors.allowed-origins` | existing `CORS_ALLOWED_ORIGINS`; comma-separated exact trusted origins |

Provision the signing key, issuer, audience and explicit HTTPS Web origins before production
deployment. The existing default localhost HTTP origins are accepted only with the sole `local`
profile, so a production/default-profile deployment must configure `CORS_ALLOWED_ORIGINS`.
Store the signing key in
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

### Cookie configuration

`AuthSessionHttpProperties` validates configuration at startup. Outside the sole `local` profile,
the refresh cookie must be Secure and use a `__Secure-` name. `SameSite` accepts `Lax`, `Strict`,
or `None`; `None` always requires Secure. Cookie paths must end in `/auth` (a context-prefix path
such as `/api/auth` is supported). `__Host-` is rejected because that prefix requires Path=/.
Trusted origins must be exact HTTPS origins without paths, credentials, wildcards or `null`.
There are no hardcoded production hosts.

`application-local.properties` explicitly selects `mvp-refresh-local`, Secure=false, for local
HTTP. Mixing `local` with another profile does not bypass validation. The cookie is always HttpOnly
and host-only; no Domain override is exposed. `RefreshCookie` constructs both setting and deletion
headers with identical name/path/security attributes. Max-Age is the nonnegative whole seconds
remaining until `min(inactivityExpiresAt, absoluteExpiresAt)`, recalculated after every rotation.
The database remains authoritative even if a client keeps an expired/revoked cookie.

Production requires HTTPS, including at the browser-facing proxy. Prefer a same-site Web/API
deployment for the Lax default. A deliberately cross-site deployment can configure None+Secure,
but must account for browser third-party-cookie restrictions. Do not weaken production settings
to accommodate local HTTP. Proxies must preserve Origin and Fetch Metadata headers; stripping
them would defeat browser/native transport separation.

## HTTP contract and Phase 3 integration

`AuthController` orchestrates the following application-session endpoints. The header is a typed
transport selector (`WEB` / `NATIVE` internally), **not** an authentication factor. Values are
case-insensitive with surrounding whitespace trimmed; unknown, duplicate or required-but-missing
values fail with 403 `AUTH_TRANSPORT_INVALID`.

| Endpoint | No client header | `X-MVP-Client: web` | `X-MVP-Client: native` |
| --- | --- | --- | --- |
| `POST /auth/login` | legacy 24h JWT, 200 | password authentication, WEB session, cookie, 200 | password authentication, NATIVE session, JSON credential, 200 |
| `POST /auth/signup/musician` | legacy signup, 201 | committed Musician, WEB session, cookie, 201 | committed Musician, NATIVE session, JSON credential, 201 |
| `POST /auth/signup/venue` | legacy signup, 201 | committed Venue, WEB session, cookie, 201 | committed Venue, NATIVE session, JSON credential, 201 |
| `POST /auth/signup/promoter` | legacy signup, 201 | committed Promoter, WEB session, cookie, 201 | committed Promoter, NATIVE session, JSON credential, 201 |
| `POST /auth/refresh` | rejected | cookie only; rotate, new access, replacement cookie, 200 | JSON credential; rotate, new access and credential, 200 |
| `POST /auth/logout` | rejected | revoke family, delete cookie, 204 | revoke family, 204; client deletes its own stored credential |

Login requests retain `{ "email": "...", "password": "..." }`. Signup request fields and validation
remain unchanged, including persona-specific `name`, `venueName`, and `businessName`.
Session-aware login/signup return exactly these common fields:

```json
{
  "accessToken": "<session JWT>",
  "tokenType": "Bearer",
  "expiresIn": 1800,
  "sessionId": "<session UUID>",
  "userId": "<immutable persona ID>",
  "userType": "MUSICIAN",
  "email": "<current email>",
  "name": "<current display name>"
}
```

`userType` is MUSICIAN, VENUE, or PROMOTER. `expiresIn` is the JWT's actual exp-minus-iat in seconds,
normally 1800 and shorter near session expiration. Session-aware refresh returns only `accessToken`,
`tokenType`, `expiresIn`, and `sessionId`. **Native only** adds `refreshToken` to either response.
Distinct Web DTOs have no refresh-token field, including no null placeholder. Secret-bearing
response/request DTOs have redacted `toString()` output. Session-aware requests do not issue a
legacy JWT as a side effect. Sensitive responses use `Cache-Control: no-store` (success also uses
`Pragma: no-cache`).

Web refresh/logout accept an absent body or `{}`; any `refreshToken` field, even null, is rejected.
They read only the configured cookie. Native refresh/logout accept `{ "refreshToken": "..." }`
and reject the configured browser cookie. Unknown JSON fields and malformed credential bodies
are rejected. Missing Native credentials fail refresh but are idempotent for logout.
Neither endpoint requires a valid access JWT; absent, expired or invalid bearer credentials do
not prevent the refresh credential from being processed. Other endpoint access rules and stateless
Spring Security sessions are unchanged.

Logout identifies the family using the hashed credential, locks it, checks stored transport and
revokes it with `EXPLICIT_LOGOUT`. A known consumed credential can revoke its family but can never
refresh or issue access. Unknown/missing credentials and already-revoked sessions return 204;
Web deletes the cookie. Existing revocation reasons are preserved on repeated revocation.
No caller-supplied session ID is accepted for logout. Transport mismatch is a generic 401
`SESSION_INVALID`, without modifying the session.

### Browser transport and CSRF policy

`AuthClientTransportResolver` requires an exact configured Origin for every session-aware Web
login/signup/refresh/logout request, plus the custom header and application/json whenever a body
or Content-Type is present. CORS reuses the existing explicit allowed-origin list with credentials;
Content-Type, Authorization and X-MVP-Client are allowed. No wildcard origin is permitted.
`AuthSessionTransportFilter` validates before authentication and supplies bounded JSON errors;
trusted cross-origin clients also receive CORS headers on those errors. Untrusted CORS preflights
are rejected by Spring CORS and need not have an auth JSON envelope.

Native rejects **any** Origin (including null/blank) or Sec-Fetch-* header. Normal browser custom-
header POSTs carry browser-controlled Origin/Fetch Metadata, so browser JavaScript cannot select
the Native secret-return response by changing X-MVP-Client. Missing Origin alone is not proof of
identity: password or refresh-credential validation is still required. Session transport is also
checked inside the rotation/revocation lock, preventing conversion of an existing Web credential
into a Native response. No fingerprinting or separate synchronizer-token endpoint is introduced.

Browser header semantics: [Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin)
and [Sec-Fetch-Site](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site).

### Errors

Auth errors retain the existing `ErrorResponse` envelope: `timestamp`, `status`, `error`, `code`,
`message`, `path`, and nullable `details`. Session transport errors leave `details` empty. Clients
should branch on status/code, not the human-readable message.

| Status / code | Meaning | Web cookie |
| --- | --- | --- |
| 401 `INVALID_CREDENTIALS` | login authentication failed | unchanged |
| 401 `SESSION_INVALID` | unknown/missing, expired, revoked, replayed or wrong-transport credential; invalid owner/session | deleted after validated Web transport |
| 403 `AUTH_TRANSPORT_INVALID` | missing/unknown/duplicate header or Native mixed cookie | unchanged |
| 403 `AUTH_ORIGIN_FORBIDDEN` | missing/untrusted Web origin or browser context on Native | unchanged |
| 400 `AUTH_REQUEST_INVALID` | malformed/non-JSON/mixed credential body or invalid session-aware input | unchanged |
| 503 `AUTH_SERVICE_UNAVAILABLE` | session/database infrastructure failure | unchanged |
| 500 `AUTH_SERVICE_UNAVAILABLE` | unexpected internal auth failure, sanitized | unchanged |

Existing duplicate-email and legacy validation errors retain their existing conventions. No raw
exception message, refresh hash or internal reuse/revocation reason is returned. Temporary service
failure is not reported as invalid authentication and does not delete a potentially valid cookie.

### Frontend work deliberately deferred

Phase 3 Web calls must send `X-MVP-Client: web`, JSON when a body exists, and Axios `withCredentials:
true` / fetch `credentials: "include"`; the browser supplies Origin and manages the HttpOnly cookie.
Never read or copy the Web refresh credential into JavaScript storage. Native calls send
`X-MVP-Client: native`, no browser Origin/Fetch Metadata/cookie, and the credential in JSON; store
and replace that credential in SecureStore in Phase 3. Both platforms will keep access tokens in
memory and use `Authorization: Bearer <accessToken>` on protected requests.

Coordinate refresh as one in-flight operation, update credentials before retrying waiting requests,
and allow at most one refresh/retry per original request. A terminal 401 `SESSION_INVALID` should
clear auth/API state and return to Login with the session-expired message. Explicit logout must
not show that message. Preserve the distinction between terminal auth failure and 400/403/5xx or
network failure. Startup restoration, SecureStore, session exit and API/cache resets are not
implemented here. Current headerless clients continue using their existing persisted 24h token.

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
HTTP orchestration explicitly calls `reveal()` only for credential delivery. Entities/results never include secrets/hashes
in their `toString()` methods. Do not return internal session/result objects as public DTOs.

Java timestamps are `Instant`, persisted as UTC Neo4j datetimes. The injected `authSessionClock`
supplies time. `authenticatedAt` defaults to creation, can carry an earlier actual authentication
time, rejects future time, and never advances on refresh. Absolute expiration is immutable.

## Transaction and rotation guarantees

`AuthSessionRepository` uses the same Boot-managed driver/database as Spring Data Neo4j. Its
`write` callback owns a driver-managed transaction; it does **not** join an outer Spring transaction.
This explicit boundary allows returning a refresh failure while committing its reuse revocation.
`AuthService.createMusician/createVenue/createPromoter` run outside any outer Spring transaction
(`NOT_SUPPORTED`); the SDN repository save commits before returning an `AuthIdentity`. Only then
does `AuthController` create the session in its separate transaction and issue access. Legacy
signup wrappers reuse the same account creation and retain their previous token response. This
preserves the existing save-before-token boundary; it does not make account creation plus session
creation one atomic operation. If session creation fails after account commit, the account remains
and can recover by logging in. Do not delete it or retry signup blindly. Credentials are never
sent, nor are external side effects performed, inside a retryable repository callback.

```text
hash A -> locate session ID -> acquire AuthSession write lock
       -> re-read session, ownership, credential and current time under lock
       -> check stored transport matches resolved HTTP transport
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

## Backend integration boundaries

* Login: after credential validation / committed owner creation, call
  `AuthSessionService.createSession(ownerId, persona, transport, authenticatedAt)`, then
  `SessionAccessTokenService.issueAccessResponse(sessionId)`.
* HTTP refresh: call `rotateRefreshCredential(rawCredential, resolvedTransport)`, check its
  committed typed result, then issue an access response from the same session ID. The original
  one-argument primitive remains for internal Phase 1 integration/tests; HTTP never uses it.
* HTTP logout: call `revokeRefreshSession(rawCredential, resolvedTransport)`. The arbitrary-ID
  `revokeSession` primitive remains internal for trusted security operations/tests.

`RequestLoggingFilter` logs method/path/status only, not headers, body or response. The application
logging aspect reports operation/type/status without arguments or raw results. Tests exercise both
with real Web/Native credential flows. Do not enable raw HTTP/body logging at the application,
proxy or APM layer. Review frontend login error logging during Phase 3.
Deployment rate limiting, cleanup scheduling, billing, step-up authentication, MFA and session-
management UI remain outside this change.

## Compatibility to remove at Phase 5 cutover

1. `JwtAuthenticationFilter`'s parse-failure fallback and legacy `JwtTokenProvider` injection.
   Session-validation failures already cannot enter this fallback.
2. `JwtTokenProvider`'s legacy issuance, validation and email/userId/userType parsing helpers.
3. `AuthController`'s header-absent legacy branches and `AuthService` legacy login/signup wrappers /
   `legacySignupResponse`, after all clients have switched to session issuance. Make the supported
   transport header mandatory for login/signup and remove legacy-only tests.
4. `jwt.secret`, `jwt.expiration`, and the local legacy fallback; retire `JWT_SECRET` deployment config.
5. `LegacyJwtCompatibilityTest` and legacy test-provider wiring in security tests.

Keep `CustomUserDetailsService.loadUserByUsername` for email/password **login**; only bearer-token
identity lookup stops using it. Preserve generic error hardening and secret-redacted DTO output.
The fallback verifies the legacy signature and explicitly rejects any `sid`, `iss`, or `aud`
marker, including malformed values. New tokens never gain authentication through a failed session
check. This is temporary compatibility, not a second permanent authentication architecture.

## Verification

Run `mvn -B '-Dmaven.repo.local=C:\Users\User\.m2\repository' clean test` with Java 21 from
`mvpconnect-svc` in this Windows workspace (other environments can use their normal Maven cache).
Then run `git -c core.safecrlf=false diff --check` from the repository root.
`neo4j-harness:5.26.23` is test-only and
starts a disposable real Neo4j database with Bolt; Docker or a running developer database is not
required. The harness suite runs with normal Surefire tests (not an optional/skipped profile).
It covers graph relationships, hash-only persistence, expiry boundaries, reuse/revocation,
retention, repeated simultaneous rotation, an explicit held-lock test, and refresh/revoke races.
Unit/security tests use real isolated JWT signing, the actual Spring Security chain, immutable
principal lookup, config startup validation and transitional legacy regression coverage.

`AuthTransportIntegrationTest` runs MockMvc through the real SecurityFilterChain, password
authentication, SDN persona repositories and an independent real Neo4j driver. It covers all
three signup/login personas and both transports; legacy 24h issuance; committed rotation before
access issuance; replay, expiry, revocation and transport separation; idempotent consumed-token
logout; cookie/CORS/error behavior; infrastructure failures; account recovery after session-create
failure; and credential-free request/application logs. `AuthSessionHttpPolicyTest` checks cookie
attributes/lifetime, request ambiguity and DTO redaction. `AuthSessionHttpConfigTest` rejects unsafe
production configuration and verifies the sole-local exception. Existing Phase 1 concurrency and
provider OAuth tests run unchanged in the full backend suite. No additional schema migration is
needed for Phase 2.
