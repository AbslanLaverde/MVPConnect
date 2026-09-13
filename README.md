# MVPConnect

<img src="mvpconnect-app/assets/branding/mvpconnect-logo.svg" alt="MVPConnect" width="304">

MVPConnect connects musicians, venues, and promoters through structured profiles, music-industry relationships, and venue discovery. This repository contains an Expo / React Native client, a Spring Boot API, and a Neo4j graph model.

The current implementation focuses on account creation, resumable persona-specific onboarding, profile media, external identities, and basic musician-to-venue matching. It is an evolving MVP; it does not yet provide a complete booking marketplace.

## What is implemented

| Area | Repository-backed capability | Boundary |
| --- | --- | --- |
| Accounts | Musician, venue, and promoter signup; JWT login; authenticated self-account reads | Password reset remains a UI placeholder |
| Onboarding | Typed steps, server validation, saved drafts, resume, completion, and sign-out handling | Backend-confirmed state controls navigation; the placeholder save bypass is disabled |
| Media | Private JPEG, PNG, and WebP uploads, profile/banner/gallery references, expiring access URLs | Image storage, not general video hosting |
| External context | Spotify artist identities; Google Places locations and venue identities; free-form references | Provider lookup needs backend credentials; a referenced entity is not necessarily a registered account |
| External connections | Persona-specific URL connections; YouTube/SoundCloud OAuth for musicians | Provider configuration is required; this is not social login |
| Discovery | Public profile APIs, musician/venue search, musician home and profile editing, venue matches | Matching counts shared genres among live-music venues; no learned recommendation model |

The welcome screen currently sends every persona to `MusicianHome`, which calls musician APIs. Dedicated venue/promoter dashboards are not implemented. Messaging, payments, booking transactions, push notifications, and token refresh are not presented as shipped capabilities.

## Engineering highlights

- **Draft-to-profile lifecycle:** versioned onboarding contracts separate incomplete answers from canonical profile data, with ownership checks and completion validation on the server.
- **Graph-backed identity:** external artists and venue identities can be referenced without creating login accounts; provider identifiers and normalized names support resolution.
- **Private media delivery:** metadata lives in Neo4j while image bytes move directly to S3-compatible storage through presigned URLs.
- **Explicit public projections:** public profile/discovery DTOs are separate from authenticated account data and provider credentials.
- **Operational visibility:** request logging and distinct liveness/readiness probes make dependency failures easier to diagnose.

See [architecture](docs/ARCHITECTURE.md) for implementation evidence and tradeoffs, and [the portfolio case study](docs/PORTFOLIO.md) for a reusable presentation and maintenance checklist.

## Run locally

Use the [local setup guide](docs/LOCAL_DEVELOPMENT.md) for prerequisites, Neo4j configuration, MinIO startup, and separate backend/frontend terminals. Compose starts MinIO only; it does not start Neo4j or the application.

Once infrastructure and environment variables are configured:

```powershell
# Repository root, backend terminal
$env:SPRING_PROFILES_ACTIVE = 'local'
mvn -f mvpconnect-svc/pom.xml spring-boot:run
```

```powershell
# Separate terminal
Set-Location mvpconnect-app
npm ci
npm run web -- --port 8081
```

The API defaults to `http://localhost:8080`, with no `/api` prefix. The frontend URL is configured through `EXPO_PUBLIC_API_BASE_URL`, not by editing source files. See [environment and secrets](docs/ENVIRONMENT.md) before enabling external providers.

## Repository map

| Path | Purpose |
| --- | --- |
| [mvpconnect-app](mvpconnect-app/README.md) | Expo SDK 51, React 18, React Native 0.74, TypeScript, React Navigation, Redux Toolkit / RTK Query, Axios |
| [mvpconnect-svc](mvpconnect-svc/pom.xml) | Java 21, Spring Boot 3.5.16, Spring Security, Spring Data Neo4j, AWS SDK v2 |
| [mvpconnect-mcp](mvpconnect-mcp/README.md) | Optional Python/FastMCP prototype with direct database access; separate from the app runtime |
| [compose.yaml](compose.yaml) | Local MinIO and private bucket initialization |
| [postman](postman) / [scripts](scripts) | Backend E2E collection, generator, and guarded local cleanup |
| [docs](docs) | Setup, configuration, architecture, validation, and portfolio maintenance |

## Validation and further reading

```powershell
# Repository root
mvn -f mvpconnect-svc/pom.xml test
node --test scripts/cleanup-local-e2e.test.js
```

```powershell
# mvpconnect-app
npm test
npm run typecheck
```

[Testing guide](docs/TESTING.md) · [Backend E2E runbook](BACKEND_E2E_TESTING.md) · [Media storage](mvpconnect-svc/MEDIA_STORAGE.md) · [External connections](mvpconnect-svc/MEDIA_CONNECTIONS.md) · [Spotify identities](mvpconnect-svc/SPOTIFY_EXTERNAL_ARTISTS.md) · [Venue identities](mvpconnect-svc/VENUE_IDENTITY.md) · [Logging](mvpconnect-svc/LOGGING.md)

Feature statements describe code present in this repository, not a production deployment or external-provider certification. No root license file or public deployment URL is supplied by this checkout.
