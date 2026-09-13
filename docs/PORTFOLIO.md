# MVPConnect portfolio case study

## Project presentation

MVPConnect is a three-sided professional network for Artists, Venues, and Promoters in the live/local music ecosystem. Its product premise is that identity, discovery, and relationship management are fragmented across inboxes, social platforms, spreadsheets, and personal networks. Structured, editable profiles and meaningful associations provide a foundation for better discovery and future booking opportunities.

The strongest current demonstration is the path from a new account to a saved, resumable profile: persona-specific onboarding, typed validation, private image uploads, optional provider-backed identities, and server-confirmed completion. An Artist can then view genre-based venue matches and edit their profile. Venue and Promoter onboarding are present; the real home experience remains deferred, with legacy `MusicianHome` shared as a temporary destination.

The Expo / React Native client, Spring Boot API, and Neo4j model support that foundation. Use Artist in product prose and preserve `Musician` in exact implementation names. MVPConnect provides the connecting network rather than representing a fourth account persona.

| Persona | Current onboarding sequence | Intended product value |
| --- | --- | --- |
| Artist | The Basics → Your Sound → Playing Live → Media → Your Goals | Present identity, sound, experience, and intent |
| Venue | The Room → Your Music → The Stage → Booking → Media → Your Goals | Describe room, music, production, and booking needs |
| Promoter | The Business → Your Lane → Your Network → Media → Your Goals | Describe markets, specialties, and relationships |

Collecting goals or relationships does not mean they already power ranking or operational roster management.

## Engineering decisions to discuss

| Decision | What it makes possible | Tradeoff and evidence |
| --- | --- | --- |
| Keep intrinsic attributes as properties and independent resources as nodes | Model meaningful relationships without normalizing every profile field | Requires explicit lifecycle/identity decisions; persona nodes and identity/media repositories |
| Versioned drafts separate from canonical profiles | Partial onboarding can resume before completion | Client/server contracts must stay aligned; OnboardingStepRegistry and onboarding services |
| External identity nodes separate from accounts | Reference artists and places that have not signed up | Resolution and provider availability need handling; external-artist/venue-identity services |
| Direct uploads to private storage | Bytes bypass the API; access can expire | Connectivity and cross-system cleanup matter; MediaService and S3ObjectStorageService |
| Public DTOs distinct from self-account data | Discovery exposes selected fields without account/provider secrets | New fields need intentional projection decisions; public/self/discovery services |
| Simple genre-overlap matching | Explainable initial venue suggestions | Scans venues; lacks learned relevance and scale evidence; MusicianController |

See [architecture](ARCHITECTURE.md) for implementation evidence. Product rationale follows the supplied product brief; exact behavior follows source. Individual authorship and measured business impact still require separate evidence.

## Interview and buyer narrative

Use **problem → constraint → decision → implementation → tradeoff → verification**. Users may leave onboarding before finishing, but incomplete answers must not count as a completed profile. Versioned drafts and backend-owned completion allow resume and validation before canonical promotion. The cost is coordinating client/server contracts and failure recovery; workflow and ownership tests provide evidence beyond a wizard UI.

For buyers, the current asset is the multi-persona identity/network foundation: structured onboarding, canonical promotion, graph relationships, media lifecycles, provider integration, privacy projections, and verification tooling. It is not yet an operational marketplace. Avoid extrapolating adoption, revenue, or readiness from the architecture.

## Product direction — planned

The graph is intended to support role-dependent discovery: Artists finding Venues, Promoters, or collaborators; Venues finding Artists or Promoters; Promoters finding talent, venues, and eventually opportunities. A future opportunity could combine **roster artist × venue open date × relevant fit**, leading to an inquiry. Current genre-overlap matches do not implement that model.

Future classification and richer ranking could use geography, draw/capacity, goals, preferences, and network associations. The guiding intent is that AI may suggest information but people confirm or correct it. No complete AI classification, supply-sourcing, or recommendation pipeline is claimed today.

Deferred work includes real home/profile experiences, post-onboarding goal editing, goals-driven ranking, provider feeds/players, identity claim/verification, roster and venue-network dashboards, availability, messaging, direct video upload, media captions/tagging/featured media, and Google venue-photo import. Messaging is intended to become a separate service; no messaging microservice is implemented in this checkout.

Payments, contracts, and transaction-heavy booking infrastructure were deliberately deferred to focus first on introductions and discovery. These are product directions, not delivery dates or an approved pricing schedule. Historical launch hypotheses and unapproved pricing/limits are omitted from public presentation.

## Suggested demo

1. Start isolated local infrastructure using [local development](LOCAL_DEVELOPMENT.md). Check readiness.
2. Register an Artist with synthetic data and complete part of onboarding.
3. Sign out and sign back in to show saved state and resume.
4. Add a profile image, complete onboarding, and enter the musician home screen.
5. Show genre matches if suitable local venues exist; explain an empty result honestly.
6. Optionally show venue/promoter onboarding or configured provider connections, keeping their scope explicit.

No public deployment, adoption numbers, performance benchmark, completed booking/payment flow, or individual contribution attribution is established by this checkout. Do not claim them without evidence.

## Assets and screenshots

The README uses five user-supplied images, preserved byte-for-byte under `docs/assets/screenshots`. The hero is a **promotional composite**; the other four were supplied as **application runtime screenshots**. They were not captured or live-verified by this documentation branch. Image content does not establish that marketing promises, provider behavior, or every visible workflow is currently implemented.

| Asset / caption | Kind and purpose | Platform / image dimensions | Capture provenance | Visible account data |
| --- | --- | --- | --- | --- |
| [mvpconnect-hero.png](assets/screenshots/mvpconnect-hero.png) — Product experience across desktop and mobile | Promotional composite; main README hero | Desktop/mobile presentation, 1536 × 1024 | Date and creation revision unknown; user-supplied artwork | Illustrative profiles and placeholder sign-in text, not customer evidence |
| [artist-onboarding-desktop.png](assets/screenshots/artist-onboarding-desktop.png) — Artist onboarding: The Basics | Runtime screenshot; profile identity and onboarding progression | Web/desktop, 1517 × 934 | Source filename indicates September 4, 2026, 16:55:02; capture timezone and commit/branch unknown | `TESTBAND20`, synthetic/test data |
| [venue-onboarding-desktop.png](assets/screenshots/venue-onboarding-desktop.png) — Venue onboarding: The Room | Runtime screenshot; room identity and venue-specific progression | Web/desktop, 1917 × 955 | Source filename indicates September 4, 2026, 16:56:50; capture timezone and commit/branch unknown | `VENUE1`, synthetic/test data |
| [promoter-onboarding-desktop.png](assets/screenshots/promoter-onboarding-desktop.png) — Promoter onboarding: The Business | Runtime screenshot; business/scene identity | Web/desktop, 1915 × 984 | Source filename indicates September 4, 2026, 16:56:07; capture timezone and commit/branch unknown | `TESTPROMOTER20`, synthetic/test data |
| [welcome-desktop.png](assets/screenshots/welcome-desktop.png) — Onboarding completion and Welcome | Supplied runtime screenshot; graduation moment after the persona sequence | Web/desktop, 1725 × 912 | Date and commit/branch unknown | No account-specific identity visible |

Dimensions describe image pixels, not verified browser viewport sizes. The onboarding date comes from filenames, not independently verified capture metadata. The supplied Venue/Promoter screenshots use labels such as “The Music” and “Specialties”; this checkout's configuration uses “Your Music” and “Your Lane”. The supplied Welcome title/layout also differs from current `WelcomeScreen`. Preserve these as supplied captures, not pixel-exact evidence of this branch. No visible real private account information or credentials were identified; test names have not been altered to fabricate customers.

Original files total approximately 4.30 MiB. No resizing, cropping, color changes, or lossy compression was applied. Onboarding screenshots are stacked at normal README content width and link to the full-resolution files through this ledger. Each image appears once in the root README, with meaningful alt text.

[Brand asset guidance](../mvpconnect-app/assets/branding/BRAND_ASSETS.md) still identifies the canonical application logo and `npm run brand:generate` command. The supplied composite does not replace those application assets.

For future captures, record commit SHA, date, platform, viewport, setup/seed assumptions, and caption. Exclude credentials, account emails, tokens, provider-console details, and presigned URLs. Check image rights before publishing and label mockups as mockups. Refresh images when relevant screens change rather than silently assigning a newer revision to older captures.

## Maintenance mechanism

Treat this document and the README capability table as the portfolio's source-controlled claim ledger. Review them when a meaningful capability, architecture decision, integration, privacy/security change, UX milestone, or verification improvement lands. Not every commit needs portfolio prose. At those milestones:

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
| Visuals | Canonical brand guidance and image provenance ledger above | One promotional composite and four supplied runtime screenshots; capture revisions unknown |

Baseline evidence revision: `439eb614eee48fb7c813719f9410820059d11cb8`. Update it when re-auditing application behavior, not for prose-only edits.
