# MVPConnect portfolio case study

## Project presentation

MVPConnect is a full-stack music-industry networking MVP for musicians, venues, and promoters. It combines an Expo / React Native interface with a Java/Spring Boot API and Neo4j to capture profiles, musical context, and relationships to artists and venues.

The strongest demonstration is the path from a new account to a saved, resumable profile: persona-specific onboarding, typed validation, private image uploads, optional provider-backed identities, and server-confirmed completion. A musician can then view genre-based venue matches and edit their profile. Venue and promoter onboarding are present, while their dedicated post-onboarding dashboards remain a gap.

## Engineering decisions to discuss

| Decision | What it makes possible | Tradeoff and evidence |
| --- | --- | --- |
| Versioned drafts separate from canonical profiles | Partial onboarding can resume before completion | Client/server contracts must stay aligned; OnboardingStepRegistry and onboarding services |
| External identity nodes separate from accounts | Reference artists and places that have not signed up | Resolution and provider availability need handling; external-artist/venue-identity services |
| Direct uploads to private storage | Bytes bypass the API; access can expire | Connectivity and cross-system cleanup matter; MediaService and S3ObjectStorageService |
| Public DTOs distinct from self-account data | Discovery exposes selected fields without account/provider secrets | New fields need intentional projection decisions; public/self/discovery services |
| Simple genre-overlap matching | Explainable initial venue suggestions | Scans venues; lacks learned relevance and scale evidence; MusicianController |

See [architecture](ARCHITECTURE.md) for clickable implementation evidence. These are observable design choices; authorship, historical motivation, and business impact require separate confirmation.

## Suggested demo

1. Start isolated local infrastructure using [local development](LOCAL_DEVELOPMENT.md). Check readiness.
2. Register a musician with synthetic data and complete part of onboarding.
3. Sign out and sign back in to show saved state and resume.
4. Add a profile image, complete onboarding, and enter the musician home screen.
5. Show genre matches if suitable local venues exist; explain an empty result honestly.
6. Optionally show venue/promoter onboarding or configured provider connections, keeping their scope explicit.

No public deployment, adoption numbers, performance benchmark, completed booking/payment flow, or individual contribution attribution is established by this checkout. Do not claim them without evidence.

## Assets and screenshots

The root README reuses the existing brand-owner SVG. [Brand asset guidance](../mvpconnect-app/assets/branding/BRAND_ASSETS.md) identifies the canonical logo and `npm run brand:generate` command. Welcome backgrounds and match imagery are application assets, not screenshots of verified flows.

No new screenshots are included in this pass. Future captures should show the actual running revision using synthetic accounts: persona selection, typed onboarding, media upload/completion, and musician venue matches. Record commit SHA, date, platform, viewport, setup/seed assumptions, and caption beside each asset. Exclude credentials, account emails, tokens, provider-console details, and presigned URLs. Check image rights before publishing and label mockups as mockups.

## Maintenance mechanism

Treat this document and the README capability table as the portfolio's source-controlled claim ledger. For each feature PR or release review:

1. Compare claims against changed routes, controllers, DTOs, configuration, and tests.
2. Update setup when manifests/defaults change; retain one detailed setup source in `LOCAL_DEVELOPMENT.md` and link module guides to it.
3. Mark affected claims as implemented, partial, planned, or unverified. A backend endpoint alone does not prove a complete UI workflow.
4. Record evidence path, revision, and uncertainty below. Keep older test totals dated rather than copying them into current claims.
5. Run relevant [checks](TESTING.md), review Markdown links, and refresh screenshots whose screens changed.
6. Review staged changes for secrets/private handoffs. Publish only supported claims.

This is a manual review mechanism, not an automated CI gate. No scheduled job or CI workflow is installed.

| Documentation area | Evidence to revisit | Current distinction / uncertainty |
| --- | --- | --- |
| Accounts/onboarding | AppNavigator, onboardingConfig, backend registry/services, sign-out tests | Implemented; dedicated venue/promoter dashboards absent |
| Profile/media privacy | PublicProfileService, SelfAccountService, MediaService and tests | Image flow implemented; not video hosting or security certification |
| Providers | Spotify/Google/OAuth clients, properties, connection tests | Implemented; live credentials/provider acceptance unverified here |
| Matching | MusicianController and musician home | Genre heuristic implemented; no ML/performance claims |
| Setup/testing | pom.xml, package.json/lockfile, Compose, properties | Commands audited; validation status in TESTING.md |
| Visuals | Canonical SVG, actual screen captures | Existing logo reused; no new screenshots |

Baseline evidence revision: `439eb614eee48fb7c813719f9410820059d11cb8`. Update it when re-auditing application behavior, not for prose-only edits.
