## Relationships Package

This package contains explicit Neo4j relationship entities for modeling business connections between Musicians, Venues, and Promoters.

---

## 🎯 Current Status (October 23, 2025)

**Implementation Priority:** These relationships will be implemented in **Phase 8** (Booking Flow), after authentication testing (Phase 4) and AI agents (Phases 5-6).

---

## 📋 Phase 1 Relationships (POC - Core Bookings)

### **1. HIRES** (Venue → Musician)
**Purpose:** Direct hiring relationship when venues book musicians without promoter intermediary

**Properties:**
- `bookingDate` (LocalDateTime) - When the booking was created
- `performanceDate` (LocalDateTime) - Scheduled performance date
- `fee` (Double) - Payment amount
- `status` (String) - PENDING | ACCEPTED | DECLINED | COMPLETED | CANCELLED
- `notes` (String) - Additional details or requirements

**Example:**
```java
@RelationshipProperties
public class HiringRelationship {
    @Id @GeneratedValue
    private Long id;
    
    @TargetNode
    private Musician musician;
    
    private LocalDateTime bookingDate;
    private LocalDateTime performanceDate;
    private Double fee;
    private String status; // PENDING, ACCEPTED, DECLINED, COMPLETED, CANCELLED
    private String notes;
}
```

**Use Cases:**
- Venue directly books musician for a show
- Track booking status (pending → accepted → completed)
- Store payment terms and performance details

---

### **2. REPRESENTED_BY** (Musician → Promoter OR Venue → Promoter)
**Purpose:** Ongoing representation relationship

**Properties:**
- `startDate` (LocalDateTime) - When representation began
- `representationType` (String) - EXCLUSIVE | NON_EXCLUSIVE
- `commissionRate` (Double) - Percentage or flat fee
- `contractTerms` (String) - Brief description of agreement
- `active` (Boolean) - Is this representation currently active?
- `endDate` (LocalDateTime) - Optional, if representation has ended

**Use Cases:**
- Musician signs with promoter for booking representation
- Venue contracts with promoter to source talent
- Track active vs. historical representation relationships

---

### **3. BOOKS** (Promoter → [Musician + Venue])
**Purpose:** Three-way booking facilitated by promoter

**Implementation Note:** This is a more complex relationship involving three entities. Options:
- **Option A:** Create a separate `Booking` node with relationships to Promoter, Musician, and Venue
- **Option B:** Use two relationships: Promoter BOOKS Musician, Promoter BOOKS_AT Venue (with shared booking ID)

**Recommended: Option A (Booking Node):**
```java
@Node("Booking")
public class Booking {
    @Id @GeneratedValue
    private String id;
    
    // References to the three entities
    @Relationship(type = "BOOKED_BY")
    private Promoter promoter;
    
    @Relationship(type = "FEATURES")
    private Musician musician;
    
    @Relationship(type = "AT_VENUE")
    private Venue venue;
    
    // Booking details
    private LocalDateTime bookingDate;
    private LocalDateTime performanceDate;
    private Double musicianFee;
    private Double promoterCommission;
    private String status; // PENDING, CONFIRMED, COMPLETED, CANCELLED
    private String notes;
}
```

**Use Cases:**
- Promoter books their represented musician at a venue
- Track three-way agreements with all parties
- Calculate commission splits

---

### **4. COLLABORATES_WITH** (Musician ↔ Musician OR Promoter ↔ Promoter)
**Purpose:** Peer-to-peer collaboration relationships

**Properties:**
- `collaborationType` (String) - JAM_SESSION | RECORDING | TOUR | SIDE_PROJECT | CO_PROMOTION
- `startDate` (LocalDateTime) - When collaboration began
- `active` (Boolean) - Is this collaboration ongoing?
- `description` (String) - Details about the collaboration

**Use Cases:**
- Musicians form bands or side projects
- Promoters co-promote events together
- Track active vs. past collaborations

---

## 🏗️ Implementation Plan

### **When to Implement (Phase 8 - Booking Flow):**

1. **Start with HIRES relationship** (simplest)
   - Create `HiringRelationship.java` class
   - Update `VenueRepository` to support creating/querying HIRES relationships
   - Create `BookingController` endpoint: `POST /bookings/hire` (Venue hires Musician)

2. **Add REPRESENTED_BY relationship**
   - Create `RepresentationRelationship.java` class
   - Enable musicians/venues to find and connect with promoters
   - Track active representation status

3. **Implement Booking node** (three-way)
   - Create `Booking.java` node (not a relationship, but a full node)
   - Allow promoters to create bookings involving their artists and venues
   - Most complex, do last

4. **Add COLLABORATES_WITH** (optional for POC)
   - May defer to post-POC if time is limited
   - Nice-to-have for networking features

---

## 🤖 AI Agent Integration

### **Our Tag-Based Architecture (Already Implemented):**

We use **List<String> properties** on nodes (not separate Tag nodes) for simplicity and POC speed:

**Musician Node:**
```java
private List<String> genres;      // ["Jazz", "Blues", "Soul"]
private List<String> vibes;       // ["Sophisticated", "Energetic"]
```

**Venue Node:**
```java
private List<String> genrePreferences;  // ["Jazz", "Rock", "Electronic"]
private List<String> ambience;          // ["Intimate", "Upscale"]
```

**Promoter Node:**
```java
private List<String> genreSpecialties; // ["Jazz", "Electronic"]
private List<String> eventTypes;       // ["Concerts", "Festivals"]
```

### **Why This Approach:**
✅ Simple to implement and query  
✅ Works perfectly with Jaccard similarity for recommendations  
✅ No additional Tag node management needed  
✅ Fast for POC validation  
⚠️ **Future:** Can migrate to Tag nodes in Phase 4+ if we need:
- Weighted tags (primary/secondary importance)
- Tag popularity analytics
- Complex tag hierarchies (sub-genres)
- Tag-based graph traversal

### **AI Agents Using Our Tags:**

**Phase 5 - Venue Sourcing Agent:**
- Scrapes NYC venues from Yelp/Google Maps
- Extracts genre preferences from reviews (NLP)
- Extracts ambience tags from review sentiment ("intimate", "upscale", "dive bar")
- Auto-populates `genrePreferences` and `ambience` Lists

**Phase 6 - Recommendation Engine:**
- Uses Jaccard similarity on genre/vibe Lists
- Matches Musician.genres with Venue.genrePreferences
- Matches Musician.vibes with Venue.ambience
- Weighted scoring: 40% genre + 30% vibe + 20% location + 10% budget

**Post-POC - Musician Auto-Tagging Agent:**
- Analyzes Spotify/YouTube when musician signs up
- Auto-populates genres and vibes from streaming data
- Extracts from social media bios and hashtags

---

## 🚫 Post-POC Relationships (Deferred)

These relationships are **important for production** but **not needed for POC**:

### **Phase 2 - Social/Discovery:**
- `FOLLOWS` - Users follow each other (networking)
- `FAVORITED` - Bookmark entities for later
- `INTERESTED_IN` - Express interest before formal booking

### **Phase 3 - Reputation/Quality:**
- `REVIEWS` - Rating and review system (Venue ↔ Musician, Promoter ↔ Musician, etc.)
- `PREVIOUSLY_WORKED_WITH` - Historical performance data for analytics

### **Phase 4 - Advanced Discovery:**
- Migrate to `Tag` nodes with `HAS_TAG` relationships (if needed)
- `Location` nodes for geographic hierarchies

### **Phase 5 - Platform Safety:**
- `BLOCKED` - User safety features
- `REPORTED` - Moderation and reporting

**Rationale for Deferral:**
- POC focuses on core booking flow (Phases 1-8)
- Social features are enhancement, not MVP
- Reviews require established user base
- Safety features are production concern, not POC validation

---

## 📝 Neo4j Relationship Best Practices

### **When to Use Relationship Entities:**
✅ Relationship has properties (dates, status, amounts)  
✅ Many-to-many with metadata  
✅ Need to query relationships directly  
✅ Relationship data is as important as node data  

### **Neo4j Spring Data Annotations:**
- `@RelationshipProperties` - Marks class as relationship properties
- `@TargetNode` - Specifies the target node
- `@Property` - Maps relationship properties
- `@Id @GeneratedValue` - Auto-generate relationship ID

### **Example Query (Cypher):**
```cypher
// Find all pending bookings for a musician
MATCH (m:Musician {id: $musicianId})<-[h:HIRES {status: 'PENDING'}]-(v:Venue)
RETURN m, h, v

// Find musicians a promoter represents
MATCH (p:Promoter {id: $promoterId})<-[r:REPRESENTED_BY {active: true}]-(m:Musician)
RETURN m, r

// Find venues looking for jazz musicians
MATCH (v:Venue)-[h:HIRES]->(m:Musician)
WHERE 'Jazz' IN m.genres AND h.status = 'PENDING'
RETURN v, m, h
```

---

## 🎯 Summary

**Current State:** Relationships package is ready but empty - waiting for Phase 8 implementation.

**Immediate Priority:** Complete Phase 4 (authentication testing) and Phases 5-6 (AI agents) first.

**Phase 8 Implementation Order:**
1. HIRES (Venue → Musician) - Simplest, start here
2. REPRESENTED_BY (Musician/Venue → Promoter) - Representation tracking
3. Booking node (three-way agreements) - Most complex
4. COLLABORATES_WITH (optional for POC)

**Tag Strategy:** ✅ Already implemented using List<String> properties on nodes. Works perfectly for AI matching and recommendations.

---

*Last Updated: October 23, 2025*
*Status: Documentation complete, implementation pending Phase 8*

