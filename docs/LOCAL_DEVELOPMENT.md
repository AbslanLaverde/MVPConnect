# Local development

Run commands from the repository root unless a different directory is shown. Examples use PowerShell; run each server in its own terminal. Do not point development tools or E2E cleanup at shared or production data.

## Prerequisites

- JDK 21 and Maven (there is no Maven wrapper). Audit environment: Java 21.0.6 and Maven 3.9.11.
- Node.js and npm. Audit environment: Node 22.18.0 and npm 10.9.3; the repository does not pin a Node version. Use `npm ci` with the committed lockfile.
- Docker with Compose for MinIO.
- A separately provisioned Neo4j database. The repository does not pin a server version or provide a Neo4j container definition. It must support the constraint and text-index syntax in [Neo4jSchemaInitializer](../mvpconnect-svc/src/main/java/com/mint/config/Neo4jSchemaInitializer.java). Compatibility with a specific server release must be checked in your environment.

Web is the simplest local entry point. Android requires an emulator/device setup; an iOS simulator requires macOS/Xcode. Native runtime compatibility with this repository's Expo SDK 51 must be checked before using Expo Go; do not assume the current store build supports it. No global Expo CLI installation is needed.

## 1. Configure local services

Copy examples only if the destination files do not already exist:

```powershell
Copy-Item .env.example .env
Copy-Item mvpconnect-app/.env.example mvpconnect-app/.env
docker compose up -d
docker compose ps -a
docker compose logs minio-init
```

Expect MinIO on port 9000, its console on 9001, and `minio-init` to exit successfully after creating the private bucket. Compose uses a persistent named volume and a fixed project name, `mvpconnect-local`; multiple worktrees using these defaults share infrastructure. Coordinate ports, project names, and data before starting another instance.

Start your separate Neo4j instance and create/select the `neo4j` database. The checked-in defaults expect Bolt at `bolt://localhost:7687`, username `neo4j`, and local password `changeme`. Supply your actual credentials to the backend process instead of changing tracked properties. Startup executes schema creation statements, so the database user needs appropriate schema permissions.

## 2. Start Spring Boot

The root `.env` is consumed by Compose; Spring Boot does **not** automatically load it. Set process environment variables in this terminal or in your IDE run configuration. See [the environment reference](ENVIRONMENT.md) for optional integrations and nondefault MinIO settings.

```powershell
$env:SPRING_PROFILES_ACTIVE = 'local'
$env:SPRING_NEO4J_URI = 'bolt://localhost:7687'
$env:SPRING_NEO4J_AUTHENTICATION_USERNAME = 'neo4j'
$env:SPRING_NEO4J_AUTHENTICATION_PASSWORD = 'replace-with-your-local-password'
$env:SPRING_DATA_NEO4J_DATABASE = 'neo4j'
mvn -f mvpconnect-svc/pom.xml spring-boot:run
```

The `local` profile supplies MinIO endpoint, path-style access, and local credentials. If you changed Compose credentials/bucket/ports, supply matching backend storage settings. The API runs on port 8080 by default.

In another terminal:

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health/liveness
Invoke-RestMethod http://localhost:8080/actuator/health/readiness
```

Liveness reflects process state. Readiness requires Neo4j and object storage. A live process alone does not prove signup or uploads work.

## 3. Start the frontend

```powershell
Set-Location mvpconnect-app
npm ci
npm run web -- --port 8081
```

The app `.env` defaults to API port 8080 and OAuth return target `http://localhost:8081/oauth/result`. Restart Expo after changing environment values. For Android or iOS, use `npm run android` or `npm run ios` in a compatible environment.

For a physical device, `localhost` points to the device. Set the API URL to a reachable host address. Media upload/access URLs must also use an endpoint the device can reach; setting only the API URL is insufficient. For native OAuth use `mvpconnect://oauth/result` and a build configured for that scheme. Update backend CORS and exact OAuth return allowlists when changing web ports/hosts.

## 4. Verify the user flow

Create a new local musician account, save onboarding answers, sign out, and sign back in to check resume. Complete onboarding, enter the musician home screen, and edit the profile. Test an image upload with MinIO running. Venue matches require suitable venue records with live music enabled and overlapping genres; an empty database may legitimately show no matches.

Venue and promoter signup/onboarding exist, but their post-welcome destination currently uses musician APIs. Do not use that route as evidence of completed dashboards. Provider lookup and OAuth need additional configuration; manual entry does not establish provider connectivity.

For repeatable API/persistence validation, use [the E2E runbook](../BACKEND_E2E_TESTING.md) against a disposable local dataset. Its seed/cleanup operations are not prerequisites for ordinary startup.

## Troubleshooting and shutdown

| Symptom | Check |
| --- | --- |
| Backend fails during startup | Neo4j reachability, credentials, database name, schema permissions |
| Readiness returns 503 | Neo4j status; MinIO endpoint, credentials, bucket; `minio-init` logs |
| Login network error | API port 8080, client base URL, device routing, CORS origin |
| Upload fails in browser/device | Presigned URL host reachability, bucket setup, storage CORS and credentials |
| Provider unavailable | Backend process environment; empty optional credentials intentionally disable provider operations |
| OAuth return rejected | Exact redirect registration, frontend return target, backend allowlist |
| Expo stale configuration | Restart with `npx expo start --clear` from the app directory |

Stop application terminals with Ctrl+C. `docker compose stop` stops local MinIO without deleting its volume; coordinate with anyone using the same Compose project. Stop Neo4j through the tool used to start it. See [testing](TESTING.md) for what was actually verified during this documentation audit.
