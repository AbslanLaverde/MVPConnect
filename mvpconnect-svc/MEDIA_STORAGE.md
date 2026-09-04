# MVPConnect media storage

The media API stores metadata in Neo4j and image bytes in private S3-compatible
object storage. The browser or mobile client uploads directly to object storage by
using a short-lived, server-generated presigned URL. Spring Boot never proxies the
image body.

## Local MinIO

From the repository root, optionally copy `.env.example` to `.env`, then start the
local object-storage dependency:

```powershell
docker compose up -d
docker compose ps
docker compose logs minio-init
```

MinIO exposes the S3 API at `http://localhost:9000` and its console at
`http://localhost:9001`. The one-shot `minio-init` service creates the private
`mvpconnect-media` bucket if it does not exist. Its local default login is
`minioadmin` / `minioadmin`; override those values in the untracked `.env` file if
desired.

Start the backend with the `local` Spring profile so `application-local.properties`
uses MinIO's endpoint, path-style addressing, and local credentials:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'local'
mvn spring-boot:run
```

The service still needs the project's existing Neo4j instance at
`bolt://localhost:7687`. The compose file adds only the newly required MinIO
dependency and does not replace the existing Neo4j workflow.

## Authenticated smoke test

Obtain a valid JWT from the existing signup/login flow and put it in `$token`. Use
an actual small JPEG and make `sizeBytes` equal its exact byte count.

```powershell
$token = '<jwt>'
$imagePath = 'C:\path\to\test.jpg'
$size = (Get-Item -LiteralPath $imagePath).Length
$headers = @{ Authorization = "Bearer $token" }
$body = @{
  mediaType = 'PROFILE_IMAGE'
  mediaContext = 'PROFILE'
  fileName = 'test.jpg'
  mimeType = 'image/jpeg'
  sizeBytes = $size
  width = 1200
  height = 1200
} | ConvertTo-Json
$upload = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/media/uploads' -Headers $headers -ContentType 'application/json' -Body $body
Invoke-WebRequest -Method Put -Uri $upload.uploadUrl -ContentType 'image/jpeg' -InFile $imagePath
$ready = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/media/$($upload.mediaId)/complete" -Headers $headers
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/media/$($upload.mediaId)" -Headers $headers
Invoke-RestMethod -Method Delete -Uri "http://localhost:8080/media/$($upload.mediaId)" -Headers $headers
```

The completion call verifies the object with `HEAD`, including its content type and
content length, before changing the asset from `PENDING` to `READY`. The MinIO
console can be used to confirm the object appears before deletion and is absent
after deletion.

To associate a verified asset with the authenticated account's current onboarding
draft step:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/onboarding/steps/basics/media/$($upload.mediaId)" -Headers $headers
```

Use a step key valid for the authenticated persona. Association requires an active
current-version draft, ownership of the media, and `READY` status.

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

Only `image/jpeg`, `image/png`, and `image/webp` are accepted in this pass.
