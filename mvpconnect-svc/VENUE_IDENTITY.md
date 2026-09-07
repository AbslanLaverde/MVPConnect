# Venue identity resolution

`Venue` and `VenueIdentity` intentionally serve different roles.

- `Venue` remains the authenticated account, onboarding owner, public claimed profile, and media owner.
- `VenueIdentity` is shared reference knowledge for a physical/business venue, regardless of whether it is currently claimed in MVPConnect.
- Artist `PLAYED_AT` and promoter `WORKS_WITH` history always targets `VenueIdentity`, so a later claim does not invalidate historical references.

## Resolution lifecycle

Venue references search `VenueIdentity` first. Google Places is consulted only after an empty local search or an explicit user action. Selecting a Google result resolves it by `googlePlaceId` and returns a stable `VenueIdentity.id`. Manual entries retain why Google was not used:

- `FREE_FORM` + `UNRESOLVED`: Google was reachable, but no suitable result was selected.
- `FREE_FORM_GOOGLE_UNAVAILABLE` + `RETRY_GOOGLE`: Google could not be consulted.

New identities start with `enrichmentStatus=PENDING`. Google provider fields remain separate from owner-controlled `Venue` fields and account-owned media.

Google photos are transient presentation data. Search and Place Details obtain a fresh first photo resource, the backend exchanges that resource for a short-lived key-free photo URI, and responses preserve all returned author attribution plus the photo/place Google Maps source link. Local Google-backed identities repeat that presentation lookup from their durable `googlePlaceId`; a failed lookup leaves the identity result intact and uses the venue placeholder.

Photo resource names and photo URLs are never written to `VenueIdentity`, cached durably, copied to MinIO/S3, converted to `MediaAsset`, or used as claimed profile media or AI input. The frontend never supplies a photo resource name and never receives the Google API key.

Future retry behavior is locked but not scheduled here. A successful retry keeps the same ID, fills Google fields, and changes the identity to `GOOGLE` + `RESOLVED` without resetting enrichment. A reachable no-match changes it to `FREE_FORM` + `UNRESOLVED`. Continued provider unavailability leaves the retry state unchanged.

## Onboarding relationship timing

Draft onboarding steps retain `VenueIdentity.id` values in `EntityReferenceDto`. Draft saves do not create graph relationships. At final completion, referenced IDs are verified and relationships are created with `MERGE`:

- `(:Musician)-[:PLAYED_AT]->(:VenueIdentity)`
- `(:Promoter)-[:WORKS_WITH]->(:VenueIdentity)`

`PLAYED_AT` represents experience, history, social proof, network proximity, and room familiarity. It must not implicitly copy venue genre, vibe, or event taxonomy onto the artist. `WORKS_WITH` may later provide promoter network context. Matching behavior is unchanged in this pass.

## Future claim contract

A future claim flow will associate an authenticated `Venue` with exactly one existing `VenueIdentity` (for example, via `CLAIMS`; the relationship name is not yet locked). Claiming must preserve the existing `VenueIdentity.id` and all historical relationships. It must not merge, delete, or recreate the identity. Existing authenticated venue accounts will eventually need identity backfill under the same rule.

## Deferred work

- Google retry reconciliation for `RETRY_GOOGLE`
- broader `FREE_FORM` venue reconciliation
- venue AI enrichment
- claimed `Venue` to `VenueIdentity` association and claim flow
- existing venue-account identity backfill
- matching integration
