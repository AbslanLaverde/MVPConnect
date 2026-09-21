# Testing and verification

MVPConnect separates repeatable automated checks, live API/E2E evidence, and human product QA. A passing unit suite does not imply that external providers, infrastructure, or every device have been exercised.

## Automated testing

### Repeatable commands

From the repository root:

```powershell
mvn -f mvpconnect-svc/pom.xml clean test
node --test scripts/cleanup-local-e2e.test.js
git diff --check
```

From `mvpconnect-app`, after `npm ci`:

```powershell
npm test -- --ci
npm run typecheck
```

The frontend package runs Jest in-band and TypeScript with `tsc --noEmit`. Maven uses Java 21 and Spring Boot's managed test tooling. There is no checked-in frontend lint or production-build script, so CI does not invent one.

### Latest verified automated snapshot

Verified September 21, 2026 (America/New_York) on branch `chore/employer-readiness`, starting from application baseline `0fe9b20a1b0e17503fa8ec965774d10c5ee5a9d5`.

| Check | Result | Scope |
| --- | --- | --- |
| Frontend Jest | 50 suites, 349 tests passed; 0 failures | Full checked-in frontend suite |
| TypeScript | Passed | `npm run typecheck` |
| Backend Maven | 264 tests passed; 0 failures/errors/skips | `mvn clean test`; unit/service/controller coverage, not a live full-stack run |

Jest emits existing React Native animated-update `act(...)` console warnings in some component tests and a non-failing baseline-browser-mapping freshness advisory. They do not change the passing result but remain useful test-harness maintenance work.

The repository CI workflow runs the same full Jest/TypeScript checks and Maven clean test in parallel jobs. It does not require Neo4j, MinIO, or external-provider secrets.

## API / E2E verification

[BACKEND_E2E_TESTING.md](../BACKEND_E2E_TESTING.md) is the runbook and repository record for the generated Postman/Newman suite, real Neo4j, MinIO uploads, persistence assertions, health checks, and guarded cleanup.

The latest totals recorded there (September 9, 2026) are:

- **167 requests**
- **432 assertions**
- **0 failures**

Those repository-backed totals supersede the earlier approximate 164-request / 429-assertion planning figure. Newman was not rerun during this employer-readiness pass. Real YouTube and SoundCloud authorization remains an interactive verification boundary; the collection intentionally stores no provider credentials or grants.

The product-owner verification record also confirms a clean local Neo4j + MinIO rebuild and fresh Artist, Venue, and Promoter onboarding after the development-data reset. This pass did not repeat that destructive reset.

## Human QA

Onboarding V1 acceptance status supplied by the product owner:

| Persona | Web | Android | iOS |
| --- | --- | --- | --- |
| Artist | Verified | Verified | Not yet verified |
| Venue | Verified | Verified | Not yet verified |
| Promoter | Verified | Verified | Not yet verified |

Human Android acceptance includes the stabilized profile-image lifecycle, selected option rendering, one-press step transitions, compact Media gallery behavior, ordered removal/reordering, and native Welcome reveal. OAuth callback testing was intentionally handled separately from the Step 4 visual pass.

No iOS acceptance claim should be made until the same persona flows are exercised on an iOS target.

## Verification boundaries

- Automated tests do not certify production security, scalability, accessibility, or external-provider availability.
- The current matcher has no load/performance benchmark.
- Native builds and store distribution are outside the CI workflow.
- Live provider verification should be repeated when OAuth settings or provider clients change.
- Postman/Newman uses disposable accounts and guarded cleanup; never point it at shared or production data.
- The optional MCP prototype accesses Neo4j directly and is not covered by API authorization tests.
