# MVPConnect external media connections

This document covers the Pass 1 account-level provider foundation. The real
persona Media onboarding screens are intentionally deferred to Pass 2.

## Canonical models

URL and OAuth accounts use:

```text
(:Musician|Venue|Promoter)-[:HAS_EXTERNAL_CONNECTION]->(:ExternalConnection)
```

`ExternalConnection.ownerProviderKey` is unique and permits one current
connection per owner/provider. Methods are `OAUTH`, `PROFILE_URL`, and
`PROVIDER_SEARCH`; statuses are `CONNECTED`, `UNVERIFIED`, and `ERROR`.
Disconnecting deletes the owner-scoped connection node, including encrypted
credentials. Public DTOs return only active/unverified publishable identity;
`/me` adds safe management state but never credential or storage internals.

OAuth connections may also retain a nullable `providerImageUrl` supplied by the
trusted provider identity response. It is presentation metadata only: values
must be absolute HTTPS URLs, are never accepted from frontend requests, and are
not downloaded or represented as MVPConnect `MediaAsset` data. YouTube uses the
best available channel `snippet.thumbnails` image (`high`, then `medium`, then
`default`); SoundCloud uses the account-level `/me.avatar_url` value.

Artist Spotify/catalog identity is deliberately separate:

```text
(:Musician)-[:HAS_ARTIST_IDENTITY]->(:ExternalArtist)
```

It means self-identification, not verified ownership. Replace/disconnect removes
only this relationship; the shared `ExternalArtist` and `SOUNDS_LIKE`
relationships are unaffected.

## Persona/provider rules

| Persona | URL/profile | OAuth | Special identity |
| --- | --- | --- | --- |
| Artist (`MUSICIAN`) | Instagram, TikTok, Bandcamp | YouTube, SoundCloud | Spotify `ExternalArtist` |
| Venue | Instagram, Facebook, TikTok | none | none |
| Promoter | Instagram, Facebook, TikTok | none | none |

URL inputs are HTTP(S), length-limited, and provider-host restricted. Instagram
and TikTok handles are canonicalized without fetching user URLs. A legacy Artist
`instagramHandle` remains readable only when there is no canonical Instagram
connection; public output never emits two Instagram identities.

## Authenticated APIs

```text
GET    /external-connections
PUT    /external-connections/url
DELETE /external-connections/{provider}
POST   /external-connections/oauth/{provider}/start
GET    /external-connections/oauth/attempts/{attemptId}

GET    /me/artist-identity
PUT    /me/artist-identity
DELETE /me/artist-identity
```

Only these exact provider callbacks are public:

```text
GET /external-connections/oauth/youtube/callback
GET /external-connections/oauth/soundcloud/callback
```

All owner identity comes from JWT authentication or the server-side OAuth
attempt. Clients cannot provide an arbitrary owner ID.

## OAuth security and behavior

- Start creates high-entropy state, persists only its SHA-256 hash, creates a
  PKCE verifier/challenge, and binds the attempt to owner, persona, provider,
  expiry, and an exact allowlisted return target.
- Attempts are short-lived and consumed atomically once. Callback query owner
  data is never trusted.
- The provider code is exchanged only by the backend. Return URLs contain only
  opaque attempt ID, provider, and success/failure status.
- Access and refresh tokens use AES-256-GCM with a random 96-bit nonce, 128-bit
  authentication tag, version prefix, and owner/provider/token-kind associated
  data. Missing encryption configuration fails only OAuth operations.
- Refresh is expiry-aware. Credential updates use a version compare-and-set so a
  rotating SoundCloud refresh token cannot be overwritten. Error state is also
  version-guarded; a concurrent successful refresh wins.
- YouTube requests only `youtube.readonly`, offline access, and the authenticated
  channel via `channels.list(mine=true)`.
- SoundCloud uses authorization-code PKCE, identifies the account through `/me`,
  and persists rotated refresh credentials atomically.

Never log client secrets, provider codes, Authorization headers, plaintext or
encrypted tokens, or nonces.

## Local configuration

Put secrets in the IntelliJ Spring Boot run configuration under **Environment
variables**, or in the process environment. Do not put them in Git-tracked files.

```ini
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:8080/external-connections/oauth/youtube/callback

SOUNDCLOUD_CLIENT_ID=
SOUNDCLOUD_CLIENT_SECRET=
SOUNDCLOUD_REDIRECT_URI=http://localhost:8080/external-connections/oauth/soundcloud/callback

OAUTH_TOKEN_ENCRYPTION_KEY_BASE64=
OAUTH_TOKEN_ENCRYPTION_KEY_VERSION=1
OAUTH_RETURN_ALLOWED_TARGETS=mvpconnect://oauth/result,http://localhost:19006/oauth/result
CORS_ALLOWED_ORIGINS=http://localhost:19006
```

Generate a key in PowerShell without printing or committing it anywhere except
your local secret/run configuration:

```powershell
$keyBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($keyBytes)
[Convert]::ToBase64String($keyBytes)
```

The encoded value must decode to exactly 32 bytes. Keep the key backed up in the
deployment secret manager; losing it requires connected users to reconnect.

Register these exact local provider redirect URIs:

```text
http://localhost:8080/external-connections/oauth/youtube/callback
http://localhost:8080/external-connections/oauth/soundcloud/callback
```

Deployed callback URIs must use the deployed HTTPS backend host. Also configure
the exact web/app result targets in `OAUTH_RETURN_ALLOWED_TARGETS`, the web origins
in `CORS_ALLOWED_ORIGINS`, and the frontend's public
`EXPO_PUBLIC_OAUTH_RETURN_TARGET`. Native builds use
`mvpconnect://oauth/result`; web uses its exact `/oauth/result` URL.

Provider developer-console test users, publishing/app review, and production
availability depend on the provider application's actual status; this repository
does not assume or encode that status.

## Account-deletion preparation

There is no production account-deletion workflow yet. A future deletion must run
in this order:

1. enumerate owner-scoped `ExternalConnection` nodes;
2. remove their encrypted credential records independently of public profile
   data;
3. enumerate owner-scoped `MediaAsset` records and delete storage objects first;
4. after storage succeeds, delete those media nodes/relationships;
5. remove `HAS_ARTIST_IDENTITY` with the account, without deleting shared
   `ExternalArtist` nodes;
6. delete the persona/onboarding graph and verify no owner-scoped connection or
   media data remains.

This ordering preserves shared ExternalArtist/VenueIdentity reference data and
avoids hidden ownership ambiguity.

## Pass 2 UI notes

Media must be the single current progress step: Artist `04 / 05` with the
blue-to-violet accent, Venue `05 / 06` violet, and Promoter `04 / 05` electric
blue. The existing `OnboardingShell` is authoritative. Gallery slots wrap
responsively, provider raster logos from mockups are not copied, and update-later
promises must not be shown until post-onboarding editing actually exists.
