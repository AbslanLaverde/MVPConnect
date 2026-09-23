# Backend API and E2E coverage

The Postman/Newman suite exercises authentication, typed onboarding, resume,
validation, ownership, canonical promotion, private image storage, public-profile
privacy, and dependency health against the backend API.

## Recorded verification snapshot

The September 9, 2026 API/E2E milestone completed **167 requests and 432 assertions
with zero failures**. These totals describe that snapshot, not a permanent suite
size or a new verification of the Home UI. Frontend Home coverage and subsequent
automated results are documented in [Testing](docs/TESTING.md).

## Executable coverage

The [generated collection](postman/MVPConnect-Backend-E2E.postman_collection.json)
is maintained through [build-collection.js](postman/build-collection.js). The
suite requires a configured API, Neo4j, and private S3-compatible storage; it
writes accounts, onboarding data, and media. Run it only against an isolated
test environment with approved synthetic data. Configuration keys and secret
boundaries are documented in [Environment](docs/ENVIRONMENT.md).

Collection order matters: health checks precede authentication, media, onboarding,
and completion assertions. Image bytes go directly to the returned presigned
storage URL without an application bearer token. Runner exports can contain
JWTs and presigned URLs and must stay outside version control.

## Coverage map

| Folder | Coverage |
| --- | --- |
| `00 - Health / Setup` | Aggregate health, process-only liveness, dependency readiness, run isolation |
| `01 - Auth` | Artist, Venue, and Promoter signup/login; authenticated persona context; shared reference identities; URL-first provider connections |
| `02 - Media` | Profile, banner, and persona-context gallery initialization; direct presigned PUT; complete; repeat complete; read/access URL; onboarding association; unsupported MIME; oversized file; missing object |
| `03 - Artist Onboarding` | Typed `basics`, `sound`, `live`, optional `media` skip/reopen/complete with banner, ordered gallery, URL-first connections, `goals`, and READY state |
| `04 - Venue Onboarding` | Typed `room`, `music`, `stage`, `booking`, optional `media` skip/reopen/complete with banner/gallery, `goals`, and READY state |
| `05 - Promoter Onboarding` | Typed `business`, `specialties`, `network`, optional `media` skip/reopen/complete with banner/gallery and URL-first connections, `goals`, and READY state |
| `06 - Onboarding Resume` | Artist signup, profile upload, partial completion, re-login, and persisted resume at `live` |
| `07 - Negative Validation` | Required data, enum, size, duplicate, conditional, address, email, media readiness/type/association, unknown field, and premature completion failures |
| `08 - Security / Ownership` | Typed Musician self-update validation and authorization, wrong-owner/persona denial, cross-owner media denial, invalid persona step, ignored owner query override, unauthenticated denial (including `/me`), owner delete |
| `09 - Completion / Idempotency` | All personas completed twice, stable timestamps, authenticated self contracts, safe search/match DTOs, safe public Artist/Venue/Promoter profiles, canonical public media, privacy assertions |
| `10 - Neo4j Verification Guide` | Read-only manual graph verification guidance |

## Expected onboarding state

Current schema version `2` uses these ordered steps:

- Artist: `basics`, `sound`, `live`, `media`, `goals`.
- Venue: `room`, `music`, `stage`, `booking`, `media`, `goals`.
- Promoter: `business`, `specialties`, `network`, `media`, `goals`.

Each happy path first verifies that optional `media` can be skipped, then reopens and completes it with associated object-storage assets. At final completion, every step—including `media`—is `COMPLETE`, its normalized `dataJson` remains on the completed draft, and PROFILE_IMAGE, BANNER_IMAGE, and ordered GALLERY_IMAGE assets become canonical persona media.

The suite calls backend contracts directly. It does not exercise frontend
navigation, Welcome, or Home rendering.

## Persistence and regression assertions

- Completed owner/draft state retains normalized step data at schema version `2`.
- Canonical profile, banner, and ordered gallery relationships reference ready,
  owned media; gallery order remains deterministic.
- Artist, Venue, and Promoter relationship references survive canonical promotion.
- Partially completed onboarding resumes at the persisted current step.
- Repeated completion preserves completion timestamps and canonical data.
- Legacy compatibility fields are preserved without being exposed through public DTOs.
- The graph stores stable object keys, never response-time presigned URLs.

## Public discovery profile boundary

Public discovery profiles are explicit allowlists and are not serialized account records:

- `GET /musicians/{id}` omits email, password, exact Artist address, legacy fee/image fields, onboarding metadata, and audit fields.
- `GET /venues/{id}` omits account email, booking email, password, legacy budget/image fields, onboarding metadata, and audit fields. A Venue's public business address remains available.
- `GET /promoters/{id}` omits email, phone, password, exact office address, legacy roster/image fields, onboarding metadata, and audit fields.

Each endpoint exposes canonical PROFILE_IMAGE media as `mediaId`, a response-time temporary `url`, `mimeType`, `width`, and `height`. It never serializes `objectKey`, owner ID, bucket, or storage credentials.

Authenticated account reads use `GET /me`, which returns the current persona's private/canonical profile through an explicit typed response. Public profile and discovery endpoints remain separate allowlists.

## Health semantics

- `GET /actuator/health/liveness` reflects the application process.
- `GET /actuator/health/readiness` includes Neo4j and object storage.
- `GET /actuator/health` exposes component names and statuses without raw
  dependency exceptions or credentials.

The object-storage health contributor uses a bucket `HEAD` operation rather than
uploading, listing, or deleting objects.

## Verification boundaries

- Real YouTube and SoundCloud consent requires interactive provider authorization;
  the collection stores no provider credentials or authorization grants.
- Public media URLs expire. Clients must refresh the profile response for a new URL.
- Upload fixture metadata must match the fixture used by the collection generator.
- Backend E2E results do not certify device rendering or production readiness.
