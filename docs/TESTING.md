# Testing and verification

MVPConnect separates repeatable automated checks, live API/E2E evidence, and human product QA. A passing unit suite does not imply that external providers, infrastructure, or every device have been exercised.

## Automated testing

### Repeatable commands

From the repository root:

```powershell
mvn -f mvpconnect-svc/pom.xml clean test
git diff --check
```

From `mvpconnect-app`, after `npm ci`:

```powershell
npm test -- --ci
npm run typecheck
```

The frontend package runs Jest in-band and TypeScript with `tsc --noEmit`. Maven uses Java 21 and Spring Boot's managed test tooling. There is no checked-in frontend lint or production-build script, so CI does not invent one.

### Recorded automated snapshot

Snapshot verified September 22, 2026. Counts will change as coverage grows.

| Check | Result | Scope |
| --- | --- | --- |
| Frontend Jest | 56 suites, 392 tests passed; 0 failures | Full checked-in frontend suite, including all three Home foundations |
| TypeScript | Passed | `npm run typecheck` |
| Backend Maven | 264 tests passed; 0 failures/errors/skips | `mvn clean test`; unit/service/controller coverage, not a live full-stack run |

The repository CI workflow runs the same full Jest/TypeScript checks and Maven clean test in parallel jobs. It does not require Neo4j, MinIO, or external-provider secrets.

## API / E2E verification

[BACKEND_E2E_TESTING.md](../BACKEND_E2E_TESTING.md) describes the generated Postman/Newman suite and its coverage of API behavior, Neo4j persistence, object-storage uploads, health checks, and isolation safeguards.

The latest totals recorded there (September 9, 2026) are:

- **167 requests**
- **432 assertions**
- **0 failures**

These are a milestone snapshot rather than a timeless suite size. Real YouTube and SoundCloud authorization remains an interactive verification boundary; the collection stores no provider credentials or grants.

## Home and routing coverage

Authenticated routing tests cover:

- completed Artist → `ArtistHome`
- completed Venue → `VenueHome`
- completed Promoter → `PromoterHome`
- incomplete and READY accounts remaining in onboarding
- first completion reaching Welcome before ENTER resolves the persona Home
- later completed login bypassing Welcome

Persona Home tests cover authenticated identity, profile image and initials fallback, the shared greeting, `NEEDS YOUR ATTENTION`, truthful empty state, loading, and error/retry behavior. Regression assertions keep future recommendations, opportunities, profile summaries, Board content, and other unimplemented modules out of V1.

Shared Home tests cover responsive structure, safe-area behavior, scrolling constraints, and accessibility semantics.

## Human QA

Onboarding V1 and Home V1 QA status:

| Persona | Web | Android | iOS |
| --- | --- | --- | --- |
| Artist | Verified | Verified | Not yet verified |
| Venue | Verified | Verified | Not yet verified |
| Promoter | Verified | Verified | Not yet verified |

Android acceptance includes the stabilized profile-image lifecycle, selected option rendering, one-press step transitions, compact Media gallery behavior, ordered removal/reordering, native Welcome reveal, persona-specific Home routing, safe-area behavior, and scrolling. Web acceptance includes the three completed onboarding-to-Home flows and responsive desktop Home layouts.

No iOS acceptance claim should be made until the same persona flows are exercised on an iOS target.

## Verification boundaries

- Automated tests do not certify production security, scalability, accessibility, or external-provider availability.
- The current matcher has no load/performance benchmark.
- Native builds and store distribution are outside the CI workflow.
- Live provider verification should be repeated when OAuth settings or provider clients change.
- The optional MCP prototype accesses Neo4j directly and is not covered by API authorization tests.
