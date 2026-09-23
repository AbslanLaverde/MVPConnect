# Environment and secrets

Authoritative configuration keys live in [application.properties](../mvpconnect-svc/src/main/resources/application.properties), [compose.yaml](../compose.yaml), and the two `.env.example` files. This guide documents public configuration and secret boundaries; environment-specific values belong outside version control.

## Configuration boundaries

| Consumer | How values arrive | Secret boundary |
| --- | --- | --- |
| Docker Compose | Environment or an untracked environment file | Only settings referenced by Compose are passed to its containers |
| Spring Boot | Process environment or Spring configuration | Secrets are supplied by the deployment environment |
| Expo | `mvpconnect-app/.env` and process environment | Every `EXPO_PUBLIC_*` value is public client configuration |
| Optional MCP prototype | Process environment | Direct database credentials; separate from Spring configuration |

Real credentials, tokens, presigned URLs, database exports, and OAuth callback captures belong outside tracked documentation. `.env` and `.env.local` are ignored; arbitrary filenames containing secrets may not be. Check the staged diff before committing. Every deployed environment must supply database credentials and a JWT signing secret through its controlled configuration system.

## Backend and infrastructure

| Variables | Purpose / default | Required when |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | Selects a Spring configuration profile | An environment requires profile-specific behavior |
| `SPRING_NEO4J_URI`, `SPRING_NEO4J_AUTHENTICATION_USERNAME`, `SPRING_NEO4J_AUTHENTICATION_PASSWORD` | Neo4j Bolt URI and credentials | Required by the backend runtime |
| `SPRING_DATA_NEO4J_DATABASE` | Neo4j database; defaults to `neo4j` | Selecting a different database |
| `JWT_SECRET` | Signing key; implementation uses UTF-8 bytes, not Base64 decoding | Required; use at least 32 random bytes of key material represented as a string |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact browser origins | Required for each authorized web origin |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | Optional Compose-managed object-storage administration credentials | Using the supplied object-storage Compose service |
| `MINIO_API_PORT`, `MINIO_CONSOLE_PORT`, `MINIO_API_CORS_ALLOW_ORIGIN` | Optional Compose exposure and CORS settings | Customizing the supplied object-storage service |
| `MINIO_MEDIA_BUCKET` | Bucket created by the supplied initialization service | Using the supplied object-storage service; keep aligned with the backend bucket |
| `MEDIA_STORAGE_BUCKET`, `AWS_REGION` | Backend bucket `mvpconnect-media` and region `us-east-1` | Selecting the provider's bucket and region |
| `MEDIA_STORAGE_ENDPOINT`, `MEDIA_STORAGE_PATH_STYLE_ACCESS` | Optional custom S3-compatible endpoint and addressing mode | Required for providers that do not use standard AWS S3 resolution |
| `MEDIA_STORAGE_ACCESS_KEY`, `MEDIA_STORAGE_SECRET_KEY` | Explicit object-storage credentials | When the default AWS credential provider chain is not used |
| `MEDIA_STORAGE_MAX_FILE_SIZE` | 10MB | Changing image limit |
| `MEDIA_UPLOAD_URL_EXPIRATION`, `MEDIA_ACCESS_URL_EXPIRATION` | Both 15m | Changing presigned URL lifetime |

For AWS S3 configuration, normally omit the custom endpoint and explicit access keys, use the default AWS credential provider chain, and provide a private bucket plus the required IAM permissions. This is supported configuration, not evidence of a deployed AWS environment. See [media storage](../mvpconnect-svc/MEDIA_STORAGE.md).

## Optional provider integration

YouTube/SoundCloud OAuth is currently offered for musician accounts. URL-provider options differ by persona; see `externalConnectionService.ts` and backend connection services.

| Variables | Enables | Without configuration |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | Backend Google Places (New) location/venue lookup | Manual entry remains available; provider lookup is unavailable |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Spotify Client Credentials artist lookup | Spotify operations return an unavailable error; no Spotify user login is implied |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` | YouTube OAuth connection | Connection operations unavailable |
| `SOUNDCLOUD_CLIENT_ID`, `SOUNDCLOUD_CLIENT_SECRET`, `SOUNDCLOUD_REDIRECT_URI` | SoundCloud OAuth connection | Connection operations unavailable |
| `OAUTH_TOKEN_ENCRYPTION_KEY_BASE64`, `OAUTH_TOKEN_ENCRYPTION_KEY_VERSION` | Encryption of provider credentials; Base64-encoded random 32-byte key, version defaults to 1 | OAuth connection operations unavailable |
| `OAUTH_RETURN_ALLOWED_TARGETS` | Exact allowed app return destinations | Configure the supported web/native return destinations |
| `OAUTH_ATTEMPT_TTL` | Attempt lifetime; defaults to `10m` | Changing the authorization-attempt lifetime |

Register the exact backend callbacks `{api-origin}/external-connections/oauth/youtube/callback` and `{api-origin}/external-connections/oauth/soundcloud/callback` with their providers. They are different from the frontend return destination. Never put provider secrets or the encryption key in Expo variables. Losing the encryption key requires reconnecting providers; preserve it securely with the environment it protects. For protocol and connection behavior, see [external connections](../mvpconnect-svc/MEDIA_CONNECTIONS.md).

## Frontend and diagnostics

- `EXPO_PUBLIC_API_BASE_URL`: public base URL for the Spring Boot API.
- `EXPO_PUBLIC_OAUTH_RETURN_TARGET`: exact web or native return target; it must match a backend allowed target. The supported native scheme is `mvpconnect://oauth/result`.
- `APP_LOG_LEVEL`: runtime log threshold. Spring's `logging.file.name` controls file output; `LOG_FILE` is a profile-specific alias for that property.
- `LOG_MAX_FILE_SIZE`, `LOG_MAX_HISTORY`, `LOG_TOTAL_SIZE_CAP`, `SLOW_OPERATION_THRESHOLD_MS`: 20MB, 30, 1GB, and 1000 respectively. See [logging](../mvpconnect-svc/LOGGING.md).

The optional MCP prototype uses `CRESCENDO_API_URL`, `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASS`. Its direct graph reads do not inherit API authorization or public DTO privacy rules, so it must be restricted to a trusted environment.
