# Frontend application sessions — Phase 3

Phase 3 consumes the backend Phase 2 application-session contract. Startup restoration is **not
implemented**: a fresh launch/reload still starts at Login. No authenticated shell/header or new
product destination is introduced.

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
survive reinstall. Neither implies authenticated application state; future restoration must still
validate the server session. No reinstall-based trust decision exists in Phase 3.

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
clears the marker even if the preliminary cleanup failed. Phase 4 must honor this marker before
attempting restoration and retry remote logout when appropriate.

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
Provider PKCE/state/tokens/encryption and backend behavior are untouched. An OAuth return in a
fresh runtime without memory auth goes to Login; Phase 4 restoration will cover cold returns. The
original live tab's existing polling continues using its own session.

Login's full Axios-error logging is removed. The legacy Profile screen also stops logging raw
Axios errors, which can contain bearer headers; no Profile behavior or navigation is implemented.

Direct signed object-storage uploads retain their separate `fetch` path; their failures do not
trigger application refresh. Only the MVPConnect calls that obtain/confirm upload metadata use
the authenticated API client. That client rejects external URLs instead of sending bearer credentials.

## Legacy cleanup and Phase 5

`saveAuthData` and `getAuthData` are removed. There are no active reads/writes of persisted bearer
tokens, and no persisted `userType` dependency. Successful new auth and local exits delete both
old AsyncStorage keys (`authToken`, `userType`) through `legacyStorage.ts`.

Keep this deletion-only migration helper until supported installed clients have transitioned;
Phase 5 can remove it and its tests. The backend still retains temporary headerless 24h issuance
and legacy bearer validation; Phase 3 does not modify that backend compatibility. Public product
documentation is unchanged.

## Phase 4 integration points and limits

Add a neutral startup boundary around AppNavigator in Phase 4. It must inspect pending Web logout
intent before restoration, then use the existing platform transport/credential stores and the same
operation locks, native write-before-publish ordering, generations and cache reset. Extend the
controller with an explicit restoration operation; do not put startup effects in Axios interceptors.
After refresh, resolve authoritative `/me` and onboarding state through existing entry resolvers.
Preserve first-completion Welcome behavior. Phase 3 intentionally exposes no automatic restore call.

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
