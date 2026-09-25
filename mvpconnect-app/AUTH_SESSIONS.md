# Frontend application sessions — Phases 3–4

The frontend consumes the backend Phase 2 application-session contract. Phase 3 owns active
sessions; Phase 4 restores them before navigation mounts. No authenticated shell/header or new
product destination is introduced. The existing flat navigator and persona pages remain intact.

## Boundaries

| File / area | Responsibility |
| --- | --- |
| `src/auth/authTransport.ts` | Separate Axios client for login, all signup personas, refresh and logout; runtime platform selection; bounded, sanitized errors |
| `src/auth/credentialStore.native.ts` | Native refresh credential only, through Expo SecureStore |
| `src/auth/credentialStore.web.ts` | No readable credential operations; browser owns its HttpOnly cookie |
| `src/auth/sessionController.ts` | Memory access token, immutable non-secret metadata, generation, token version, operation queue and refresh promise |
| `src/auth/authenticatedApi.ts` | Memory bearer injection, one retry, late-401 handling and stale-generation response rejection |
| `src/auth/sessionExit.ts` / `src/navigation/rootNavigation.ts` | Cache-reset integration and root Login reset with a typed optional notice |
| `src/auth/webCoordination.ts` | Same-origin cookie-operation lock, session-change events and pending-logout marker |
| `src/auth/session.ts` | Application singleton; creating it does not restore or refresh a session |
| `src/auth/SessionStartupBoundary.tsx` / `src/auth/sessionBootstrap.ts` | Neutral startup UI, retry, initial intent and one-time navigation readiness |
| `src/auth/startupEntry.ts` | Fresh shared `/me` + `/onboarding` cache and existing entry resolvers |
| `src/navigation/startupLink.ts` | Capture and validate the initial OAuth/auth link before navigation |

`services/api.ts` retains the existing caller-facing API methods. Auth methods now complete session
establishment and return non-secret identity plus `generation`; screens never receive refresh
credentials and do not save tokens. `store.ts` registers the RTK Query reset callback after store
creation to avoid a store/API/session import cycle. The controller itself is dependency-injected
for tests and does not depend on screens, Redux or onboarding draft rules.

## Credential transport and storage

Web auth calls send `X-MVP-Client: web`, JSON and `withCredentials: true`. Refresh/logout bodies
are `{}`. JavaScript never reads the cookie or copies a refresh credential into storage. Web
responses with any refresh-token field are rejected as invalid contracts.

Native calls send `X-MVP-Client: native`; refresh/logout include `refreshToken` in JSON. Expo SDK
51 selected `expo-secure-store ~13.0.2` via `npx expo install expo-secure-store`. Its config plugin
is registered with `faceIDPermission: false`; biometric authentication is not enabled. The key is
`mvpconnect.refresh-credential.v1`, using `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Access JWTs are never
written to SecureStore. The platform store uses Keychain on iOS and Keystore-backed encryption on
Android. Native builds must include the installed native module; no separate Keychain package is
needed. See [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

Android app backup is explicitly disabled (`android.allowBackup: false`). The installed 13.0.2
plugin only configures the iOS permission and does not generate the SecureStore backup exclusions
provided by newer SDKs. This keeps encrypted preferences out of app backups whose restored device
would lack the original Keystore keys; no custom native backup plugin is introduced.

Native login/signup must finish the SecureStore write before publishing access. Refresh must write
rotated credential B before publishing the new access token or resolving waiting requests. If the
write fails, the controller best-effort logs out using B, clears local credentials and returns to
Login without retrying consumed A or using AsyncStorage as a fallback. OS storage read failure also
ends the local session without falsely calling it expiry. Logout clears local memory even if a
remote request fails; credential deletion is attempted even when OS storage reports an error.

SecureStore is not a backup mechanism. Android reinstall removes its keys; iOS Keychain entries can
survive reinstall. Neither implies authenticated application state; startup restoration must still
validate the server session. No reinstall-based trust decision exists.

## Refresh, retry and generations

```text
ordinary authenticated API request
  -> bearer from memory + generation + token version
  -> 401
  -> one shared refresh promise (other callers wait)
  -> platform refresh under the auth-operation lock
  -> Native B safely stored / Web cookie handled by browser
  -> new memory access token
  -> retry original request once
```

A late 401 for a token already replaced uses the current token rather than rotating again. A
retried 401 ends the session. A 403 never refreshes. Auth endpoints use their own client, so they
cannot recurse through the ordinary interceptor. Network/5xx refresh failures reject waiting
requests, clear the in-flight promise, and preserve current local auth; they are not reported as
expired sessions. A terminal `401 SESSION_INVALID` triggers one global expired-session exit.

The generation advances when an authentication attempt replaces local state, when a new session
is published, and on exit/replacement. Refresh changes the token version without changing account
generation. Every API response/error is checked against its initiating generation before callers
receive it. RTK Query cache resets occur before new identity publication and on exit; onboarding
mutation cache side effects also check generation. Screens check generation before entry navigation.
Thus old account responses cannot populate a new account's `/me` or onboarding cache.

The local operation queue orders login/signup, refresh and logout. Sign Out immediately invalidates
memory/generation and resets the UI, then performs remote cleanup behind any in-flight rotation.
An in-flight Native rotation still stores B for the queued logout, but cannot publish its access
token after cancellation. Explicit sign-out and expiry share cleanup while keeping their notices
distinct. Login consumes `SESSION_EXPIRED` and displays exactly:

> Your session expired. Sign in again to continue.

Explicit Sign Out and session replacement do not show that notice. Root reset replaces the stack;
Back does not reveal the exited authenticated/onboarding screen.

## Web tabs and logout intent

All cookie-changing operations (login/signup/refresh/logout) use the same-origin Web Lock
`mvpconnect.auth-cookie.v1`. Two tabs rotate sequentially, so A -> B finishes before B -> C starts.
Web authentication **requires Web Locks on HTTPS or localhost**. Unsupported browsers fail closed
before auth HTTP; an unsafe localStorage lease is not used as a mutex. This is a deliberate browser
support boundary. See [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).

`BroadcastChannel` carries session-established/ended events. The storage event is the fallback if
BroadcastChannel is unavailable. Messages contain only an event type, random revision and optional
exit reason. No tokens, persona, email, user ID or session ID are broadcast or persisted.

The last non-secret event/revision is stored at `mvpconnect.session-event.v1`. A tab compares its
owned revision inside the lock before refreshing/logging out, protecting against delayed event
delivery and preventing it from revoking a replacement account's cookie. Out-of-order events are
ignored. Replacement invalidates the old tab's memory/cache and resets Login without logging out
the new shared session. See [Broadcast Channel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API).

Web Sign Out writes `mvpconnect.pending-logout.v1`, containing only the target revision, before
waiting for remote cleanup. It is retained on failure and survives reload; successful remote logout
clears it. Its revision binding prevents stale logout intent from targeting a newer cookie session.
Before a new login/signup, matching pending logout is attempted; safe new session establishment
clears the marker even if the preliminary cleanup failed. Startup honors this marker before
attempting restoration and retries remote logout under the same lock. It also rechecks the marker
after a refresh response, because another tab can record logout while this tab owns the lock.

No cross-origin lock is claimed. Deploy one canonical Web origin: Web Locks/BroadcastChannel/storage
coordinate tabs of that origin, not separate frontend origins that happen to share an API cookie.
Strict backend replay handling remains authoritative; an interrupted/lost refresh response can
still require signing in again. Clients must not independently retry refresh HTTP.

## Existing flow integration

Login preserves authoritative onboarding lookup and completed persona Home resolution. Signup
retains its persona-specific first step. Welcome and Home compositions are unchanged.
`useOnboardingSignOut` still waits for pending saves, saves valid dirty data, confirms invalid-data
discard and prevents duplicate activation. Only after those checks does it call shared `signOut()`.

Provider OAuth launch/status use the ordinary API's access/refresh machinery. Session-generation
and unmount checks stop late polling results or timers from returning to onboarding after exit.
Provider PKCE/state/tokens/encryption and backend behavior are untouched. A cold OAuth return is
captured and validated before navigation. A restored application session and fresh account state
are required before mounting OAuthResult and starting its existing polling. No valid session goes
to Login without polling. Retryable startup errors retain the validated intent. The original live
tab's existing polling continues using its own session.

Login's full Axios-error logging is removed. The legacy Profile screen also stops logging raw
Axios errors, which can contain bearer headers; no Profile behavior or navigation is implemented.

Direct signed object-storage uploads retain their separate `fetch` path; their failures do not
trigger application refresh. Only the MVPConnect calls that obtain/confirm upload metadata use
the authenticated API client. That client rejects external URLs instead of sending bearer credentials.

## Legacy cleanup and Phase 5

`saveAuthData` and `getAuthData` are removed. There are no active reads/writes of persisted bearer
tokens, and no persisted `userType` dependency. Successful new auth and local exits delete both
old AsyncStorage keys (`authToken`, `userType`) through `legacyStorage.ts`. Startup also deletes
them, including when no Native refresh credential exists. It never reads or exchanges the legacy
bearer. Legacy-only installations must sign in once to establish the new session.

Keep this deletion-only migration helper until supported installed clients have transitioned;
Phase 5 can remove it and its tests. The backend still retains temporary headerless 24h issuance
and legacy bearer validation; Phase 3 does not modify that backend compatibility. Public product
documentation is unchanged.

## Startup restoration — Phase 4

`App.tsx` loads fonts and mounts `SessionStartupBoundary` in parallel. The boundary presents one
neutral, accessible restoring screen, using system text while fonts load. Login and authenticated
pages are not mounted beneath it. Fonts ready (or a font-load error) plus a resolved bootstrap
permit navigation to mount.

```text
RESTORING
  -> SessionController.restore() under the existing platform auth-operation lock
  -> fresh RTK Query /me + /onboarding, if authenticated
  -> READY_UNAUTHENTICATED: Login (or an existing first-visit signup link)
  -> READY_AUTHENTICATED: resolved onboarding step / persona Home / validated OAuthResult
  -> ERROR_RETRYABLE: Retry or shared explicit Sign Out
```

The controller owns credentials; bootstrap only exposes a state and non-secret route. Refresh,
Native B persistence, and memory access publication use the same helpers as active sessions.
Concurrent startup callers share one restoration promise. No startup effect runs in Login, Home
or an Axios interceptor.

### Web outcomes

Refresh uses the existing cookie transport, `X-MVP-Client: web`, `withCredentials` and Web Lock.
No cookie inspection or JavaScript refresh-secret storage exists. The existing last session event
is the expected-session hint: `SESSION_ESTABLISHED` with no matching pending logout means expected.
This is UX only, never authentication. Explicit pending logout makes the hint false immediately;
confirmed invalidity records `SESSION_ENDED`. No redundant hint key is added.

A matching pending logout never refreshes. Best-effort logout clears the marker on success and
retains it on failure, then enters Login without expiry copy. Unsupported locks also leave a
known pending logout locally signed out. A logout recorded during refresh is honored before any
access publication. Markers remain bound to the browser session revision.

A successful restoration keeps the existing established revision, so a second restoring tab does
not invalidate the first. If a valid cookie has no established event, restoration publishes one.
Revision checks before and after refresh, at authoritative entry, and generation checks prevent
replacement-session races, including delayed cross-tab event delivery during `/me` lookup.

`401 SESSION_INVALID` shows the one-shot expired-session notice only if a prior session was
expected. A first visitor goes to Login without expiry copy. Network/service/coordination failures
retain potentially valid session state and show retryable startup UI.

### Native outcomes

No SecureStore credential means Login without expiry copy. With A present, refresh consumes A,
then B must persist before memory access is published. Invalidity clears credentials/cache and
shows expiry once. A temporary network failure or a SecureStore read error retains A for Retry.
A failed B write uses the existing fail-closed cleanup/revocation behavior; it never retries A.
A malformed rotation response also exits safely rather than retrying a possibly consumed token.

### Authoritative entry and errors

Restoration resets the shared API cache before obtaining fresh access. `loadStartupEntry` dispatches
existing `getSelfAccount` and `getOnboarding` queries with `forceRefetch: true`, then releases their
temporary subscriptions. Their results remain the shared cache entries used by pages. Identity
metadata in the session comes from `/me`; there is no separate startup account cache or JWT decoding.

`resolveAuthenticatedEntryRoute` preserves exact onboarding resume behavior, including READY.
`resolveAuthenticatedHomeRoute` chooses ArtistHome, VenueHome or PromoterHome for completed accounts.
Returning sessions skip Welcome. First completion still follows completion -> Welcome -> Enter ->
Home: bootstrap stops observing when the navigator takes ownership and cannot reroute that flow.

Temporary `/me` or onboarding failure retains the valid memory access token. Retry requests fresh
server state without an unnecessary refresh; the normal Phase 3 interceptor handles natural access
expiry. Auth invalidity during those requests uses the existing global session exit. A missing owner
ID, unusable persona or disagreeing account/workflow personas exits without guessing a destination.
Malformed workflow data, no resumable step or an unsupported step stays retryable: those indicate
recoverable server/client data incompatibility, not proven session expiry.

### Navigation and initial links

The flat AppNavigator mounts with a single explicit initial route. Login and Welcome are not pushed
beneath a restored Home/onboarding/OAuthResult route. React Navigation uses that initial state ahead
of initial URL state; its existing warm-link config remains. Native initial URL consumption is
disabled in the navigator because bootstrap already captured it. Web uses the current origin and
the existing OAuth return validator; Native uses the existing scheme validator. Only validated
attempt/provider/status data is retained across Retry, never raw provider credentials.

Cold onboarding/Welcome URLs do not override fresh workflow routing. Existing cold auth/signup
links remain available to unauthenticated first visitors. No Home/Profile URL mappings are added.
Startup does not navigate imperatively before the container is ready. `finishStartupNavigation`
acknowledges an exit already represented by initial Login, preventing a second reset/expiry notice;
an exit arriving after Home was selected still resets to Login through the existing root helper.

Browser/native transport behavior is covered with mocked platform APIs, real Axios interceptors,
the real RTK Query reducer/middleware and rendered screen regressions. Physical-device secure
storage and live multi-tab browser/network behavior still require device/browser QA. No billing,
entitlements, MFA/passkeys, shell/header or other product features are included.

## Verification

Run `npm test -- --ci`, `npm run typecheck`, and repository-root
`git -c core.safecrlf=false diff --check`. CI defines no frontend lint script.
Tests cover Web/native transport, SecureStore ordering/failure, eight concurrent 401s, bounded retry,
late responses, root exits/notices, cross-tab serialization/events/pending logout, real API-cache
isolation, all persona entry routes, onboarding save/discard rules and OAuth lifecycle isolation.
Startup coverage adds neutral rendering/font gating, retryable UI, cold OAuth intent, legacy cleanup,
restored fresh cache, account/workflow integrity, cross-tab startup races and real NavigationContainer
single-route/back behavior. Jest transforms the installed safe-area/gesture/screens modules for that
navigation integration test; production dependencies are unchanged.
