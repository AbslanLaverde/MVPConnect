# Testing and verification

## Repeatable commands

From the repository root:

```powershell
mvn -f mvpconnect-svc/pom.xml test
node --test scripts/cleanup-local-e2e.test.js
docker compose config --quiet
git diff --check
```

From `mvpconnect-app`, after `npm ci`:

```powershell
npm test
npm run typecheck
```

The package test script runs Jest in-band; typecheck runs `tsc --noEmit`. Maven uses Spring Boot's managed test tooling. There is no Maven wrapper, frontend lint script, or frontend build script in the checked-in manifests. Do not substitute invented commands in setup instructions.

## Documentation audit results

Audit date: September 12, 2026 (America/New_York). Application revision: `439eb614eee48fb7c813719f9410820059d11cb8`; this documentation pass changes no application implementation or tests.

| Check | Result | Scope |
| --- | --- | --- |
| Maven test | 263 tests, 0 failures/errors/skips | Backend suite; not a live full-stack run |
| Jest (`npm test -- --silent`) | 48 suites passed, 1 failed; 308 tests passed, 1 failed | Existing welcome mark sizing assertion fails |
| TypeScript | Passed | `npm run typecheck` |
| Cleanup utility tests | 5 passed | `node --test`; no live data deletion |
| Compose configuration | Passed with Docker config access warnings | Syntax/interpolation only; containers not started |
| Dependency installation | npm ci succeeded with scripts disabled; Maven dependencies resolved | Java 21.0.6, Maven 3.9.11, Node 22.18.0, npm 10.9.3 |

The frontend failure is in `src/screens/__tests__/WelcomeScreen.test.tsx:81`: `getWelcomeRevealMarkSize(1440, false)` expects `201.6` but returns `244.8`. Both test and implementation are unchanged from the baseline. This is recorded for the UI owner; no UI fix is included in this documentation branch.

Initial sandbox attempts could not use the default Maven/npm caches. Validation succeeded after allowing dependency downloads with caches inside this worktree (`mvpconnect-svc/target/documentation-m2` and `mvpconnect-app/node_modules/.documentation-npm-cache`). These are ignored local artifacts, not required setup paths. npm installation used `--ignore-scripts --no-audit --no-fund`; this is a verification detail, not a replacement for the standard setup command.

## Live integration checks

[BACKEND_E2E_TESTING.md](../BACKEND_E2E_TESTING.md) documents Postman/Newman, upload fixtures, persistence assertions, and guarded cleanup. Its recorded September 9 totals are historical results, not results from this documentation pass. Treat `postman/build-collection.js` as the source when intentionally regenerating its JSON outputs.

Full-stack startup, a fresh Neo4j setup, browser/device flows, live provider OAuth, and live Postman/Newman were not run during this audit. Existing Compose uses a shared project name and ports; no shared services or data were changed to validate documentation. Follow [local setup](LOCAL_DEVELOPMENT.md), then run the integration guide on isolated infrastructure before calling a deployment/demo ready.

MCP tools and seed/password utilities were not run. Their direct graph behavior and historical Python compatibility need a separate audit. Native builds, performance/load, accessibility, and production security are not certified by these checks.
