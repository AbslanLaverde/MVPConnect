# MVPConnect Local Backend E2E Testing

This guide covers the repeatable local smoke/integration suite for authentication, private media, public-profile privacy, typed onboarding, resume behavior, validation, ownership, completion, canonical promotion, Actuator readiness, Neo4j persistence, MinIO object storage, and guarded local cleanup.

Last verified: September 4, 2026

- Backend: `http://localhost:8080`
- Neo4j Bolt: `bolt://localhost:7687`
- Neo4j Browser/HTTP: `http://localhost:7474`
- MinIO S3 API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`
- Current onboarding schema version: `2`
- Live runner result: `144` requests, `380` assertions, `0` failures
- Maven result: `129` tests, `0` failures, `0` errors, `0` skipped
- Node cleanup result: `5` tests, `0` failures; live plan and execution removed the exact test run while preserving all control accounts

## Harness files

- `postman/MVPConnect-Backend-E2E.postman_collection.json` — importable Postman collection.
- `postman/MVPConnect-Local.postman_environment.json` — local environment template. Generated credentials are local-only; token and URL values are blank in source control.
- `postman/build-collection.js` — deterministic source used to regenerate both JSON files.
- `mvpconnect-app/assets/matches/glass-houses.jpg` — committed `600 x 300`, `34,954`-byte JPEG upload fixture.
- `scripts/cleanup-local-e2e.js` — preferred cross-platform, plan-first cleanup for one exact local E2E run.
- `scripts/cleanup-local-e2e.ps1` — PowerShell-compatible cleanup retained for existing workflows.

Run `node postman/build-collection.js` after intentionally editing the generator. Do not hand-edit the generated JSON and the generator independently.

Local Newman exports are ignored because they contain short-lived JWTs and presigned URLs:

- any `postman/.*newman-report.json`
- any `postman/.*run-environment.json`

## Prerequisites

- Java 21 and Maven.
- Docker Desktop for the repository's MinIO Compose services.
- A local Neo4j database listening on ports `7474` and `7687`.
- The backend configured with valid Neo4j credentials. Repository defaults are suitable only for the current local development database.
- Node.js 18 or newer (cleanup utility and optional transient Newman runner), or Postman Desktop.

Neo4j is not defined in `compose.yaml`; start the existing local Neo4j instance separately. MinIO is the only persistence service managed by this repository's Compose file.

## Start local infrastructure

From the repository root:

```powershell
docker compose up -d
docker compose ps -a
docker compose logs minio-init
```

Expected state:

- `minio` is running.
- `minio-init` exits with code `0` after creating the private `mvpconnect-media` bucket.
- Neo4j accepts Bolt connections at `localhost:7687`.

The local MinIO profile reads these environment variables when provided:

- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `MEDIA_STORAGE_ENDPOINT`
- `MEDIA_STORAGE_ACCESS_KEY`
- `MEDIA_STORAGE_SECRET_KEY`
- `MEDIA_STORAGE_BUCKET`

The checked-in defaults use `http://localhost:9000`, path-style access, and bucket `mvpconnect-media`.

## Start the backend

From `mvpconnect-svc`:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'local'
mvn spring-boot:run
```

Confirm the backend is reachable:

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health
```

Expected response:

```json
{
  "status": "UP",
  "components": {
    "neo4j": {"status": "UP"},
    "objectStorage": {"status": "UP"}
  },
  "groups": ["liveness", "readiness"]
}
```

Standard probe groups have deliberately different semantics:

- `GET /actuator/health/liveness` checks only `livenessState`; MinIO or Neo4j failure does not mark the process dead.
- `GET /actuator/health/readiness` requires `readinessState`, `neo4j`, and `objectStorage` to be UP.
- `GET /actuator/health` shows component names and statuses, but never raw dependency details or exceptions.

The object-storage contributor performs one lightweight bucket HEAD operation. It does not upload, list, or delete objects.

## Run in Postman Desktop

1. Import `postman/MVPConnect-Backend-E2E.postman_collection.json`.
2. Import and select `postman/MVPConnect-Local.postman_environment.json`.
3. Set Postman's working directory to the repository root and allow file reads from it. The direct MinIO PUT requests read `mvpconnect-app/assets/matches/glass-houses.jpg`.
4. Run the complete collection in its existing numeric order.

Folder `00 - Health / Setup` must run first. It creates an `e2eRunId`, randomized `@example.local` test emails, clears stale runtime variables, and checks liveness/readiness. The suite is rerunnable without email collisions.

Do not manually add a bearer token to the direct MinIO PUT requests. Authentication is encoded in each presigned URL; the absence of a JWT on those requests is intentional.

## Run with Newman

No Newman dependency is added to the application. From the repository root, use a transient runner:

```powershell
npx --yes newman run postman/MVPConnect-Backend-E2E.postman_collection.json `
  -e postman/MVPConnect-Local.postman_environment.json `
  --working-dir .
```

For a machine-readable local report and exported runtime environment:

```powershell
npx --yes newman run postman/MVPConnect-Backend-E2E.postman_collection.json `
  -e postman/MVPConnect-Local.postman_environment.json `
  --working-dir . `
  --reporters cli,json `
  --reporter-json-export postman/.newman-report.json `
  --export-environment postman/.run-environment.json
```

The two output files are intentionally ignored. Never commit a runner-exported environment.

## Coverage map

| Folder | Coverage |
| --- | --- |
| `00 - Health / Setup` | Aggregate health, process-only liveness, dependency readiness, unique run initialization, stale variable cleanup |
| `01 - Auth` | Artist, Venue, and Promoter signup/login; persona and JWT capture |
| `02 - Media` | Profile, banner, and gallery initialization; direct presigned PUT; complete; repeat complete; read/access URL; onboarding association; unsupported MIME; oversized file; missing object |
| `03 - Artist Onboarding` | Typed `basics`, `sound`, `live`, optional `media` skip/reopen/complete with banner, `goals`, and READY state |
| `04 - Venue Onboarding` | Typed `room`, `music`, `stage`, `booking`, optional `media` skip/reopen/complete with banner/gallery, `goals`, and READY state |
| `05 - Promoter Onboarding` | Typed `business`, `specialties`, `network`, optional `media` skip/reopen/complete with banner, `goals`, and READY state |
| `06 - Onboarding Resume` | Disposable Artist signup, profile upload, partial completion, re-login, and persisted resume at `live` |
| `07 - Negative Validation` | Required data, enum, size, duplicate, conditional, address, email, media readiness/type/association, unknown field, and premature completion failures |
| `08 - Security / Ownership` | Typed Musician self-update validation and authorization, wrong-owner/persona denial, cross-owner media denial, invalid persona step, ignored owner query override, unauthenticated denial (including `/me`), owner delete |
| `09 - Completion / Idempotency` | All personas completed twice, stable timestamps, authenticated self contracts, safe search/match DTOs, safe public Artist/Venue/Promoter profiles, canonical public media, privacy assertions |
| `10 - Neo4j Verification Guide` | Read-only manual graph verification guidance |

## Data created by a run

Each run intentionally persists randomized local test records:

- One completed Artist, Venue, and Promoter.
- One partially completed resume-test Artist.
- Onboarding drafts and step nodes for those owners.
- READY profile images for all four owners, three READY banners, and one READY Venue gallery image.
- One PENDING Artist media record used by negative tests.

The collection deletes only its disposable unassociated media record. Use the guarded cleanup script after inspecting the run to remove all other data and objects owned by that exact `e2eRunId`.

## Expected onboarding state

Current schema version `2` uses these ordered steps:

- Artist: `basics`, `sound`, `live`, `media`, `goals`.
- Venue: `room`, `music`, `stage`, `booking`, `media`, `goals`.
- Promoter: `business`, `specialties`, `network`, `media`, `goals`.

Each happy path first verifies that optional `media` can be skipped, then reopens and completes it with real associated MinIO assets. At final completion, every step—including `media`—is `COMPLETE`, its normalized `dataJson` remains on the completed draft, and only PROFILE_IMAGE becomes canonical persona media.

The frontend placeholder navigation bypass remains enabled and is outside this backend test harness. This suite calls the real backend contracts directly and does not alter that temporary frontend behavior.

## Manual Neo4j verification

Use IDs from the Postman environment after a run. These queries are read-only.

### Persona, draft, and step state

```cypher
MATCH (owner:Musician {id: $artistId})-[:HAS_ONBOARDING_DRAFT]->(draft:OnboardingDraft)
OPTIONAL MATCH (draft)-[:HAS_STEP]->(step:OnboardingStep)
RETURN owner.onboardingStatus,
       owner.onboardingVersion,
       owner.onboardingCompletedAt,
       draft.status,
       draft.onboardingVersion,
       step.key,
       step.status,
       step.schemaVersion,
       step.dataJson
ORDER BY step.position;
```

Repeat with `Venue/$venueId` and `Promoter/$promoterId`. Expect schema version `2`, completed owner/draft state, retained JSON for every `COMPLETE` step, and a completed optional media step.

### Canonical profile-media cardinality

```cypher
MATCH (owner:Musician {id: $artistId})-[:HAS_MEDIA]->(media:MediaAsset)
WHERE media.mediaType = 'PROFILE_IMAGE'
RETURN count(media) AS profileImageCount,
       collect({id: media.id, status: media.status, objectKey: media.objectKey}) AS media;
```

Expect exactly one READY profile image. Repeat for Venue and Promoter.

### Step-media retention

```cypher
MATCH (owner:Musician {id: $artistId})-[:HAS_ONBOARDING_DRAFT]->(:OnboardingDraft)
      -[:HAS_STEP]->(step:OnboardingStep)-[:HAS_MEDIA]->(media:MediaAsset)
RETURN step.key, media.id, media.mediaType, media.status, media.objectKey
ORDER BY step.position, media.sortOrder;
```

The tested Artist `basics` step retains the profile and banner associations, while Artist `media` retains its banner. Venue `room` retains the profile and Venue `media` retains its banner/gallery. Promoter `business` retains the profile and Promoter `media` retains its banner.

### Deferred draft data

```cypher
MATCH (owner:Musician {id: $artistId})-[:HAS_ONBOARDING_DRAFT]->(:OnboardingDraft)
      -[:HAS_STEP]->(step:OnboardingStep)
WHERE step.key IN ['sound', 'live']
RETURN step.key, step.dataJson;
```

The live suite verifies retention of Artist `soundsLikeArtists`, `venuesPlayed`, and banner media; Venue `artistsBooked`, banner, and gallery media; and Promoter `artistsWorkedWith`, `artists`, `venues`, `additionalMarkets`, and banner media. Performance-image and past-show shapes remain covered by the Maven suite.

### Resume state

```cypher
MATCH (owner:Musician {id: $resumeArtistId})-[:HAS_ONBOARDING_DRAFT]->(draft:OnboardingDraft)
OPTIONAL MATCH (draft)-[:HAS_STEP]->(step:OnboardingStep)
RETURN owner.onboardingStatus,
       draft.status,
       draft.currentStepKey,
       step.key,
       step.status,
       step.dataJson
ORDER BY step.position;
```

Expect one in-progress draft, `basics` and `sound` complete with retained data, `live` not started, and `currentStepKey = 'live'`.

### Presigned URL persistence safety

```cypher
MATCH (owner {id: $artistId})-[:HAS_ONBOARDING_DRAFT]->(draft)-[:HAS_STEP]->(step)
OPTIONAL MATCH (step)-[:HAS_MEDIA]->(media:MediaAsset)
WITH [owner, draft, step, media] AS nodes
UNWIND nodes AS node
WITH [node IN collect(DISTINCT node) WHERE node IS NOT NULL] AS nodes
RETURN all(node IN nodes WHERE
  none(key IN ['uploadUrl', 'url', 'accessUrl', 'urlExpiresAt'] WHERE node[key] IS NOT NULL)
) AS noPresignedUrlPersisted,
all(node IN [node IN nodes WHERE 'MediaAsset' IN labels(node)] WHERE
  node.objectKey IS NOT NULL AND NOT node.objectKey STARTS WITH 'http'
) AS stableObjectKeysOnly;
```

Expect both values to be `true`. Runtime upload/access URLs are responses only; the graph stores stable object keys.

## Legacy field regression sentinels

The collection creates explicit pre-onboarding legacy values and confirms completion does not overwrite them:

- Artist: `minimumFee`, `willingToTravel`, and `profileImageUrl`.
- Venue: `typicalBudget`, `liveMusic`, and `logoUrl`.
- Promoter: `acceptingNewArtists`, `currentRosterSize`, and `logoUrl`.

Legacy values are intentionally absent from the new public DTOs. Direct Neo4j verification confirms that all sentinels remain persisted while full canonical fields are promoted.

## Public discovery profile boundary

Public discovery profiles are explicit allowlists and are not serialized account records:

- `GET /musicians/{id}` omits email, password, exact Artist address, legacy fee/image fields, onboarding metadata, and audit fields.
- `GET /venues/{id}` omits account email, booking email, password, legacy budget/image fields, onboarding metadata, and audit fields. A Venue's public business address remains available.
- `GET /promoters/{id}` omits email, phone, password, exact office address, legacy roster/image fields, onboarding metadata, and audit fields.

Each endpoint exposes canonical PROFILE_IMAGE media as `mediaId`, a response-time temporary `url`, `mimeType`, `width`, and `height`. It never serializes `objectKey`, owner ID, bucket, or storage credentials.

Authenticated account reads use `GET /me`, which returns the current persona's private/canonical profile through an explicit typed response. Public profile and discovery endpoints remain separate allowlists.

## Local E2E cleanup

Copy `e2eRunId` from the selected Postman environment or an exported runner environment. Always inspect the plan first:

```powershell
node scripts/cleanup-local-e2e.js `
  --environment local `
  --e2e-run-id '<timestamp>-<six-hex-characters>'
```

Execute that exact plan explicitly:

```powershell
node scripts/cleanup-local-e2e.js `
  --environment local `
  --e2e-run-id '<timestamp>-<six-hex-characters>' `
  --execute
```

The Node utility talks directly to the configured loopback MinIO S3 endpoint; it does not depend on Docker Compose service DNS. Override local connection details with `--neo4j-http-url`, `--minio-endpoint`, and the corresponding credential flags when needed. The PowerShell utility remains available with its original parameter names for compatibility.

Run its focused safety tests with:

```powershell
node --test scripts/cleanup-local-e2e.test.js
```

Safety rules:

- `Environment` must be explicitly `local` or `test`.
- Neo4j and MinIO URLs must be absolute loopback HTTP(S) URLs.
- The run ID must match the collection-generated format.
- Target emails must exactly match the four known E2E persona patterns for that run and end in `@example.local`.
- Owner IDs and every media object key must pass UUID and owner-prefix checks.
- The bucket must be `mvpconnect-media` or explicitly test-named.
- Objects are removed before graph nodes. A storage failure stops graph deletion, and reruns safely tolerate already-absent objects.
- Graph deletion is restricted to resolved owner IDs that also pass the exact email pattern; it never runs a broad graph delete.
- The script verifies that no target accounts remain and that the non-E2E account count is unchanged.

The verified cleanup run matched four E2E accounts and nine media records, removed eight real objects, safely recognized one never-uploaded negative-test object as absent, left zero target accounts, and preserved all 17 non-E2E control accounts.

## Real-infrastructure verification performed

The verified hardening run used a fresh Spring Boot instance, the local Neo4j database, and Dockerized MinIO—not mocks.

- Neo4j checks passed for completed owner/draft state, retained optional-media JSON, optional step-media relationships, canonical PROFILE_IMAGE-only relationships, legacy sentinels, and temporary URL non-persistence.
- MinIO handled profile, banner, and gallery uploads for all three personas, plus the resume and negative-test flows. Each uploaded fixture was `image/jpeg` and exactly `34,954` bytes.
- Aggregate health, process-only liveness, and dependency readiness all returned UP; readiness reported Neo4j and object storage independently.
- Safe public profiles returned canonical media with response-time URLs and passed private-field/object-key absence assertions.
- The full Newman run completed `134` requests and `346` assertions with zero failures.
- The full Maven suite completed `115` tests with zero failures, errors, or skips.
- The guarded cleanup was executed against that run and verified both graph and object-store cleanup without changing non-E2E account count.

## Known limitations and remaining risks

- The authenticated Musician update still accepts an untyped `Map<String,Object>`. Ownership and protected fields are enforced, but malformed value types can still reach casts; a dedicated update DTO should replace it in a later profile-editing pass.
- No authenticated self/account profile endpoint exists. The public profile contract must remain private-by-default, so account editing needs its own authenticated DTO and endpoint before the legacy editor becomes an active product path.
- Public search/match responses still use older hand-built maps. They do not expose account credentials, but they should move to explicit discovery DTOs when those APIs are redesigned.
- Public media URLs are deliberately short-lived. Clients must refresh the profile response after URL expiry; a later CDN can replace the presenter without changing persona storage.
- The cleanup utility requires Docker Compose's MinIO client service and Neo4j's local HTTP transaction endpoint.
- If the committed JPEG fixture changes, update its byte count and dimensions in `postman/build-collection.js`, regenerate the JSON files, and rerun the suite.

## Troubleshooting

- `ECONNREFUSED localhost:8080`: start the backend and verify it is using port `8080`.
- Neo4j connection failure: start the separate local Neo4j instance and confirm its configured credentials and `bolt://localhost:7687`.
- MinIO upload failure: run `docker compose ps -a` and `docker compose logs minio minio-init`; confirm the private bucket was created.
- Postman `ENOENT` or file-access error: set the working directory to the repository root and allow Postman to read the fixture path.
- Upload completion reports a missing object: ensure the direct PUT request succeeded before the complete request and did not receive an injected bearer token.
- Signup conflict: rerun the complete collection beginning with folder `00`; do not run only a later folder with stale environment values.
- Cleanup refuses a target: run it without `-Execute`, confirm the exact `e2eRunId`, loopback URLs, expected bucket, and strict `@example.local` account pattern.

## Product-code impact

This hardening pass adds authoritative Musician update ownership, safe public profile DTOs, a public Promoter profile endpoint, canonical public media presentation, and standard Actuator storage/readiness visibility. It does not change onboarding DTOs, taxonomies, step order, completion semantics, matching logic, frontend persona forms, application dependencies, or the enabled frontend placeholder save bypass.
