# MVPConnect media storage

The media API stores metadata in Neo4j and image bytes in private S3-compatible
object storage. The browser or mobile client uploads directly to object storage by
using a short-lived, server-generated presigned URL. Spring Boot never proxies the
image body.

## Storage boundary

The API requires a private bucket in an S3-compatible provider. Configure the
endpoint, addressing mode, bucket, region, and credential source through the
[environment contract](../docs/ENVIRONMENT.md). Browser uploads also require
storage CORS rules for the application's authorized origin. Presigned endpoints
must be reachable by the client performing the transfer.

## Authenticated upload lifecycle

1. Call `POST /media/uploads` with a bearer token, media type/context, filename,
   MIME type, exact byte count, and image dimensions.
2. Send the image bytes to the returned presigned URL using `PUT` and the declared
   content type. Storage authorization is encoded in that URL; do not attach the
   application's bearer token to the storage request.
3. Call `POST /media/{id}/complete`. The backend checks the object with `HEAD`,
   verifies content type and length, and changes the asset from `PENDING` to `READY`.
4. Use `GET /media/{id}` for an owned asset's current access URL. Explicit
   `DELETE /media/{id}` handles deletion.

Associate a verified asset with onboarding using
`POST /onboarding/steps/{stepKey}/media/{mediaId}`. Association requires an active
current-version draft, a step valid for the authenticated persona, media ownership,
and `READY` status.

## Production AWS S3

Production configuration should set `MEDIA_STORAGE_BUCKET` and `AWS_REGION`, leave
`MEDIA_STORAGE_ENDPOINT` empty, and keep
`MEDIA_STORAGE_PATH_STYLE_ACCESS=false`. Do not set static media credentials when
the workload has an IAM role; the AWS SDK default credential provider chain will
then use the task, instance, or workload role.

The S3 bucket must remain private. Grant the application role only the object
permissions it needs for the configured bucket and key prefix. A web client also
requires a bucket CORS rule allowing the application's production origin and the
`PUT`, `GET`, and `HEAD` methods with the `Content-Type` request header. Bucket
creation and production CORS/policy management belong in deployment
infrastructure, not application startup.

## Configuration reference

| Property | Environment variable | Default |
| --- | --- | --- |
| `media.storage.bucket` | `MEDIA_STORAGE_BUCKET` | `mvpconnect-media` |
| `media.storage.region` | `AWS_REGION` | `us-east-1` |
| `media.storage.endpoint` | `MEDIA_STORAGE_ENDPOINT` | empty (standard AWS endpoint) |
| `media.storage.path-style-access` | `MEDIA_STORAGE_PATH_STYLE_ACCESS` | `false` |
| `media.storage.access-key` | `MEDIA_STORAGE_ACCESS_KEY` | empty (default credential chain) |
| `media.storage.secret-key` | `MEDIA_STORAGE_SECRET_KEY` | empty (default credential chain) |
| `media.storage.max-file-size` | `MEDIA_STORAGE_MAX_FILE_SIZE` | `10MB` |
| `media.storage.upload-url-expiration` | `MEDIA_UPLOAD_URL_EXPIRATION` | `15m` |
| `media.storage.access-url-expiration` | `MEDIA_ACCESS_URL_EXPIRATION` | `15m` |

Only `image/jpeg`, `image/png`, and `image/webp` are accepted.

## Canonical profile media

Canonical media uses the existing relationship:

```text
(:Musician|Venue|Promoter)-[:HAS_MEDIA {sortOrder}]->(:MediaAsset)
```

- `PROFILE_IMAGE` and `BANNER_IMAGE` are singleton-by-type relationships.
- `GALLERY_IMAGE` membership is an ordered list. `HAS_MEDIA.sortOrder` is
  zero-based and contiguous; the relationship value is authoritative.
- For older relationships without `sortOrder`, reads fall back to the asset's
  legacy `sortOrder`, then `createdAt`/`updatedAt` and ID for deterministic output.
- Artist galleries allow 8 items. Venue and Promoter galleries allow 10.
- The complete gallery is ownership/status/type/step-association validated before
  the transactional relationship replacement runs.
- Replacing membership unlinks prior relationships but never deletes the old
  `MediaAsset` or object. Explicit `DELETE /media/{id}` owns object deletion.
- Skipping Media preserves prior canonical media. Completing Media with an empty
  ordered gallery replaces canonical gallery membership with an empty list.

The accepted type/context matrix is:

| Media type | Accepted contexts |
| --- | --- |
| `PROFILE_IMAGE` | `PROFILE` |
| `BANNER_IMAGE` | `PROFILE`, `VENUE`, `EVENT` |
| `GALLERY_IMAGE` | `PROFILE`, `PERFORMANCE`, `VENUE`, `EVENT` |

Both upload initialization and canonical-reference validation enforce this
matrix. Public profile and `/me` reads make one canonical-media graph query per
persona, generate fresh short-lived read URLs, and never expose bucket/object
keys.

## Orphan policy

`MediaCleanupService.findStaleCandidates` is an internal, read-only planning
primitive for stale `PENDING`/`FAILED` assets and unattached `READY` assets. It is
bounded to 1,000 candidates and requires a positive minimum age. No scheduler or
automatic deletion is enabled.

A future guarded sweeper must delete the object first, delete graph metadata only
after storage succeeds, retain attached assets, and make retries safe. Canonical
replacement itself must never trigger storage deletion.
