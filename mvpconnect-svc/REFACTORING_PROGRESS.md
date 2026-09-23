# Backend architecture evolution

MVPConnect's backend evolved from a relational persistence model to a Spring Boot
and Neo4j service organized around Artist, Venue, and Promoter accounts. This
reference summarizes the architectural decisions; the [architecture guide](../docs/ARCHITECTURE.md)
describes the current implementation.

## Persistent design decisions

- Controllers expose HTTP contracts, services own business rules, and repositories
  handle graph persistence.
- Intrinsic persona attributes remain properties. Independent identities and
  resources become nodes, with relationships representing meaningful associations.
- Stateless JWT authentication identifies the account and persona. Ownership checks
  protect self-service operations, and explicit DTOs separate public and self data.
- Versioned onboarding drafts support resume before validated data is promoted to
  canonical profiles.
- Media metadata belongs in Neo4j; private image bytes belong in object storage.
- Provider credentials and OAuth exchanges stay behind the backend boundary.

## Current product boundary

Onboarding V1 and dedicated post-onboarding Home foundations are complete for all
three personas. Profile and profile editing are the next product phase. Booking,
messaging, Board opportunities, and richer Connect recommendations remain future
work. The existing Artist-to-Venue genre-overlap heuristic is not a Home
recommendation engine.

See [Portfolio](../docs/PORTFOLIO.md) for the engineering stories and
[Testing](../docs/TESTING.md) for coverage and recorded verification boundaries.
