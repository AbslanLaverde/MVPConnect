## Relationships Package

This package contains explicit Neo4j relationship entities with properties.

## Business Domain Relationships

### Musician Relationships:
1. **COLLABORATES_WITH** (Musician ↔ Musician)
   - Musicians can collaborate with other musicians
   - Properties: collaboration type, start date, active status

2. **HIRED_BY** (Musician → Venue)
   - Musicians can be directly hired by venues
   - Properties: booking date, performance date, fee, status (pending/confirmed/completed)

3. **REPRESENTED_BY** (Musician → Promoter)
   - Musicians can work with promoters to find venues
   - Properties: representation type, start date, commission rate, active status

### Promoter Relationships:
1. **COLLABORATES_WITH** (Promoter ↔ Promoter)
   - Promoters can collaborate with other promoters
   - Properties: partnership type, start date, active status

2. **REPRESENTS** (Promoter → Venue)
   - Promoters can contact and represent venues
   - Properties: representation start date, agreement terms, active status

3. **BOOKS** (Promoter → Musician → Venue)
   - Promoters find musicians to play at their represented venues
   - Properties: booking date, performance date, fee arrangement, status

### Venue Relationships:
1. **HIRES** (Venue → Musician)
   - Venues can directly hire musicians
   - Properties: booking date, performance date, fee, status

2. **REPRESENTED_BY** (Venue → Promoter)
   - Venues can contact promoters to find musicians
   - Properties: contract start date, terms, active status

---

## Additional Relationship Types (Phase 2+)

### Social/Networking Relationships:
1. **FOLLOWS** (Any → Any)
   - Users follow each other for updates and networking
   - Properties: follow date, notification preferences
   - Enables: Discovery, feed generation, recommendations

2. **FAVORITED** (Any → Any)
   - Save entities for later reference
   - Properties: date added, notes, folder/tag

### Reputation/Review Relationships:
3. **REVIEWS** (Bidirectional between all entities)
   - Venue ↔ Musician: Review after performances
   - Promoter ↔ Musician: Review professional collaboration
   - Venue ↔ Promoter: Review representation quality
   - Properties: rating (1-5), review text, date, response, helpful votes

### Pre-Booking Pipeline Relationships:
4. **INTERESTED_IN** (Any → Any)
   - Express interest before formal agreement
   - Properties: inquiry date, status (pending/accepted/declined), message
   - Examples: Musician interested in Venue, Promoter interested in representing Venue

5. **INVITED_TO** (Any → Any)
   - Formal invitation to bid/propose
   - Properties: invitation date, deadline, requirements, status (pending/accepted/declined)
   - Examples: Venue invites Musician to submit proposal for date

### Historical/Analytics Relationships:
6. **PREVIOUSLY_WORKED_WITH** (Any → Any)
   - Historical record of completed collaborations
   - Properties: dates, number of collaborations, last date, total revenue
   - Separate from active relationships - used for analytics and recommendations

### Discovery/Categorization (requires new Node types):
7. **PERFORMS_GENRE** / **HOSTS_GENRE** / **SPECIALIZES_IN_GENRE** (Any → Genre)
   - Tag entities with genres (Rock, Jazz, Electronic, etc.)
   - Properties: primary/secondary, years of experience
   - Enables: Genre-based search and matching

8. **LOCATED_IN** / **OPERATES_IN** (Any → Location)
   - Geographic relationships (City, State, Region)
   - Properties: primary location, willing to travel radius
   - Enables: Location-based search and filtering

### Platform Safety/Moderation:
9. **BLOCKED** (Any → Any)
   - User-initiated blocks for safety
   - Properties: block date, reason, mutual/one-way

10. **REPORTED** (Any → Any)
    - Report problematic behavior
    - Properties: report date, reason, status, resolution

---

## Relationship Entities Priority

### Phase 1 (MVP - Core Bookings):
- **CollaboratesWithRelationship.java** - For Musician↔Musician and Promoter↔Promoter collaborations
- **HiringRelationship.java** - For direct Venue→Musician bookings
- **RepresentationRelationship.java** - For Musician→Promoter and Venue→Promoter representation
- **BookingRelationship.java** - For Promoter-facilitated bookings (Promoter books Musician at Venue)

### Phase 2 (Social/Discovery):
- **FollowsRelationship.java** - Social networking
- **InterestedInRelationship.java** - Pre-booking pipeline
- **FavoritedRelationship.java** - Bookmarking system

### Phase 3 (Reputation/Quality):
- **ReviewsRelationship.java** - Rating and review system
- **PreviouslyWorkedWithRelationship.java** - Historical analytics

### Phase 4 (Advanced Discovery):
- **Genre.java** (new node) + genre relationships
- **Location.java** (new node) + location relationships

### Phase 5 (Platform Safety):
- **BlockedRelationship.java** - User safety
- **ReportedRelationship.java** - Moderation system

---

## AI Agent Integration (Future Phase)

### Agentic AI Features:
1. **Venue/Promoter Sourcing Agent**
   - AI agent to automatically source and add venues/promoters from target markets (starting with NYC POC)
   - Scrape/aggregate data from public sources
   - Auto-populate profiles with initial data

2. **Recommendation Engine Agent**
   - AI agent to recommend musicians to venues/promoters based on tags and relationships
   - Match based on genre, location, ambience, past performance data
   - Learn from successful bookings and reviews

### Tagging Strategy:
All three main entities (Musician, Promoter, Venue) should support rich tagging for AI matching:

#### Tag Categories:
- **Genre Tags**: Rock, Jazz, Blues, Electronic, Hip-Hop, Country, Classical, etc.
  - Can have multiple tags with weights (primary/secondary)
  - Enables genre-based matching

- **Ambience/Vibe Tags**: Intimate, High-energy, Casual, Upscale, Dive, Rooftop, Underground, etc.
  - Describes atmosphere and experience
  - Helps match musician style to venue vibe

- **Location Tags**: Neighborhood, borough, city, region
  - Granular geographic data for local discovery
  - Travel radius preferences

- **Capacity/Size Tags**: Small (0-50), Medium (50-200), Large (200-500), Venue (500+)
  - For venues and typical musician audience size
  - Helps match appropriate acts to spaces

- **Additional Tags**:
  - Equipment available (sound system, instruments)
  - Audience demographic
  - Time slots (lunch, happy hour, evening, late night)
  - Day of week preferences
  - Price point / budget tier

#### Implementation:
- Tags can be modeled as **Tag nodes** with relationships: `HAS_TAG`, `TAGGED_WITH`
- Alternative: Store as array properties on nodes (simpler but less queryable)
- Recommendation: Use Tag nodes for Phase 4+ to enable:
  - Tag-based graph traversal
  - Weighted tag matching
  - Tag popularity analytics
  - AI agent learning from tag combinations

#### AI Agent Data Flow:
1. **Sourcing Agent** → Creates Venue/Promoter nodes → Auto-applies tags from scraped data
2. **Tagging Agent** → Enriches existing nodes with additional tags based on analysis
3. **Recommendation Agent** → Uses tag relationships to find optimal matches
4. **Learning Agent** → Updates tag weights based on booking success/reviews

---

### When to use explicit relationship entities:
- When relationships need properties (e.g., booking status, date, payment amount)
- For complex many-to-many relationships
- When you need to query relationships directly
- When relationship data is as important as node data

### Neo4j Annotations:
- `@RelationshipProperties` - Marks a class as relationship properties
- `@TargetNode` - Specifies the target node
- `@Property` - Maps relationship properties
- Properties store additional relationship data (dates, status, terms, etc.)

### Purpose:
- Model the complex network of collaborations and bookings
- Track booking status, dates, payment terms
- Enable relationship-specific queries (find all active bookings, find musicians by promoter, etc.)
- Capture the business context of connections between entities

