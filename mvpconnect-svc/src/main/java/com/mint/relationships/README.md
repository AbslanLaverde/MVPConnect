# Relationship modeling

This package currently contains no dedicated relationship-property classes.
Implemented graph associations are managed through node mappings and repository
queries elsewhere in the service.

## Current graph boundary

Intrinsic persona attributes remain properties. Independent identities and
resources become nodes, and meaningful associations become graph relationships.
Examples include:

- `HAS_ONBOARDING_DRAFT` and `HAS_STEP` for resumable onboarding.
- `HAS_MEDIA` for owned canonical media; gallery membership carries `sortOrder`.
- `PLAYED_AT` from Artists to `VenueIdentity` and `WORKS_WITH` from Promoters to
  `VenueIdentity` for historical references promoted after onboarding completion.

See [Architecture](../../../../../../../docs/ARCHITECTURE.md),
[Media Storage](../../../../../../MEDIA_STORAGE.md), and
[Venue Identity](../../../../../../VENUE_IDENTITY.md) for the implemented contracts.

## Future relationship models

Hiring, representation, booking, collaboration, social, and reputation models are
potential future work. Names such as `HIRES`, `REPRESENTED_BY`, and
`COLLABORATES_WITH` are design candidates, not implemented product contracts.
A booking involving Artist, Venue, and Promoter may warrant an independent node
with its own lifecycle rather than unrelated edges.

When relationship metadata needs an explicit object model, Spring Data Neo4j's
`@RelationshipProperties` and `@TargetNode` can represent it. The choice should
follow actual lifecycle and query requirements; no delivery sequence or automated
booking/recommendation behavior is implied.
