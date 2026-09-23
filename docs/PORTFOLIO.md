# MVPConnect portfolio case study

Source code remains authoritative when this case study and the implementation differ.

## Product story

MVPConnect is a three-sided professional network for Artists, Venues, and Promoters in live and local music. Today, identity, discovery, and working relationships are fragmented across social platforms, inboxes, spreadsheets, and personal contacts. MVPConnect structures that information so each participant can present who they are and eventually find relevant people, places, and opportunities.

Onboarding V1 and Home V1 form the completed first-run product milestone. Each persona has a tailored, resumable flow that collects identity, operating context, media, relationships, and goals before promoting validated answers into canonical profile data. Completed accounts graduate through Welcome into a dedicated Artist, Venue, or Promoter Home.

| Persona | Onboarding sequence | Product outcome |
| --- | --- | --- |
| Artist | The Basics → Your Sound → Playing Live → Media → Your Goals | A structured live-music identity with sound, draw, setup, references, media, and intent |
| Venue | The Room → Your Music → The Stage → Booking → Media → Your Goals | A room profile with audience, production, booking, media, and intent |
| Promoter | The Business → Your Lane → Your Network → Media → Your Goals | A promoter identity with specialties, markets, artist/venue relationships, media, and intent |

Web and Android QA are complete for all three onboarding and Home flows. iOS has not yet been QA-verified. Profile and profile editing are the next product phase.

## Engineering story 1: Server-authoritative onboarding reliability

### Why it matters

Onboarding spans multiple sessions, devices, optional provider operations, and steps with different validation rules. A visual wizard is not enough: incomplete edits must not silently overwrite the last valid draft, and completion must not create divergent canonical data.

### Technical decisions

- Versioned typed drafts remain separate from canonical persona profiles.
- Valid-only autosave preserves the last server-accepted state.
- Save/complete mutations synchronize the RTK Query cache before navigation consumes the returned onboarding state.
- Continue serializes against active persistence so one activation produces one deterministic transition.
- Sign Out waits for active persistence, flushes valid dirty data, and asks before discarding invalid unsaved edits.
- Completed-step editing uses explicit reopen semantics.
- Final completion revalidates persisted steps and performs idempotent canonical promotion.

### Verification evidence

- Focused frontend tests cover invalid/valid autosave, hydration, reopen, save failure, completion failure, one-press transition, and Sign Out coordination.
- Backend tests cover step contracts, state transitions, promotion, authorization, and idempotency.
- Cross-platform QA verified complete Artist, Venue, and Promoter flows on web and Android.

### Interview talking point

Describe the failure mode that appears when UI navigation outruns an asynchronous cache update, then explain why consuming the server mutation response is more deterministic than relying on eventual refetch timing.

## Engineering story 2: Production-oriented media lifecycle

### Why it matters

Profile media crosses database, object-storage, UI, and onboarding boundaries. Upload success alone is not enough: ownership, canonical membership, ordering, deletion, hydration, and partial failure must agree.

### Technical decisions

- Neo4j owns `MediaAsset` metadata and persona/draft relationships; private MinIO/S3-compatible storage owns image bytes.
- The backend issues presigned upload/access URLs and verifies stored MIME/length metadata before marking an asset ready.
- Hero images use a consistent 3:1 presentation while preserving single-select behavior.
- Galleries allow multi-select intake but upload sequentially, keeping successful earlier items when a later item fails.
- Failed items remain retryable/removable instead of invalidating the entire batch.
- Canonical gallery relationships preserve a deterministic contiguous zero-based `sortOrder`.

### Verification evidence

- Jest covers media validation, single and multi-select behavior, limits, hydration, reordering, retry, removal, and persona-specific media contracts.
- Backend tests cover ownership, upload completion, storage metadata, canonical membership, and public/self projection.
- Android QA verified contained Hero rendering, compact two-column galleries, batching, limits, ordering, and removal.

### Interview talking point

Use the gallery flow to discuss the tradeoff between parallel throughput and predictable partial-failure semantics. Sequential uploads were chosen for an onboarding-sized batch where clarity and recoverability matter more than peak throughput.

## Engineering story 3: Cross-platform UI stabilization

### Why it matters

React Native Web and native platforms share component logic but not identical rendering behavior. Controls that look correct in a desktop browser can clip, overflow, or lose SVG paint on Android.

### Technical decisions

- Shared persona accents and onboarding primitives keep Artist, Venue, and Promoter behavior aligned.
- Responsive layouts use the established shell breakpoints rather than parallel mobile screens.
- Selected-state components communicate state through checks/semantics as well as color.
- Media cards, option tiles, equipment quantities, and footers were corrected at the shared-component level where the contract was shared.
- The Welcome reveal uses a generated native-safe PNG derived from the canonical SVG while preserving opacity-only animation.

### Verification evidence

- Full Jest and TypeScript checks cover shared components, screens, navigation, responsive helpers, and accessibility semantics.
- Android QA verified the Step 1 media card, Step 2/3 selection fills, Step 4 media layout, persistence behavior, and Welcome reveal.
- Web QA verified all three persona onboarding flows.

### Interview talking point

Explain how a structurally present SVG can remain invisible on native because of gradient-reference support, and why a generated raster derivative is safer than maintaining an unrelated hand-edited asset.

## Engineering story 4: Persona-specific Home architecture

### Why it matters

Artist, Venue, and Promoter Homes share presentation and state conventions, but each role has a different product center of gravity. Reusing a single conditional dashboard would couple future modules and make persona behavior harder to reason about.

### Technical decisions

- `HomeShell`, `HomeHeader`, `HomeSection`, `HomeEmptyState`, `AttentionSection`, and `HomeIdentityError` provide responsive structure and shared state conventions.
- `ArtistHomeScreen`, `VenueHomeScreen`, and `PromoterHomeScreen` remain separate explicit compositions.
- Home reads authenticated identity from the existing `/me` projection without reproducing the canonical profile.
- Login and Welcome use one completed-account resolver for Artist, Venue, and Promoter destinations.
- Welcome remains a one-time graduation transition; later completed logins enter Home directly.
- The legacy `MusicianHome` route was removed after all three persona destinations existed.
- V1 renders truthful Attention empty states instead of fake recommendations, opportunities, or disabled actions.

### Verification evidence

- Routing tests cover completed and incomplete account behavior for all three personas.
- Screen tests cover identity, image/fallback, greeting, Attention, loading, error, retry, and intentional absence of future modules.
- Web and Android QA verified the three persona destinations, responsive layout, safe areas, scrolling, and regression routing.

### Interview talking point

Explain the balance between reuse and product specificity: shared primitives remove duplicate infrastructure, while explicit persona compositions avoid a conditional mega-dashboard and leave future modules independently composable.

## Engineering story 5: Provider simplification

### Why it matters

External identity and social integrations should reflect real provider capabilities without forcing every provider through OAuth or leaving retired fields in contracts and stored data.

### Technical decisions

- Spotify is an external Artist identity/search source, not MVPConnect login.
- YouTube and SoundCloud use backend-owned OAuth with PKCE, state checks, exact return allowlisting, and encrypted credentials.
- Instagram, Facebook, and Bandcamp remain validated URL-first connections for applicable personas.
- TikTok was removed from active frontend/backend contracts and persisted product data rather than retained as a misleading placeholder.
- The graph rule remains deliberate: intrinsic values are properties, independent identities/resources are nodes, and meaningful associations are relationships.

### Verification evidence

- Focused unit/service tests cover provider matrices, URL normalization, OAuth state/replay/allowlist behavior, and connection promotion.
- The recorded API/E2E milestone covers generated Postman/Newman requests and assertions; see [Testing](TESTING.md) for provenance.

### Interview talking point

Discuss why “OAuth everywhere” is not automatically more secure or useful: the connection method should follow provider capabilities and product needs, while credentials and callbacks remain server-owned whenever OAuth is used.

## Architecture decisions worth discussing

- **Properties vs nodes:** ordinary persona attributes stay readable; independent media/external identities gain lifecycle and relationships.
- **Draft vs canonical data:** incomplete input can resume without masquerading as a completed profile.
- **Public vs self projections:** private goals, booking contact data, and provider credentials do not leak through discovery DTOs.
- **Presigned object transfer:** large bytes bypass the API, with explicit ownership and metadata checks.
- **Explainable first matching:** the current Artist-to-Venue heuristic uses shared genres; richer deterministic signals should precede opaque ML ranking.

See [Architecture](ARCHITECTURE.md) for implementation boundaries and source links.

## Suggested demo

1. Register one persona and complete part of onboarding.
2. Sign out and back in to demonstrate server-authoritative resume.
3. Complete media with a Hero and ordered gallery, then finish Goals.
4. Show canonical completion and the one-time Welcome graduation experience.
5. Enter the persona-specific Home and compare its purpose with Profile and Discovery.
6. Explain honestly that profile editing and actionable Home modules are future phases.

Do not present a public deployment, user adoption, payments, booking transactions, iOS QA, or AI-driven matching as completed evidence.

## Assets and screenshots

The README uses five supplied images preserved under `docs/assets/screenshots`. The hero is promotional artwork; the other four are runtime captures with synthetic accounts.

| Asset | Kind | Dimensions | Accuracy note |
| --- | --- | --- | --- |
| [mvpconnect-hero.png](assets/screenshots/mvpconnect-hero.png) | Promotional composite | 1536 × 1024 | Strong README artwork, but not a runtime capture and not GitHub's ideal 1280 × 640 social-preview ratio |
| [artist-onboarding-desktop.png](assets/screenshots/artist-onboarding-desktop.png) | Runtime, web desktop | 1517 × 934 | Representative Step 1 capture; predates final V1 copy/state polish |
| [venue-onboarding-desktop.png](assets/screenshots/venue-onboarding-desktop.png) | Runtime, web desktop | 1917 × 955 | Representative Step 1 capture; predates final V1 stabilization |
| [promoter-onboarding-desktop.png](assets/screenshots/promoter-onboarding-desktop.png) | Runtime, web desktop | 1915 × 984 | Stale visible copy includes “Specialties” where current product uses “Your Lane” |
| [welcome-desktop.png](assets/screenshots/welcome-desktop.png) | Runtime, web desktop | 1725 × 912 | Current final environment; the preceding native reveal is animation and is not shown here |

Recommended recaptures are current Artist, Venue, and Promoter Step 1 desktop screens; one Android Media screen showing Hero/gallery behavior; and a current final Welcome capture. Capture accounts should remain synthetic and free of credentials or private contact data.

## Product direction

The next phase turns canonical onboarding data into public/self profiles and editing experiences, starting with Artist and then extending to Venue and Promoter. Later milestones may add actionable Home modules, discovery, explainable Connect recommendations, structured Board opportunities, availability, roster/network workflows, inquiries, connections, and messaging.

Potential AI-derived profile intelligence should be user-reviewable and correctable. No complete AI classification, recommendation pipeline, operational booking marketplace, or delivery schedule is claimed.
