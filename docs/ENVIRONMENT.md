# Environment and secrets

Authoritative defaults live in [application.properties](../mvpconnect-svc/src/main/resources/application.properties), [application-local.properties](../mvpconnect-svc/src/main/resources/application-local.properties), [compose.yaml](../compose.yaml), and the two `.env.example` files. This guide groups normal setup settings; the properties files also expose provider base-URL and timeout overrides used for testing.

## Configuration boundaries

| Consumer | How values arrive | Secret boundary |
| --- | --- | --- |
| Docker Compose | Root `.env` or shell environment | Only settings referenced by Compose are passed to its containers |
| Spring Boot | Process/IDE environment, Spring configuration | Root `.env` is not automatically imported |
| Expo | `mvpconnect-app/.env` and process environment | Every `EXPO_PUBLIC_*` value is public client configuration |
| Optional MCP prototype | Process environment | Direct database credentials; separate from Spring configuration |

Real credentials, tokens, presigned URLs, database exports, and OAuth callback captures belong outside tracked documentation. `.env` and `.env.local` are ignored; arbitrary filenames containing secrets may not be. Check `git status` and the staged diff before committing. The checked-in database, JWT, and MinIO defaults are development values, not deployment secrets.

## Backend and infrastructure

| Variables | Purpose / default | Required when |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `local` activates MinIO defaults and detailed local logging | Following local setup |
| `SPRING_NEO4J_URI`, `SPRING_NEO4J_AUTHENTICATION_USERNAME`, `SPRING_NEO4J_AUTHENTICATION_PASSWORD`, `SPRING_DATA_NEO4J_DATABASE` | Spring overrides for Bolt URI, login, database; defaults are localhost:7687 / neo4j / changeme / neo4j | Your local instance differs; Neo4j is required for startup |
| `JWT_SECRET` | Signing key; implementation uses UTF-8 bytes, not Base64 decoding | Override the checked-in default outside isolated development; use at least 32 random bytes of key material represented as a string |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact browser origins; local defaults include 8081 | Your frontend origin differs |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | Compose admin credentials; both default to minioadmin | Changing local storage credentials |
| `MINIO_API_PORT`, `MINIO_CONSOLE_PORT`, `MINIO_API_CORS_ALLOW_ORIGIN` | Compose host ports 9000 / 9001 and local wildcard CORS | Changing local storage exposure |
| `MINIO_MEDIA_BUCKET` | Compose-created bucket, mvpconnect-media | Changing bucket name; also set backend bucket |
| `MEDIA_STORAGE_BUCKET`, `AWS_REGION` | Backend bucket mvpconnect-media and region us-east-1 | Nondefault bucket/region |
| `MEDIA_STORAGE_ENDPOINT`, `MEDIA_STORAGE_PATH_STYLE_ACCESS` | Local profile defaults to http://localhost:9000 and true | Custom MinIO host/port or device access |
| `MEDIA_STORAGE_ACCESS_KEY`, `MEDIA_STORAGE_SECRET_KEY` | Local profile falls back to MINIO_ROOT_USER/PASSWORD, then local defaults | Credentials differ; supply values to Spring separately |
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
| `OAUTH_RETURN_ALLOWED_TARGETS`, `OAUTH_ATTEMPT_TTL` | Exact allowed app return destinations and attempt lifetime (10m) | Checked-in local destinations apply |

Register the exact backend callbacks `http://localhost:8080/external-connections/oauth/youtube/callback` and `http://localhost:8080/external-connections/oauth/soundcloud/callback` for local use. They are different from the frontend return destination. Never put provider secrets or the encryption key in Expo variables. Losing the encryption key requires reconnecting providers; preserve it securely with the environment it protects. For protocol and connection behavior, see [external connections](../mvpconnect-svc/MEDIA_CONNECTIONS.md).

## Frontend and diagnostics

- `EXPO_PUBLIC_API_BASE_URL`: defaults to `http://localhost:8080` in the API client.
- `EXPO_PUBLIC_OAUTH_RETURN_TARGET`: example uses `http://localhost:8081/oauth/result`; must match a backend allowed target. Native example: `mvpconnect://oauth/result`.
- `APP_LOG_LEVEL`: INFO normally, DEBUG in the local profile. `LOG_FILE` defaults to `logs/mvpconnect.log` in the local profile, relative to the process working directory.
- `LOG_MAX_FILE_SIZE`, `LOG_MAX_HISTORY`, `LOG_TOTAL_SIZE_CAP`, `SLOW_OPERATION_THRESHOLD_MS`: 20MB, 30, 1GB, and 1000 respectively. See [logging](../mvpconnect-svc/LOGGING.md).

The optional MCP prototype uses `CRESCENDO_API_URL`, `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASS`. Set its API URL explicitly to port 8080 for this backend; its code defaults to 8081. Its direct graph reads do not inherit API authorization or public DTO privacy rules. Keep it restricted to trusted local development.
