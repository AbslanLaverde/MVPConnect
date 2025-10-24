# MVPConnect Refactoring Progress

**Date:** October 23, 2025  
**Status:** Authentication Flow Complete - Ready for Testing with Neo4j

---

## ✅ Completed Work

### 1. **POM.xml Modernization**
- ✅ Upgraded to Java 21
- ✅ Upgraded to Spring Boot 3.3.5
- ✅ Replaced JPA/Hibernate/PostgreSQL with Neo4j
- ✅ Added JWT dependencies (jjwt 0.12.6)
- ✅ Added Lombok, validation, and test dependencies

### 2. **Configuration Updates**
- ✅ Updated `application.properties` with Neo4j connection settings
- ✅ Added JWT configuration (secret, expiration)
- ✅ Added CORS configuration
- ✅ Deleted obsolete `hibernate.cfg.xml`
- ✅ Deleted obsolete `HibernateConfig.java`
- ✅ Created `Neo4jConfig.java`

### 3. **Application.java**
- ✅ Removed Hibernate JPA exclusion
- ✅ Cleaned up for Spring Boot 3.x

### 4. **Package Structure Created**
```
com.mint/
├── config/          ✅ COMPLETE
│   ├── Neo4jConfig.java
│   └── GlobalExceptionHandler.java
├── controllers/     ✅ COMPLETE & CLEANED
│   └── AuthController.java
├── services/        ✅ COMPLETE & CLEANED
│   └── AuthService.java
├── repositories/    ✅ COMPLETE & CLEANED
│   ├── MusicianRepository.java
│   ├── VenueRepository.java
│   └── PromoterRepository.java
├── dto/             ✅ COMPLETE
│   ├── request/     (LoginRequest, MusicianSignupRequest, PromoterSignupRequest, VenueSignupRequest)
│   └── response/    (JwtAuthenticationResponse, ApiResponse, ErrorResponse)
├── security/        ✅ COMPLETE (6 files)
│   ├── JwtTokenProvider.java
│   ├── JwtAuthenticationFilter.java
│   ├── JwtAuthenticationEntryPoint.java
│   ├── CustomUserDetails.java
│   ├── CustomUserDetailsService.java
│   └── SecurityConfig.java
├── nodes/           ✅ COMPLETE (3 lean POC entities)
│   ├── Musician.java (13 fields)
│   ├── Venue.java (14 fields)
│   └── Promoter.java (13 fields)
└── relationships/   (documented, ready for Phase 8)
```

### 5. **JWT Security System - FULLY BUILT**
- ✅ Token generation and validation
- ✅ BCrypt password encoding
- ✅ Authentication filter and entry point
### 7. **Phase 1: Neo4j Nodes - COMPLETE**
- ✅ **Musician.java** - 13 fields (auth + profile + matching tags)
- ✅ **Venue.java** - 14 fields (auth + profile + matching tags)
- ✅ **Promoter.java** - 13 fields (auth + profile + matching tags)
### **IMMEDIATE: Test Authentication Flow (Ready Now)**

**Prerequisites:**
1. Start Neo4j database on `bolt://localhost:7687`
   - Username: `neo4j`
   - Password: `changeme` (or update in application.properties)
2. Start Spring Boot application

**Testing with Postman:**

**Test 1: Signup Musician**
```
POST http://localhost:8081/auth/signup/musician
Content-Type: application/json

{
  "name": "Jazz Trio",
  "email": "jazztrio@test.com",
  "password": "password123",
  "bio": "Professional jazz ensemble",
  "location": "New York, NY",
  "genres": ["Jazz", "Blues"],
  "vibes": ["Sophisticated", "Energetic"],
  "minimumFee": "$500",
  "willingToTravel": true,
  "websiteUrl": "https://jazztrio.com",
  "instagramHandle": "@jazztrio"
}

Expected: 201 Created with JWT token
```

**Test 2: Signup Venue**
```
POST http://localhost:8081/auth/signup/venue
Content-Type: application/json

{
  "venueName": "Blue Note Jazz Club",
  "email": "bluenote@test.com",
  "password": "password123",
  "description": "Legendary jazz venue",
  "location": "131 W 3rd St, New York, NY",
  "capacity": 200,
  "genrePreferences": ["Jazz", "Blues", "Soul"],
  "ambience": ["Intimate", "Upscale"],
  "typicalBudget": "$800-$1500",
  "liveMusic": true,
  "websiteUrl": "https://bluenotejazz.com"
}
- ✅ **MusicianRepository** - extends Neo4jRepository with findByEmail() and existsByEmail()
Expected: 201 Created with JWT token
```

**Test 3: Signup Promoter**
```
POST http://localhost:8081/auth/signup/promoter
Content-Type: application/json
  - signupVenue() - creates venue, hashes password with BCrypt, generates JWT
{
  "businessName": "NYC Events",
  "email": "nycevents@test.com",
  "password": "password123",
  "bio": "Premier event promotion",
  "location": "New York, NY",
  "genreSpecialties": ["Jazz", "Rock", "Electronic"],
  "eventTypes": ["Concerts", "Festivals"],
  "acceptingNewArtists": true,
  "currentRosterSize": 5,
  "websiteUrl": "https://nycevents.com",
  "phone": "555-1234"
}
  - emailExists() - validates email uniqueness across all user types
Expected: 201 Created with JWT token
```

**Test 4: Login (any user type)**
```
POST http://localhost:8081/auth/login
Content-Type: application/json
  - POST /auth/signup/promoter
{
  "email": "jazztrio@test.com",
  "password": "password123"
}

Expected: 200 OK with JWT token containing userType="MUSICIAN"
```

**Test 5: Duplicate Email (should fail)**
```
POST http://localhost:8081/auth/signup/musician
Content-Type: application/json

{
  "name": "Another Band",
  "email": "jazztrio@test.com",
  "password": "password123"
}

Expected: 400 Bad Request - "Email already registered"
```

**Test 6: Invalid Credentials (should fail)**
```
POST http://localhost:8081/auth/login
Content-Type: application/json

{
  "email": "jazztrio@test.com",
  "password": "wrongpassword"
}

Expected: 401 Unauthorized
```

**Success Criteria:**
- ✅ All three user types can signup successfully
- ✅ JWT tokens are generated with correct claims (userId, email, userType)
- ✅ Passwords are BCrypt hashed in Neo4j (verify in Neo4j browser)
- ✅ Duplicate emails are rejected across all user types
- ✅ Login works for all user types with correct credentials
- ✅ Invalid credentials return 401 errors
- ✅ Nodes are created in Neo4j with proper labels (Musician, Venue, Promoter)

- ✅ Security configuration with proper CORS
- ✅ Public endpoints configured (signup/login)
- ✅ Request/Response DTOs created
- ✅ Global exception handler

### 6. **Obsolete Files Deleted**
- ✅ `hibernate.cfg.xml`
- ✅ `HibernateConfig.java`
- ✅ `WebSecurityConfig.java`

---

## 📋 Next Steps (When We Resume)

### **Phase 1: Create Neo4j Node Entities** ✅ COMPLETE
- ✅ Musician.java (13 fields)
- ✅ Venue.java (14 fields)
- ✅ Promoter.java (13 fields)

### **Phase 2: Create Neo4j Repositories**
Simple interfaces in `repositories/` package:

1. **MusicianRepository** extends Neo4jRepository
    - `Optional<Musician> findByEmail(String email)`
    - `boolean existsByEmail(String email)`

2. **PromoterRepository** extends Neo4jRepository
    - Same methods as above

3. **VenueRepository** extends Neo4jRepository
    - Same methods as above

### **Phase 3: Wire Up Authentication**
1. Implement `CustomUserDetailsService.loadUserByUsername()` - query all 3 repositories
2. Create `AuthService` with signup/login logic
3. Create `AuthController` with signup/login endpoints

### **Phase 4: Test Authentication Flow**
1. Test signup endpoints with Postman
2. Test login endpoints with Postman
3. Test protected endpoints with JWT

### **Phase 5: AI Agent - Sourcing Agent (POC Priority)** 🤖
**Goal:** Auto-populate database with 50-100 NYC venues to enable testing and demonstrate AI capability

1. **Create VenueSourcingService**
   - Integrate Google Maps API (venue discovery)
   - Integrate Yelp API (ratings, reviews, categories, photos)
   - NLP analysis of reviews to extract genre/ambience tags
   - Parse and map data to Venue node fields

2. **Data to Extract:**
   - venueName, location, capacity estimates
   - genrePreferences (from event listings, reviews)
   - ambience tags (from review sentiment: "intimate", "energetic", "upscale")
   - logoUrl, websiteUrl, bookingEmail
   - typicalBudget (from price range indicators)

3. **Implementation:**
   - Background script/service (can run independently)
   - Mark sourced venues with flag for human verification
   - Store raw data for refinement

**Why in POC:** 
- Provides real data for musician matching
- Demonstrates AI differentiation immediately
- Non-blocking: Can develop in parallel with auth
- "Wow factor" for demos

### **Phase 6: AI Agent - Basic Recommendation Engine (POC Priority)** 🤖
**Goal:** Implement tag-based matching to recommend musicians to venues and vice versa

1. **Create RecommendationService**
   - Simple Jaccard similarity scoring on genre/vibe tags
   - Weighted algorithm:
     - 40% genre overlap
     - 30% vibe/ambience overlap
     - 20% location proximity
     - 10% other factors (capacity, budget alignment)

2. **API Endpoints:**
   - `GET /recommendations/venues?musicianId={id}` - Recommend venues for a musician
   - `GET /recommendations/musicians?venueId={id}` - Recommend musicians for a venue
   - Returns ranked list with match scores

3. **Example Logic:**
   ```
   Musician tags: [Jazz, Blues], [Sophisticated, Intimate]
   Venue tags: [Jazz, Soul], [Upscale, Intimate]
   Genre match: 1/3 overlap (Jazz) = 33%
   Vibe match: 1/2 overlap (Intimate) = 50%
   Score: (0.4 × 33%) + (0.3 × 50%) = 28.2%
   ```

**Why in POC:**
- Core product differentiator - "smart matching"
- Simple to implement (no ML required initially)
- Validates tag architecture works
- Essential for proving value over competitors

### **Phase 7: Profile Management & Search**
1. Complete MusicianController, VenueController, PromoterController
2. Profile viewing/editing with ownership checks
3. Search with filters (genre, location, etc.)

### **Phase 8: Basic Booking Interaction Flow**
1. Create BookingController
2. Musician → Venue inquiry
3. Status management (pending, accepted, declined)
4. Neo4j relationship creation (HIRES, BOOKS)

### **Phase 9: Simple Messaging (if time permits)**
1. MessageController with send/view endpoints
2. Thread-based conversations

**Note on Musician Auto-Tagging Agent:** Deferred to post-POC. Musicians will manually enter genres/vibes for POC. This feature will be added after POC validation.

---

## 🔑 Important Notes

### **Database Connection**
- Neo4j configured for `bolt://localhost:7687`
- Username: `neo4j`, Password: `changeme`
- **ACTION REQUIRED:** Need Neo4j instance running before testing

### **JWT Configuration**
- Default secret in application.properties (should use env variable in production)
- Token expiration: 24 hours (86400000 ms)

### **Security**
- Using BCrypt (proper password hashing, not SHA-256)
- CORS allows localhost:3000 and localhost:4200
- All endpoints except signup/login require JWT authentication


---

## 🎯 Business Domain (Reference)

### **Three Main Entities:**
1. **Musicians** (formerly "Band")
2. **Promoters**
3. **Venues** (NEW entity)

### **Core Relationships:**
- Musicians ↔ Musicians (COLLABORATES_WITH)
- Musicians → Venues (HIRED_BY)
- Musicians → Promoters (REPRESENTED_BY)
- Promoters ↔ Promoters (COLLABORATES_WITH)
- Promoters → Venues (REPRESENTS)
- Venues → Musicians (HIRES)
- Venues → Promoters (REPRESENTED_BY)

### **Future Features:**
- Tagging system (genre, ambience, location) for AI agent recommendations
- AI agent to source venues/promoters from NYC
- AI recommendation engine
- Social features (follows, favorites, reviews)
- Booking pipeline (interested, invited, booked)

### **🤖 AI Agent Strategy (Post-POC Implementation)**

**Overview:**
We will implement three AI agents to automate data population, enhance matching, and reduce manual effort. These agents leverage the tag-based architecture we're building in the POC.

**Agent 1: Sourcing Agent (NYC POC)**
- **Purpose:** Auto-populate database with venues and promoters from NYC
- **Data Sources:**
  - Google Maps API (venue names, addresses, basic info)
  - Yelp API (ratings, reviews, photos, price ranges, categories)
  - Instagram/Facebook scraping (social presence, aesthetic analysis)
  - Eventbrite/Bandsintown (event history, genres hosted)
  - Website scraping (contact info, booking details, artist rosters)
- **What It Extracts:**
  - Venue/Promoter name, location (city, state, neighborhood)
  - Capacity estimates (from reviews: "small intimate space", "holds 200+")
  - Genre preferences (from event listings and past bookings)
  - Ambience/vibe tags (NLP analysis: "intimate", "loud", "classy", "dive bar", "upscale")
  - Price range/budget (from menu prices or ticket prices)
  - Photos for galleries (interior, stage, crowd shots)
  - Social media handles and website URLs
  - Ratings and reputation metrics (Google rating, Yelp rating)
- **Output:** Pre-populated Venue/Promoter nodes with as many fields filled as possible
- **Human Verification:** Sourced profiles marked for venue/promoter to claim and verify

**Agent 2: Recommendation Engine**
- **Purpose:** Match musicians to venues/promoters and vice versa based on multi-dimensional similarity
- **Matching Algorithm:**
  ```
  Match Score = 
    (0.30 × Genre Overlap %) +          // 30% weight: Primary compatibility factor
    (0.20 × Vibe Overlap %) +           // 20% weight: Ambience/energy alignment
    (0.15 × Location Proximity) +       // 15% weight: Geographic feasibility
    (0.10 × Capacity Fit) +             // 10% weight: Venue size vs. artist draw
    (0.10 × Budget Alignment) +         // 10% weight: Fee expectations match
    (0.10 × Reputation Score) +         // 10% weight: Ratings and social proof
    (0.05 × Availability Overlap)       // 5% weight: Schedule compatibility
  ```
- **Use Cases:**
  - Venue searches for musicians: "Show me jazz musicians with sophisticated vibe in NYC"
  - Musician searches for venues: "Find intimate venues that book indie rock in Brooklyn"
  - Promoter searches for talent: "Recommend emerging electronic artists for 200-capacity venue"
  - Cross-recommendations: "Venues like Blue Note also hired these musicians..."
- **Tag-Based Matching Examples:**
  - Venue tags `[Jazz, Intimate, Upscale, Manhattan]` → Matches musicians with `[Jazz, Sophisticated, Professional, NYC]`
  - Musician tags `[Indie Rock, Energetic, Brooklyn]` → Matches venues with `[Rock, Dive bar, Underground, Williamsburg]`
  - Promoter tags `[Electronic, Festivals, Large-scale]` → Matches venues with `[Electronic, 500+ capacity, Outdoor]`
- **Output:** Ranked list of recommendations with match scores and reasoning

**Agent 3: Musician Onboarding/Auto-Tagging Agent**
- **Purpose:** Automatically populate musician profiles with data from their existing online presence
- **Trigger:** Runs when new musician signs up and provides social media links
- **Data Sources & Extraction:**
  - **Spotify API:**
    - Primary genre, secondary genres → auto-populate `genres` field
    - Monthly listeners → `followerCount` / validation metric
    - Similar artists → `influences` field
    - Top tracks → analyze for `vibes` (tempo, energy, mood)
  - **YouTube Analysis:**
    - Video titles/descriptions → determine `performanceType` (covers vs originals)
    - View counts → validation metric
    - Comments sentiment analysis → extract `vibes` tags ("energetic", "chill", "emotional")
  - **Instagram Scraping:**
    - Bio keywords → genre/vibe extraction ("jazz trio", "high-energy rock")
    - Hashtags → `targetAudience` ("#jazzlovers", "#nycmusic")
    - Photo aesthetics → visual branding analysis
  - **SoundCloud/Bandcamp:**
    - User-selected genre tags
    - Track descriptions → style extraction
    - Play counts → validation metric
- **What It Auto-Populates:**
  - `genres`, `subgenres` (from streaming platforms)
  - `vibes` (from sentiment analysis and audio features)
  - `influences` (from Spotify similar artists)
  - `monthlyListeners`, `followerCount` (social proof metrics)
  - `targetAudience` (from follower demographics and hashtags)
  - `notableVenues` (if mentioned in bio/posts)
- **Output:** Auto-tagged musician profile with 60-70% fields populated
- **Human Review:** Musician can edit/approve auto-generated tags

**Implementation Timeline:**
- **Phase 1 (POC):** Manual data entry, tag-based matching foundation established
- **Phase 2:** Agent 2 (Recommendation Engine) - implement scoring algorithm with existing manual data
- **Phase 3:** Agent 3 (Musician Onboarding) - auto-tag new signups from social media
- **Phase 4:** Agent 1 (Sourcing Agent) - scale database with NYC venues/promoters

**Why This Tag-Based Approach Works:**
- ✅ POC nodes include `genres` and `vibes` Lists - foundation for AI matching
- ✅ Manual tagging in POC validates taxonomy before AI automation
- ✅ Simple string matching enables Phase 2 recommendations without ML
- ✅ Future AI agents slot into existing architecture without refactoring
- ✅ Incremental: Human-curated → Algorithm-assisted → Fully automated

---

---

## 🏗️ Architecture Decisions

### **Controller Design Pattern: Hybrid Approach** ⭐

**Decision:** Use a combination of entity-specific controllers for CRUD and feature-based controllers for interactions.

---

### **🎯 The Logic Behind the Hybrid Model**

#### **The Problem We're Solving:**
We have **3 user types** (Musician, Promoter, Venue) that need to:
1. Manage their own profiles (entity-specific operations)
2. Interact with each other across entity boundaries (cross-entity operations)
3. Authenticate through a unified system

Traditional approaches fall short:
- **Separate controllers per entity** → Where does "Musician messages Venue" go?
- **Single unified controller** → Becomes a monolithic "god object"
- **Mixed approach** → Business logic scattered everywhere

#### **The Solution:**
Split controllers by **responsibility type** rather than entity type:

```
┌─────────────────────────────────────────────────────────────┐
│                   HYBRID CONTROLLER MODEL                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Layer 1: AUTH (Identity & Access)                   │  │
│  │  AuthController - /auth/*                            │  │
│  │  • Handles ALL authentication regardless of type     │  │
│  │  • Returns JWT with userType embedded                │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Layer 2: ENTITY CONTROLLERS (Profile Management)    │  │
│  │  MusicianController, PromoterController, VenueCtrl   │  │
│  │  • Focus ONLY on profile CRUD operations            │  │
│  │  • GET/PUT/DELETE own profile                       │  │
│  │  • Search/browse other profiles (read-only)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Layer 3: INTERACTION CONTROLLERS (Business Logic)   │  │
│  │  BookingCtrl, MessageCtrl, CollaborationCtrl, etc.   │  │
│  │  • Handle ALL cross-entity operations               │  │
│  │  • Work polymorphically with any user type          │  │
│  │  • Create relationships in Neo4j graph               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### **🔐 How Authentication Integrates with This Model**

#### **JWT Token as the Universal Identifier**

Every JWT token contains:
```json
{
  "sub": "user@example.com",           // email (username)
  "userId": "uuid-abc-123",             // unique ID
  "userType": "MUSICIAN",               // MUSICIAN | PROMOTER | VENUE
  "iat": 1729641600,                    // issued at
  "exp": 1729728000                     // expiration
}
```

This token is the **single source of truth** that flows through all three controller layers.

#### **Authentication Flow in Detail:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. SIGNUP (Type-Specific Endpoints)
   ─────────────────────────────────────────
   POST /auth/signup/musician
   Body: { name, email, password, genre, bio, ... }
   
   POST /auth/signup/promoter
   Body: { businessName, email, password, website, ... }
   
   POST /auth/signup/venue
   Body: { venueName, email, password, location, capacity, ... }
   
   Backend Process:
   ├─ Validate request DTO
   ├─ Check if email already exists (search all 3 repos)
   ├─ Hash password with BCrypt
   ├─ Save to appropriate Neo4j node type
   ├─ Generate JWT token with userType claim
   └─ Return JwtAuthenticationResponse
   
   Response:
   {
     "accessToken": "eyJhbGc...",
     "tokenType": "Bearer",
     "userId": "uuid-abc-123",
     "email": "user@example.com",
     "userType": "MUSICIAN",
     "name": "John Doe Band"
   }

2. LOGIN (Single Unified Endpoint)
   ────────────────────────────────────
   POST /auth/login
   Body: { email, password }
   
   Backend Process (CustomUserDetailsService):
   ├─ Search MusicianRepository.findByEmail(email)
   ├─ If not found → Search PromoterRepository.findByEmail(email)
   ├─ If not found → Search VenueRepository.findByEmail(email)
   ├─ If not found → throw UsernameNotFoundException
   ├─ Found! Compare hashed passwords (BCrypt.matches)
   ├─ Generate JWT with userId, email, userType
   └─ Return JwtAuthenticationResponse
   
   Why Single Endpoint?
   ✓ User doesn't need to remember "which type" they are
   ✓ Simpler frontend logic (one login form)
   ✓ Backend automatically determines user type
   ✓ Email is unique across ALL user types

3. PROTECTED ENDPOINT ACCESS
   ─────────────────────────────────────
   Any Request to Protected Endpoint:
   GET /musicians/123
   Headers: { Authorization: "Bearer eyJhbGc..." }
   
   JwtAuthenticationFilter Process:
   ├─ Extract token from Authorization header
   ├─ Validate token signature and expiration
   ├─ Extract email from token
   ├─ Load UserDetails via CustomUserDetailsService
   ├─ Create Authentication object
   ├─ Set SecurityContext
   └─ Continue to controller
   
   In Controller:
   @GetMapping("/musicians/{id}")
   public MusicianProfile getMusician(
       @AuthenticationPrincipal CustomUserDetails currentUser,
       @PathVariable String id
   ) {
       // currentUser contains:
       // - getId() → "uuid-abc-123"
       // - getUsername() → "user@example.com"
       // - getUserType() → "MUSICIAN"
       // - getAuthorities() → [ROLE_MUSICIAN]
   }
```

---

### **🎭 Controller Layer Details**

#### **1. AuthController (`/auth/*`)**

**Purpose:** Handle ALL authentication regardless of user type

**Endpoints:**
```java
@RestController
@RequestMapping("/auth")
public class AuthController {
    
    // Type-specific signup (different DTOs)
    @PostMapping("/signup/musician")
    public ResponseEntity<JwtAuthenticationResponse> signupMusician(
        @Valid @RequestBody MusicianSignupRequest request
    );
    
    @PostMapping("/signup/promoter")
    public ResponseEntity<JwtAuthenticationResponse> signupPromoter(
        @Valid @RequestBody PromoterSignupRequest request
    );
    
    @PostMapping("/signup/venue")
    public ResponseEntity<JwtAuthenticationResponse> signupVenue(
        @Valid @RequestBody VenueSignupRequest request
    );
    
    // Single unified login
    @PostMapping("/login")
    public ResponseEntity<JwtAuthenticationResponse> login(
        @Valid @RequestBody LoginRequest request
    ) {
        // AuthService searches all repos automatically
        // Returns JWT with correct userType claim
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<JwtAuthenticationResponse> refreshToken(
        @RequestHeader("Authorization") String token
    );
}
```

**Connection to Auth System:**
- Uses `AuthenticationManager` to authenticate credentials
- Calls `JwtTokenProvider.generateToken()` after successful auth
- Returns standardized `JwtAuthenticationResponse` for all types

---

#### **2. Entity Controllers (Profile Management)**

**Purpose:** Handle entity-specific profile operations ONLY

**MusicianController (`/musicians/*`):**
```java
@RestController
@RequestMapping("/musicians")
public class MusicianController {
    
    // Anyone can view profiles (public)
    @GetMapping("/{id}")
    public MusicianProfileResponse getMusician(@PathVariable String id);
    
    @GetMapping("/search")
    public List<MusicianProfileResponse> searchMusicians(
        @RequestParam(required = false) String genre,
        @RequestParam(required = false) String location
    );
    
    // Only the musician themselves can update
    @PutMapping("/{id}")
    @PreAuthorize("@securityService.isCurrentUser(#id)")
    public MusicianProfileResponse updateMusician(
        @PathVariable String id,
        @Valid @RequestBody UpdateMusicianRequest request,
        @AuthenticationPrincipal CustomUserDetails currentUser
    );
    
    // Only the musician themselves can delete
    @DeleteMapping("/{id}")
    @PreAuthorize("@securityService.isCurrentUser(#id)")
    public ApiResponse deleteMusician(@PathVariable String id);
    
    // View musician's bookings (filtered view)
    @GetMapping("/{id}/bookings")
    public List<BookingResponse> getMusicianBookings(@PathVariable String id);
}
```

**PromoterController (`/promoters/*`)** and **VenueController (`/venues/*`)** follow same pattern.

**Connection to Auth System:**
- `@AuthenticationPrincipal CustomUserDetails currentUser` injects authenticated user
- `@PreAuthorize` uses `userType` from JWT to check permissions
- SecurityService helper checks if `currentUser.getId() == pathVariable.id`

---

#### **3. Interaction Controllers (Cross-Entity Operations)**

**Purpose:** Handle operations between different user types polymorphically

**BookingController (`/bookings/*`):**
```java
@RestController
@RequestMapping("/bookings")
public class BookingController {
    
    // Create booking - works for ANY user type combination
    @PostMapping
    public BookingResponse createBooking(
        @AuthenticationPrincipal CustomUserDetails currentUser,
        @Valid @RequestBody CreateBookingRequest request
    ) {
        // currentUser provides:
        // - userId: who is creating the booking
        // - userType: MUSICIAN | PROMOTER | VENUE
        
        // request contains:
        // - targetUserId: who they want to book
        // - date, venue, details, etc.
        
        // Service layer logic:
        // 1. Fetch current user node from Neo4j
        // 2. Fetch target user node from Neo4j
        // 3. Determine relationship type based on userTypes:
        //    - VENUE + MUSICIAN → HIRES relationship
        //    - PROMOTER + MUSICIAN → BOOKS relationship
        //    - etc.
        // 4. Create appropriate relationship in graph
        // 5. Return BookingResponse
    }
    
    // Get incoming booking requests (for current user)
    @GetMapping("/incoming")
    public List<BookingResponse> getIncomingBookings(
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        // Finds all bookings WHERE target = currentUser
        // Works for any user type
    }
    
    // Get outgoing booking requests (from current user)
    @GetMapping("/outgoing")
    public List<BookingResponse> getOutgoingBookings(
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        // Finds all bookings WHERE creator = currentUser
        // Works for any user type
    }
    
    // Update booking status (accept/decline)
    @PutMapping("/{bookingId}/status")
    public BookingResponse updateBookingStatus(
        @PathVariable String bookingId,
        @RequestParam String status,
        @AuthenticationPrincipal CustomUserDetails currentUser
    );
}
```

**MessageController (`/messages/*`):**
```java
@RestController
@RequestMapping("/messages")
public class MessageController {
    
    // Send message to ANY other user
    @PostMapping
    public MessageResponse sendMessage(
        @AuthenticationPrincipal CustomUserDetails currentUser,
        @Valid @RequestBody SendMessageRequest request
    ) {
        // Works for ALL combinations:
        // - Musician → Musician (collaboration)
        // - Promoter → Musician (booking inquiry)
        // - Venue → Promoter (representation request)
        // - Musician → Venue (inquiry about playing)
        // etc.
    }
    
    // Get conversation thread with specific user
    @GetMapping("/thread/{otherUserId}")
    public ConversationResponse getConversation(
        @PathVariable String otherUserId,
        @AuthenticationPrincipal CustomUserDetails currentUser
    );
    
    // Get all conversations for current user
    @GetMapping
    public List<ConversationSummary> getAllConversations(
        @AuthenticationPrincipal CustomUserDetails currentUser
    );
}
```

**Connection to Auth System:**
- **Every method** receives `CustomUserDetails currentUser` via `@AuthenticationPrincipal`
- This is injected automatically by Spring Security from JWT token
- Provides context for WHO is performing the action
- Business logic uses `userType` to determine relationship types in Neo4j

---

### **🔄 Complete Request Flow Example**

```
Scenario: Venue wants to hire a Musician

1. VENUE LOGS IN
   ────────────────
   POST /auth/login
   { "email": "bluenote@venue.com", "password": "secret123" }
   
   → Backend searches all repositories
   → Finds in VenueRepository
   → Returns JWT with userType="VENUE"

2. VENUE CREATES BOOKING
   ───────────────────────
   POST /bookings
   Headers: { Authorization: "Bearer <VENUE_JWT>" }
   Body: {
     "targetUserId": "musician-uuid-456",
     "date": "2025-12-15",
     "fee": 1500,
     "details": "Friday night jazz set"
   }
   
   → JwtAuthenticationFilter validates token
   → Extracts: userId="venue-uuid-123", userType="VENUE"
   → Sets SecurityContext with CustomUserDetails
   
   → BookingController.createBooking() receives:
     - currentUser.getId() = "venue-uuid-123"
     - currentUser.getUserType() = "VENUE"
     - request.targetUserId = "musician-uuid-456"
   
   → BookingService.createBooking():
     1. Fetch Venue node (venue-uuid-123)
     2. Fetch Musician node (musician-uuid-456)
     3. Create HIRES relationship: (Venue)-[:HIRES]->(Musician)
     4. Set properties: date, fee, status="PENDING", etc.
     5. Save to Neo4j graph
   
   → Return BookingResponse to frontend

3. MUSICIAN VIEWS BOOKING
   ────────────────────────
   Musician logs in later:
   POST /auth/login
   { "email": "jazzcat@musician.com", "password": "secret456" }
   → Returns JWT with userType="MUSICIAN"
   
   GET /bookings/incoming
   Headers: { Authorization: "Bearer <MUSICIAN_JWT>" }
   
   → JwtAuthenticationFilter validates token
   → currentUser.getUserType() = "MUSICIAN"
   
   → BookingController.getIncomingBookings():
     - Queries Neo4j: MATCH (m:Musician)-[:HIRES]-(booking)
                      WHERE m.id = currentUser.id
     - Returns list of pending bookings
   
4. MUSICIAN ACCEPTS BOOKING
   ─────────────────────────
   PUT /bookings/booking-uuid-789/status?status=ACCEPTED
   Headers: { Authorization: "Bearer <MUSICIAN_JWT>" }
   
   → Updates relationship property: status="ACCEPTED"
   → Creates notification for Venue
   → Returns updated BookingResponse
```

---

### **🔒 Security Model: Tiered Authentication & Authorization**

#### **Three Security Levels:**

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY TIER MODEL                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🌐 TIER 1: PUBLIC (No JWT Required)                        │
│  ────────────────────────────────────────────────            │
│  Purpose: Discovery & Onboarding                             │
│                                                               │
│  Endpoints:                                                   │
│  • POST /auth/signup/*        - User registration            │
│  • POST /auth/login           - User login                   │
│  • GET /musicians/{id}        - View public profile          │
│  • GET /promoters/{id}        - View public profile          │
│  • GET /venues/{id}           - View public profile          │
│  • GET /musicians/search      - Search musicians             │
│  • GET /promoters/search      - Search promoters             │
│  • GET /venues/search         - Search venues                │
│  • GET /actuator/health       - Health check                 │
│                                                               │
│  Why Public?                                                  │
│  ✓ Users need to discover the platform before signing up    │
│  ✓ Venues/Promoters browse musicians before registering     │
│  ✓ SEO and social sharing of profiles                       │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🔐 TIER 2: AUTHENTICATED (JWT Required)                     │
│  ────────────────────────────────────────────────            │
│  Purpose: All Interactions & Personal Data Access            │
│                                                               │
│  Who: ANY logged-in user (Musician, Promoter, OR Venue)     │
│                                                               │
│  ALL Interaction Controllers:                                │
│  • POST   /bookings           - Create booking               │
│  • GET    /bookings/incoming  - View incoming bookings       │
│  • GET    /bookings/outgoing  - View outgoing bookings       │
│  • PUT    /bookings/{id}/status - Update booking status      │
│  • POST   /messages           - Send message                 │
│  • GET    /messages           - View conversations           │
│  • GET    /messages/thread/{userId} - View thread            │
│  • POST   /collaborations     - Request collaboration        │
│  • GET    /collaborations     - View collaborations          │
│  • POST   /reviews            - Create review                │
│  • GET    /reviews/for/{id}   - View reviews for user        │
│                                                               │
│  Personal Data Endpoints:                                    │
│  • GET    /musicians/me       - View own full profile        │
│  • GET    /bookings/me        - View own bookings            │
│  • GET    /messages/me        - View own messages            │
│                                                               │
│  Why JWT Required?                                            │
│  ✓ Must know WHO is performing the action                   │
│  ✓ Must track relationships in Neo4j (from user to user)    │
│  ✓ Must prevent spam and abuse                              │
│  ✓ Must protect personal/private data                       │
│                                                               │
│  How It Works:                                               │
│  1. User includes JWT in Authorization header               │
│  2. JwtAuthenticationFilter validates token                 │
│  3. Extracts userId, email, userType from token             │
│  4. Sets SecurityContext with CustomUserDetails             │
│  5. Controller receives @AuthenticationPrincipal            │
│  6. Business logic uses currentUser info                    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🛡️ TIER 3: AUTHORIZED (JWT + Ownership Check)              │
│  ────────────────────────────────────────────────            │
│  Purpose: Mutating YOUR OWN Profile                          │
│                                                               │
│  Who: The specific user who owns the resource                │
│                                                               │
│  Entity Controller Mutation Endpoints:                       │
│  • PUT    /musicians/{id}     - Update profile               │
│  • DELETE /musicians/{id}     - Delete account               │
│  • PUT    /promoters/{id}     - Update profile               │
│  • DELETE /promoters/{id}     - Delete account               │
│  • PUT    /venues/{id}        - Update profile               │
│  • DELETE /venues/{id}        - Delete account               │
│                                                               │
│  Security Check:                                             │
│  @PreAuthorize("@securityService.isCurrentUser(#id)")       │
│                                                               │
│  This validates:                                             │
│  ✓ JWT is valid (Tier 2 check)                             │
│  ✓ currentUser.getId() == pathVariable.id (Tier 3 check)   │
│                                                               │
│  Example Flow:                                               │
│  PUT /musicians/uuid-123                                     │
│  Headers: { Authorization: "Bearer <JWT>" }                 │
│                                                               │
│  1. JwtAuthenticationFilter extracts userId from JWT        │
│  2. currentUser.getId() = "uuid-abc-456"                    │
│  3. Path variable id = "uuid-123"                           │
│  4. SecurityService.isCurrentUser("uuid-123") checks:       │
│     - Does currentUser.getId() == "uuid-123"?              │
│     - NO → Return 403 FORBIDDEN                            │
│                                                               │
│  Only if userId matches, the update proceeds.               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### **Security Configuration in Code:**

**SecurityConfig.java:**
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            // ===== TIER 1: PUBLIC ENDPOINTS =====
            .requestMatchers(
                "/auth/signup/**",      // All signup endpoints
                "/auth/login",           // Login endpoint
                "/musicians/{id}",       // View musician profile
                "/promoters/{id}",       // View promoter profile
                "/venues/{id}",          // View venue profile
                "/musicians/search",     // Search musicians
                "/promoters/search",     // Search promoters
                "/venues/search",        // Search venues
                "/actuator/health"       // Health check
            ).permitAll()
            
            // ===== TIER 2 & 3: ALL OTHER ENDPOINTS REQUIRE JWT =====
            .anyRequest().authenticated()
        );

    // Add JWT filter to validate tokens
    http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
}
```

**Entity Controller with Tier 3 Authorization:**
```java
@RestController
@RequestMapping("/musicians")
public class MusicianController {
    
    // TIER 1: Public - Anyone can view
    @GetMapping("/{id}")
    public MusicianProfileResponse getMusician(@PathVariable String id) {
        return musicianService.getPublicProfile(id);
    }
    
    // TIER 1: Public - Anyone can search
    @GetMapping("/search")
    public List<MusicianProfileResponse> searchMusicians(
        @RequestParam(required = false) String genre,
        @RequestParam(required = false) String location
    ) {
        return musicianService.search(genre, location);
    }
    
    // TIER 2: Authenticated - View own full profile (including private data)
    @GetMapping("/me")
    public MusicianProfileResponse getMyProfile(
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return musicianService.getFullProfile(currentUser.getId());
    }
    
    // TIER 3: Authorized - Update own profile only
    @PutMapping("/{id}")
    @PreAuthorize("@securityService.isCurrentUser(#id)")
    public MusicianProfileResponse updateMusician(
        @PathVariable String id,
        @Valid @RequestBody UpdateMusicianRequest request,
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return musicianService.update(id, request);
    }
    
    // TIER 3: Authorized - Delete own account only
    @DeleteMapping("/{id}")
    @PreAuthorize("@securityService.isCurrentUser(#id)")
    public ApiResponse deleteMusician(
        @PathVariable String id,
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return musicianService.deleteAccount(id);
    }
    
    // TIER 2: Authenticated - View bookings (filtered by permission)
    @GetMapping("/{id}/bookings")
    public List<BookingResponse> getMusicianBookings(
        @PathVariable String id,
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        // Service layer checks if currentUser has permission to view
        // - If id == currentUser.id → show all bookings (public + private)
        // - If id != currentUser.id → show only public/completed bookings
        return musicianService.getBookings(id, currentUser);
    }
}
```

**Interaction Controller (Always Tier 2):**
```java
@RestController
@RequestMapping("/bookings")
public class BookingController {
    
    // TIER 2: All methods require JWT authentication
    // No public endpoints - you must be logged in to book or view bookings
    
    @PostMapping
    public BookingResponse createBooking(
        @AuthenticationPrincipal CustomUserDetails currentUser,
        @Valid @RequestBody CreateBookingRequest request
    ) {
        // currentUser is GUARANTEED to be present (JWT validated)
        return bookingService.createBooking(currentUser, request);
    }
    
    @GetMapping("/incoming")
    public List<BookingResponse> getIncomingBookings(
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        // Returns bookings WHERE target = currentUser
        return bookingService.getIncomingBookings(currentUser.getId());
    }
    
    @GetMapping("/outgoing")
    public List<BookingResponse> getOutgoingBookings(
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        // Returns bookings WHERE creator = currentUser
        return bookingService.getOutgoingBookings(currentUser.getId());
    }
}
```

**SecurityService Helper:**
```java
@Service
public class SecurityService {
    
    /**
     * Check if the current authenticated user is the owner of the resource
     */
    public boolean isCurrentUser(String resourceUserId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        
        CustomUserDetails currentUser = (CustomUserDetails) authentication.getPrincipal();
        return currentUser.getId().equals(resourceUserId);
    }
    
    /**
     * Check if current user has specific role
     */
    public boolean hasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        
        return authentication.getAuthorities().stream()
            .anyMatch(auth -> auth.getAuthority().equals("ROLE_" + role));
    }
}
```

---

#### **JWT Token Flow Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│          USER INTERACTS WITH PROTECTED ENDPOINT              │
└─────────────────────────────────────────────────────────────┘

Frontend:
┌─────────────────────────────────────────────────────┐
│  User Action: "Update my profile"                   │
│                                                       │
│  PUT /musicians/uuid-abc-123                         │
│  Headers: {                                          │
│    Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." │
│  }                                                   │
│  Body: { name: "New Name", genre: "Jazz" }          │
└─────────────────────────────────────────────────────┘
                        ↓
Backend Request Pipeline:
┌─────────────────────────────────────────────────────┐
│  1. JwtAuthenticationFilter                         │
│     ├─ Extract token from Authorization header     │
│     ├─ Validate token signature                    │
│     ├─ Check token expiration                      │
│     ├─ Extract claims (userId, email, userType)    │
│     ├─ Load user via CustomUserDetailsService      │
│     └─ Set SecurityContext with Authentication     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  2. Spring Security                                  │
│     ├─ Check if endpoint requires authentication   │
│     ├─ SecurityContext has valid Authentication?   │
│     │  YES → Continue to next check                │
│     │  NO  → Return 401 Unauthorized               │
│     └─ Evaluate @PreAuthorize annotation           │
│        "@securityService.isCurrentUser(#id)"       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  3. SecurityService.isCurrentUser("uuid-abc-123")   │
│     ├─ Get currentUser from SecurityContext        │
│     ├─ currentUser.getId() = "uuid-abc-123"        │
│     ├─ Path variable id = "uuid-abc-123"           │
│     ├─ Compare: "uuid-abc-123" == "uuid-abc-123"   │
│     │  YES → Authorization granted                 │
│     │  NO  → Return 403 Forbidden                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  4. MusicianController.updateMusician()             │
│     ├─ Receives @AuthenticationPrincipal           │
│     ├─ currentUser is injected automatically       │
│     ├─ Call musicianService.update(id, request)    │
│     └─ Return updated profile                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  5. Response to Frontend                            │
│     {                                                │
│       "id": "uuid-abc-123",                         │
│       "name": "New Name",                           │
│       "genre": "Jazz",                              │
│       ...                                           │
│     }                                               │
└─────────────────────────────────────────────────────┘
```

---

### **✅ Why This Architecture Works**

1. **Unified Authentication**
    - Single login endpoint for all user types
    - JWT token carries user identity and type
    - No confusion about "which login to use"

2. **Clear Separation of Concerns**
    - Auth logic isolated in AuthController
    - Profile management isolated in Entity Controllers
    - Business interactions isolated in Interaction Controllers

3. **Type-Safe Polymorphism**
    - JWT userType claim enables runtime type checking
    - Service layer creates appropriate Neo4j relationships
    - Frontend doesn't need to know graph structure

4. **Scalable & Maintainable**
    - Add new features → Add new Interaction Controller
    - Add new user type → Add new Entity Controller + signup endpoint
    - Business logic stays clean and testable

5. **Neo4j Graph Model Perfect Fit**
    - Nodes: Musician, Promoter, Venue (entity types)
    - Relationships: HIRES, BOOKS, COLLABORATES_WITH, MESSAGES, etc.
    - Interaction Controllers create edges between nodes
    - Graph naturally models real-world relationships

6. **Tiered Security Model**
    - **Tier 1 (Public)**: Discovery and onboarding without barriers
    - **Tier 2 (Authenticated)**: All interactions require knowing WHO
    - **Tier 3 (Authorized)**: Profile mutations require ownership
    - JwtAuthenticationFilter validates ALL protected requests
    - @PreAuthorize checks ownership at method level
    - SecurityService provides reusable authorization logic

---

---

## 🚀 Implementation Strategy (Incremental Build & Test Approach)

### **Phase-by-Phase Implementation Plan**

We will build incrementally, testing each phase thoroughly before moving to the next. This ensures each layer works correctly and integrates properly with JWT authentication.

---

### **📍 PHASE 1: Foundation - Neo4j Nodes & Repositories**

**Goal:** Create the data model and data access layer

#### **Step 1.1: Create Neo4j Node Entities** ✅ COMPLETE

**Decision: Lean POC Approach**
For the POC, we implemented minimal viable nodes with only core fields (13-14 fields each) to prove the concept works. The extensive 60-70 field designs are documented as a roadmap for future phases.

**✅ Implemented Lean POC Nodes:**

1. **Musician.java** (`com.mint.nodes`) - **13 Fields**
   ```java
   @Node("Musician")
   @Data
   @NoArgsConstructor
   @AllArgsConstructor
   public class Musician {
       // Core Identity (for auth)
       @Id @GeneratedValue(UUIDStringGenerator.class)
       private String id;
       private String name;
       private String email;                   // Unique, for login
       private String password;                // BCrypt hash
       
       // Basic Profile
       private String bio;
       private String location;
       private String profileImageUrl;
       
       // Music Identity (Tags for AI Matching)
       private List<String> genres;            // e.g., ["Jazz", "Blues", "Soul"]
       private List<String> vibes;             // e.g., ["Energetic", "Chill"]
       
       // Booking Basics
       private String minimumFee;              // e.g., "$500"
       private Boolean willingToTravel;
       
       // Social Proof
       private String websiteUrl;
       private String instagramHandle;
       
       // Metadata
       @CreatedDate
       private LocalDateTime createdAt;
       @LastModifiedDate
       private LocalDateTime updatedAt;
   }
   ```

2. **Venue.java** - **14 Fields**
   - Core Identity: id, venueName, email, password
   - Basic Profile: description, location, logoUrl
   - Venue Characteristics (AI Tags): capacity, genrePreferences (List), ambience (List)
   - Booking Basics: typicalBudget, liveMusic
   - Contact: websiteUrl, bookingEmail
   - Metadata: createdAt, updatedAt

3. **Promoter.java** - **13 Fields**
   - Core Identity: id, businessName, email, password
   - Basic Profile: bio, location, logoUrl
   - Expertise (AI Tags): genreSpecialties (List), eventTypes (List)
   - Business Basics: acceptingNewArtists, currentRosterSize
   - Contact: websiteUrl, phone
   - Metadata: createdAt, updatedAt

**Key Points:**
- All use unique email constraint (no @Indexed annotation needed in Spring Data Neo4j)
- Password field stores BCrypt hash (never plaintext)
- Lists (genres, vibes, ambience) enable multi-value tags for AI matching
- Timestamps track creation and updates
- Lean design is perfect for POC - proves auth, matching, and interactions work

**📋 Future Field Expansion (Post-POC):**

When the POC is validated, we'll expand nodes incrementally:

**Phase 1B: Extended Profile Fields**
- Additional social media links (YouTube, Spotify, SoundCloud, TikTok, Bandcamp, Apple Music)
- Performance details (setLengthMinutes, hasOwnEquipment, soundRequirements, stageSizeRequirement)
- Extended booking info (advanceBookingRequired, availableDays, contractRequired)
- Audience/demographic info (targetAudience, targetDemographic, typicalCrowdSize)

**Phase 1C: Media & Validation**
- Photo galleries (photoGalleryUrls, interiorPhotos, stagePhotos, crowdPhotos)
- Video content (videoUrls, promotionalVideos)
- Audio samples (audioSampleUrls)
- Validation metrics (monthlyListeners, followerCount, averageRating, totalReviews)
- Notable achievements (notableVenues, notablePerformers, notableClients, awards, pressFeatures)

**Phase 2: AI-Populated Fields**
- Auto-tagged genres and subgenres (from Spotify/streaming APIs)
- Auto-detected vibes (from sentiment analysis of reviews/social media)
- Scraped ratings (googleRating, yelpRating from AI sourcing agent)
- Social proof metrics (automatically updated from external APIs)
- Profile completeness score (calculated based on filled fields)
- Match scores (recommendation engine weights)

**Tag Taxonomy for Future Implementation:**
- 150+ genre tags with sub-genres (Jazz: Bebop, Smooth, Fusion, Latin, Swing, Free Jazz, Modal)
- 50+ vibe/ambience tags (Energetic, Chill, Romantic, Dark, Uplifting, Melancholic, Intimate, Party, Sophisticated, Raw)
- Location granularity (city, state, neighborhood for hyper-local matching)
- Business tiers (Economy, Mid-range, Premium, Luxury)
- Experience levels (Emerging, Developing, Professional, Established, Elite)
- Event scales (Small <50, Medium 50-200, Large 200-500, Festival 500+)

#### **Step 1.2: Create Neo4j Repositories**
Simple interfaces extending `Neo4jRepository`:

1. **MusicianRepository.java** (`com.mint.repositories`)
   ```java
   public interface MusicianRepository extends Neo4jRepository<Musician, String> {
       Optional<Musician> findByEmail(String email);
       boolean existsByEmail(String email);
   }
   ```

2. **PromoterRepository.java** (same structure)
3. **VenueRepository.java** (same structure)

**Validation:** Compile and ensure no errors. Repositories are ready but not yet used.

---

### **📍 PHASE 2: Authentication - Signup Flow (Build & Test)**

**Goal:** Implement signup for all three user types and test end-to-end

#### **Step 2.1: Create AuthService**
Build the service layer that handles signup logic:

**AuthService.java** (`com.mint.services`)
```java
@Service
public class AuthService {
    
    @Autowired
    private MusicianRepository musicianRepository;
    
    @Autowired
    private PromoterRepository promoterRepository;
    
    @Autowired
    private VenueRepository venueRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtTokenProvider tokenProvider;
    
    // Signup methods - one for each user type
    
    public JwtAuthenticationResponse signupMusician(MusicianSignupRequest request) {
        // 1. Check if email already exists (check ALL three repositories)
        if (emailExists(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }
        
        // 2. Create Musician entity
        Musician musician = new Musician();
        musician.setName(request.getName());
        musician.setEmail(request.getEmail());
        musician.setPassword(passwordEncoder.encode(request.getPassword())); // BCrypt hash
        musician.setGenre(request.getGenre());
        musician.setBio(request.getBio());
        musician.setLocation(request.getLocation());
        musician.setImageUrl(request.getImageUrl());
        
        // 3. Save to Neo4j
        musician = musicianRepository.save(musician);
        
        // 4. Generate JWT token
        String token = tokenProvider.generateTokenFromEmail(
            musician.getEmail(),
            musician.getId(),
            "MUSICIAN"
        );
        
        // 5. Return response
        return new JwtAuthenticationResponse(
            token,
            musician.getId(),
            musician.getEmail(),
            "MUSICIAN",
            musician.getName()
        );
    }
    
    public JwtAuthenticationResponse signupPromoter(PromoterSignupRequest request) {
        // Similar logic for Promoter
        // userType = "PROMOTER"
    }
    
    public JwtAuthenticationResponse signupVenue(VenueSignupRequest request) {
        // Similar logic for Venue
        // userType = "VENUE"
    }
    
    // Helper method
    private boolean emailExists(String email) {
        return musicianRepository.existsByEmail(email) ||
               promoterRepository.existsByEmail(email) ||
               venueRepository.existsByEmail(email);
    }
}
```

**Key Points:**
- Email uniqueness checked across ALL user types
- Password is BCrypt hashed before saving
- JWT token generated with correct userType claim
- Returns standardized JwtAuthenticationResponse

#### **Step 2.2: Create AuthController (Signup Endpoints Only)**
Create controller with ONLY signup endpoints first:

**AuthController.java** (`com.mint.controllers`)
```java
@RestController
@RequestMapping("/auth")
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    @PostMapping("/signup/musician")
    public ResponseEntity<JwtAuthenticationResponse> signupMusician(
        @Valid @RequestBody MusicianSignupRequest request
    ) {
        JwtAuthenticationResponse response = authService.signupMusician(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @PostMapping("/signup/promoter")
    public ResponseEntity<JwtAuthenticationResponse> signupPromoter(
        @Valid @RequestBody PromoterSignupRequest request
    ) {
        JwtAuthenticationResponse response = authService.signupPromoter(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @PostMapping("/signup/venue")
    public ResponseEntity<JwtAuthenticationResponse> signupVenue(
        @Valid @RequestBody VenueSignupRequest request
    ) {
        JwtAuthenticationResponse response = authService.signupVenue(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    // Login endpoints will be added in Phase 3
}
```

#### **Step 2.3: Update SecurityConfig**
Ensure signup endpoints are public:

```java
.requestMatchers(
    "/auth/signup/**",      // All signup endpoints are public
    "/actuator/health"
).permitAll()
.anyRequest().authenticated()
```

#### **Step 2.4: TEST SIGNUP WITH POSTMAN** ✅

**Test Case 1: Signup Musician**
```
POST http://localhost:8081/auth/signup/musician
Content-Type: application/json

{
  "name": "Jazz Trio",
  "email": "jazztrio@test.com",
  "password": "password123",
  "genre": "Jazz",
  "bio": "Professional jazz ensemble",
  "location": "New York, NY",
  "imageUrl": "https://example.com/image.jpg"
}

Expected Response (201 Created):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "userId": "uuid-generated-123",
  "email": "jazztrio@test.com",
  "userType": "MUSICIAN",
  "name": "Jazz Trio"
}
```

**Test Case 2: Signup Promoter**
```
POST http://localhost:8081/auth/signup/promoter
Content-Type: application/json

{
  "businessName": "NYC Events",
  "email": "nycevents@test.com",
  "password": "password123",
  "website": "https://nycevents.com",
  "bio": "Premier event promotion company",
  "location": "New York, NY"
}

Expected Response (201 Created):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "userId": "uuid-generated-456",
  "email": "nycevents@test.com",
  "userType": "PROMOTER",
  "name": "NYC Events"
}
```

**Test Case 3: Signup Venue**
```
POST http://localhost:8081/auth/signup/venue
Content-Type: application/json

{
  "venueName": "Blue Note Jazz Club",
  "email": "bluenote@test.com",
  "password": "password123",
  "location": "131 W 3rd St, New York, NY 10012",
  "description": "Legendary jazz venue since 1981",
  "capacity": 200,
  "website": "https://bluenotejazz.com",
  "imageUrl": "https://example.com/bluenote.jpg"
}

Expected Response (201 Created):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "userId": "uuid-generated-789",
  "email": "bluenote@test.com",
  "userType": "VENUE",
  "name": "Blue Note Jazz Club"
}
```

**Test Case 4: Duplicate Email (Should Fail)**
```
POST http://localhost:8081/auth/signup/musician
Content-Type: application/json

{
  "name": "Another Band",
  "email": "jazztrio@test.com",  // Already used
  "password": "password123",
  "genre": "Rock"
}

Expected Response (400 Bad Request):
{
  "timestamp": "2025-10-23T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Email already registered",
  "path": "/auth/signup/musician"
}
```

**Validation Checklist:**
- ✅ Each user type can signup successfully
- ✅ JWT token is generated and returned
- ✅ Token payload contains correct userId, email, userType
- ✅ Password is BCrypt hashed in Neo4j (verify in Neo4j browser)
- ✅ Duplicate email is rejected
- ✅ Validation errors return proper error responses
- ✅ Check Neo4j browser to see nodes created with proper labels and properties

---

### **📍 PHASE 3: Authentication - Login Flow (Build & Test)**

**Goal:** Implement single unified login endpoint and test end-to-end

#### **Step 3.1: Implement CustomUserDetailsService**
Now wire up the repositories to load users for authentication:

**CustomUserDetailsService.java** (update existing placeholder)
```java
@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private MusicianRepository musicianRepository;
    
    @Autowired
    private PromoterRepository promoterRepository;
    
    @Autowired
    private VenueRepository venueRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        
        // Try Musician first
        Optional<Musician> musician = musicianRepository.findByEmail(email);
        if (musician.isPresent()) {
            Musician m = musician.get();
            return new CustomUserDetails(m.getId(), m.getEmail(), m.getPassword(), "MUSICIAN");
        }
        
        // Try Promoter
        Optional<Promoter> promoter = promoterRepository.findByEmail(email);
        if (promoter.isPresent()) {
            Promoter p = promoter.get();
            return new CustomUserDetails(p.getId(), p.getEmail(), p.getPassword(), "PROMOTER");
        }
        
        // Try Venue
        Optional<Venue> venue = venueRepository.findByEmail(email);
        if (venue.isPresent()) {
            Venue v = venue.get();
            return new CustomUserDetails(v.getId(), v.getEmail(), v.getPassword(), "VENUE");
        }
        
        // Not found in any repository
        throw new UsernameNotFoundException("User not found with email: " + email);
    }
}
```

#### **Step 3.2: Add Login Method to AuthService**
```java
@Service
public class AuthService {
    
    // ...existing signup methods...
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    public JwtAuthenticationResponse login(LoginRequest request) {
        // 1. Authenticate credentials
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()
            )
        );
        
        // 2. Set authentication in context
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        // 3. Get user details from authentication
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        
        // 4. Generate JWT token
        String token = tokenProvider.generateToken(authentication);
        
        // 5. Get display name based on user type
        String displayName = getDisplayName(userDetails.getId(), userDetails.getUserType());
        
        // 6. Return response
        return new JwtAuthenticationResponse(
            token,
            userDetails.getId(),
            userDetails.getUsername(),
            userDetails.getUserType(),
            displayName
        );
    }
    
    private String getDisplayName(String userId, String userType) {
        switch (userType) {
            case "MUSICIAN":
                return musicianRepository.findById(userId)
                    .map(Musician::getName).orElse("Unknown");
            case "PROMOTER":
                return promoterRepository.findById(userId)
                    .map(Promoter::getBusinessName).orElse("Unknown");
            case "VENUE":
                return venueRepository.findById(userId)
                    .map(Venue::getVenueName).orElse("Unknown");
            default:
                return "Unknown";
        }
    }
}
```

#### **Step 3.3: Add Login Endpoint to AuthController**
```java
@RestController
@RequestMapping("/auth")
public class AuthController {
    
    // ...existing signup endpoints...
    
    @PostMapping("/login")
    public ResponseEntity<JwtAuthenticationResponse> login(
        @Valid @RequestBody LoginRequest request
    ) {
        JwtAuthenticationResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
```

#### **Step 3.4: TEST LOGIN WITH POSTMAN** ✅

**Test Case 1: Login as Musician**
```
POST http://localhost:8081/auth/login
Content-Type: application/json

{
  "email": "jazztrio@test.com",
  "password": "password123"
}

Expected Response (200 OK):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "userId": "uuid-generated-123",
  "email": "jazztrio@test.com",
  "userType": "MUSICIAN",
  "name": "Jazz Trio"
}
```

**Test Case 2: Login as Promoter**
```
POST http://localhost:8081/auth/login
Content-Type: application/json

{
  "email": "nycevents@test.com",
  "password": "password123"
}

Expected Response (200 OK):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "userId": "uuid-generated-456",
  "email": "nycevents@test.com",
  "userType": "PROMOTER",
  "name": "NYC Events"
}
```

**Test Case 3: Login as Venue**
```
POST http://localhost:8081/auth/login
Content-Type: application/json

{
  "email": "bluenote@test.com",
  "password": "password123"
}

Expected Response (200 OK):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "userId": "uuid-generated-789",
  "email": "bluenote@test.com",
  "userType": "VENUE",
  "name": "Blue Note Jazz Club"
}
```

**Test Case 4: Invalid Credentials**
```
POST http://localhost:8081/auth/login
Content-Type: application/json

{
  "email": "jazztrio@test.com",
  "password": "wrongpassword"
}

Expected Response (401 Unauthorized):
{
  "timestamp": "2025-10-23T10:35:00",
  "status": 401,
  "error": "Authentication Failed",
  "message": "Invalid email or password",
  "path": "/auth/login"
}
```

**Test Case 5: User Not Found**
```
POST http://localhost:8081/auth/login
Content-Type: application/json

{
  "email": "notexist@test.com",
  "password": "password123"
}

Expected Response (404 Not Found):
{
  "timestamp": "2025-10-23T10:36:00",
  "status": 404,
  "error": "User Not Found",
  "message": "User not found with email: notexist@test.com",
  "path": "/auth/login"
}
```

**Validation Checklist:**
- ✅ Login works for all three user types
- ✅ JWT token is generated with correct claims
- ✅ Wrong password returns 401
- ✅ Non-existent email returns 404
- ✅ Token can be decoded (use jwt.io) to verify payload
- ✅ UserType in token matches the user's actual type

---

### **📍 PHASE 4: JWT Token Validation (Test Protected Endpoints)**

**Goal:** Verify JWT authentication works for protected endpoints

#### **Step 4.1: Create Simple Test Endpoint**
Create a basic entity controller to test JWT protection:

**MusicianController.java** (minimal version for testing)
```java
@RestController
@RequestMapping("/musicians")
public class MusicianController {
    
    @Autowired
    private MusicianRepository musicianRepository;
    
    // PUBLIC: Anyone can view
    @GetMapping("/{id}")
    public ResponseEntity<Musician> getMusician(@PathVariable String id) {
        return musicianRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    // PROTECTED: Must be authenticated
    @GetMapping("/me")
    public ResponseEntity<Musician> getMyProfile(
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return musicianRepository.findById(currentUser.getId())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
```

#### **Step 4.2: Update SecurityConfig**
```java
.requestMatchers(
    "/auth/signup/**",
    "/auth/login",
    "/musicians/{id}",      // Public profile view
    "/promoters/{id}",
    "/venues/{id}",
    "/actuator/health"
).permitAll()
.anyRequest().authenticated()
```

#### **Step 4.3: TEST WITH POSTMAN** ✅

**Test Case 1: Public Endpoint (No JWT)**
```
GET http://localhost:8081/musicians/uuid-generated-123

Expected Response (200 OK):
{
  "id": "uuid-generated-123",
  "name": "Jazz Trio",
  "email": "jazztrio@test.com",
  "genre": "Jazz",
  "bio": "Professional jazz ensemble",
  "location": "New York, NY",
  ...
}
```

**Test Case 2: Protected Endpoint WITHOUT JWT (Should Fail)**
```
GET http://localhost:8081/MVPConnect/musicians/me

Expected Response (401 Unauthorized):
{
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource"
}
```

**Test Case 3: Protected Endpoint WITH Valid JWT**
```
GET http://localhost:8081/MVPConnect/musicians/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Expected Response (200 OK):
{
  "id": "uuid-generated-123",
  "name": "Jazz Trio",
  "email": "jazztrio@test.com",
  "genre": "Jazz",
  ...
}
```

**Test Case 4: Protected Endpoint WITH Expired/Invalid JWT**
```
GET http://localhost:8081/musicians/me
Authorization: Bearer invalid.token.here

Expected Response (401 Unauthorized):
{
  "error": "Unauthorized",
  "message": "Invalid JWT token"
}
```

**Validation Checklist:**
- ✅ Public endpoints work without JWT
- ✅ Protected endpoints require JWT
- ✅ Valid JWT allows access
- ✅ Invalid JWT returns 401
- ✅ CurrentUser is correctly injected via @AuthenticationPrincipal
- ✅ JWT claims (userId, userType) are accessible in controller

---

### **📍 PHASE 5: AI Agent - Venue Sourcing (POC Priority)** 🤖

**Goal:** Auto-populate database with 50-100 NYC venues to provide real data for testing and demonstrate AI capability

**Why in POC:** 
- Provides real venues for musicians to discover and match with
- Demonstrates immediate AI differentiation ("We bootstrapped 100 venues in days, not months")
- Can be developed in parallel with other features (non-blocking)
- Essential "wow factor" for demos and investor presentations

Only proceed to this phase after Phases 1-4 are fully tested and working!

#### **Step 5.1: Create VenueSourcingService**

**Data Sources:**
- Google Maps API (venue discovery, location, basic info)
- Yelp API (ratings, reviews, photos, categories, price range)
- Basic web scraping (contact info if needed)

**What to Extract:**
- venueName, location (address, city, neighborhood)
- Capacity estimates (from reviews: "small intimate space", "holds 200+")
- genrePreferences (from event listings, Yelp categories)
- ambience tags (NLP analysis of reviews: "intimate", "energetic", "upscale", "dive bar")
- typicalBudget (from Yelp price indicators: $, $$, $$$)
- logoUrl, websiteUrl
- Contact info (bookingEmail if available)

**Implementation Approach:**
```java
@Service
public class VenueSourcingService {
    
    // Query Google Maps for NYC venues
    public List<VenueData> discoverVenues(String city, String category);
    
    // Enrich with Yelp data
    public VenueData enrichWithYelp(VenueData venue);
    
    // NLP: Extract tags from reviews
    public List<String> extractGenreTags(List<String> reviews);
    public List<String> extractAmbienceTags(List<String> reviews);
    
    // Map to Venue node and save
    public Venue saveSourcedVenue(VenueData data);
}
```

**Testing Strategy:**
- Start with 10-20 venues manually to validate mapping
- Run full scrape for 50-100 venues once logic is proven
- Mark sourced venues with flag for human verification
- Venues can later "claim" their profile to edit/verify

---

### **📍 PHASE 6: AI Agent - Basic Recommendation Engine (POC Priority)** 🤖

**Goal:** Implement tag-based matching to recommend musicians to venues and vice versa

**Why in POC:**
- Core product differentiator - proves "smart matching" works
- Simple to implement (Jaccard similarity, no ML required)
- Validates that our tag architecture (genres, vibes) is effective
- Essential for demonstrating value over competitors

#### **Step 6.1: Create RecommendationService**

**Matching Algorithm (Simple Tag-Based):**
```java
@Service
public class RecommendationService {
    
    public List<RecommendationDTO> recommendVenuesForMusician(String musicianId) {
        Musician musician = musicianRepository.findById(musicianId);
        List<Venue> allVenues = venueRepository.findAll();
        
        return allVenues.stream()
            .map(venue -> {
                double score = calculateMatchScore(musician, venue);
                return new RecommendationDTO(venue, score);
            })
            .filter(rec -> rec.getScore() > 0.2) // 20% threshold
            .sorted(Comparator.comparing(RecommendationDTO::getScore).reversed())
            .limit(10)
            .collect(Collectors.toList());
    }
    
    private double calculateMatchScore(Musician musician, Venue venue) {
        // Genre overlap (40% weight)
        double genreScore = calculateJaccardSimilarity(
            musician.getGenres(), 
            venue.getGenrePreferences()
        );
        
        // Vibe/Ambience overlap (30% weight)
        double vibeScore = calculateJaccardSimilarity(
            musician.getVibes(), 
            venue.getAmbience()
        );
        
        // Location proximity (20% weight) - simplified for POC
        double locationScore = sameCity(musician.getLocation(), venue.getLocation()) ? 1.0 : 0.5;
        
        // Budget alignment (10% weight) - simplified for POC
        double budgetScore = 0.5; // Placeholder
        
        return (0.4 * genreScore) + (0.3 * vibeScore) + (0.2 * locationScore) + (0.1 * budgetScore);
    }
    
    private double calculateJaccardSimilarity(List<String> set1, List<String> set2) {
        if (set1 == null || set2 == null || set1.isEmpty() || set2.isEmpty()) {
            return 0.0;
        }
        Set<String> intersection = new HashSet<>(set1);
        intersection.retainAll(set2);
        Set<String> union = new HashSet<>(set1);
        union.addAll(set2);
        return (double) intersection.size() / union.size();
    }
}
```

#### **Step 6.2: Create RecommendationController**

**API Endpoints:**
```java
@RestController
@RequestMapping("/recommendations")
public class RecommendationController {
    
    @GetMapping("/venues")
    public List<RecommendationDTO> getVenueRecommendations(
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        // Recommend venues for the logged-in musician
        return recommendationService.recommendVenuesForMusician(currentUser.getId());
    }
    
    @GetMapping("/musicians")
    public List<RecommendationDTO> getMusicianRecommendations(
        @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        // Recommend musicians for the logged-in venue
        return recommendationService.recommendMusiciansForVenue(currentUser.getId());
    }
}
```

#### **Step 6.3: TEST WITH POSTMAN** ✅

**Test Case: Get Venue Recommendations for Musician**
```
GET http://localhost:8081/recommendations/venues
Authorization: Bearer <MUSICIAN_JWT>

Expected Response (200 OK):
[
  {
    "venue": {
      "id": "venue-123",
      "venueName": "Blue Note Jazz Club",
      "genrePreferences": ["Jazz", "Blues"],
      "ambience": ["Intimate", "Upscale"]
    },
    "matchScore": 0.75,
    "matchReasons": [
      "Genre match: Jazz (100%)",
      "Vibe match: Intimate (50%)",
      "Same city: New York"
    ]
  },
  {
    "venue": {
      "id": "venue-456",
      "venueName": "Village Vanguard",
      "genrePreferences": ["Jazz", "Classical"],
      "ambience": ["Sophisticated", "Historic"]
    },
    "matchScore": 0.58,
    "matchReasons": [
      "Genre match: Jazz (50%)",
      "Same city: New York"
    ]
  }
]
```

**Validation:**
- ✅ Recommendations are ranked by match score
- ✅ Score calculation makes sense (genre overlap weighted highest)
- ✅ Only logged-in users can get recommendations
- ✅ Results are filtered by minimum threshold (20%)

---

### **📍 PHASE 7: Profile Management & Search**

**Goal:** Complete CRUD operations and search functionality

#### **Features to Build:**

1. **Profile Viewing & Editing**
   - Complete MusicianController, PromoterController, VenueController
   - GET endpoints for public profile viewing
   - PUT endpoints with ownership checks (@PreAuthorize)
   - DELETE endpoints with ownership checks

2. **Search Functionality**
   - Search musicians by genre, location, vibes
   - Search venues by genre, location, capacity
   - Search promoters by genre specialties, location
   - Filter results by tags

**Note:** We'll design these in detail once authentication and AI features are solid.

---

### **📍 PHASE 8: Basic Booking Interaction Flow**

**Goal:** Enable musicians and venues to connect and book performances

#### **Features to Build:**

1. **BookingController**
   - Create booking request (musician → venue or venue → musician)
   - View incoming/outgoing booking requests
   - Update booking status (accept, decline)
   - Neo4j relationship creation (HIRES, BOOKS relationships)

2. **Status Management**
   - PENDING: Initial request sent
   - ACCEPTED: Recipient agreed
   - DECLINED: Recipient rejected
   - CANCELLED: Sender withdrew

**Note:** We'll design these in detail once profiles and recommendations are working.

---

### **📍 PHASE 9: Simple Messaging (Optional - If Time Permits)**

**Goal:** Basic messaging between users

1. **MessageController**
   - Send message endpoint
   - View conversation thread
   - List all conversations

**Note:** This is optional for POC. Booking flow is higher priority.

---

### **🎯 Success Criteria Before Moving to Later Phases**

✅ **Phase 2 Complete:**
- All three signup endpoints work
- JWT tokens are generated correctly
- Passwords are BCrypt hashed
- Duplicate emails are rejected
- Neo4j nodes are created properly

✅ **Phase 3 Complete:**
- Single login endpoint works for all user types
- CustomUserDetailsService searches all repositories
- JWT tokens are generated on login
- Invalid credentials return proper errors

✅ **Phase 4 Complete:**
- Public endpoints work without JWT
- Protected endpoints require valid JWT
- JWT filter validates tokens correctly
- CurrentUser is injected properly
- Token claims are accessible

**Only when ALL of the above are validated with Postman, we proceed to Phase 5.**

---

## 🚀 When We Resume

**CURRENT STATUS: Authentication Complete - Ready for Testing**

**✅ COMPLETED TODAY (Oct 23, 2025):**
1. ✅ Created Neo4j Node Entities (Musician, Promoter, Venue) - 13-14 lean POC fields
2. ✅ Created Neo4j Repositories (3 interfaces with findByEmail/existsByEmail)
3. ✅ Created AuthService (signup/login logic for all user types)
4. ✅ Created AuthController (REST endpoints: /auth/signup/*, /auth/login)
5. ✅ Implemented CustomUserDetailsService (searches all 3 repos)
6. ✅ Configured SecurityConfig (public auth endpoints, JWT filter)

**📋 NEXT SESSION - START HERE:**

1. **Test Authentication Flow** (Immediate Priority)
   - Start Neo4j database
   - Start Spring Boot application
   - Run all Postman tests (see detailed test cases in "Next Steps" section above)
   - Verify signup, login, JWT generation, duplicate email handling

2. **Build VenueSourcingService** (Phase 5 - AI Agent) 🤖
   - Integrate Google Maps API + Yelp API
   - Scrape 50-100 NYC venues
   - Extract tags via NLP analysis

3. **Build RecommendationService** (Phase 6 - AI Agent) 🤖
   - Implement Jaccard similarity scoring
   - Create recommendation endpoints
   - Test tag-based matching

4. **Profile Management** (Phase 7)
   - CRUD endpoints for all user types
   - Search/filter functionality

5. **Booking Flow** (Phase 8)
   - BookingController with Neo4j relationships

**POC Timeline (3-4 weeks):**
- **Week 1:** ✅ Auth complete + Test + Start venue sourcing
- **Week 2:** Venue sourcing agent + Recommendation engine
- **Week 3:** Profile management + Booking flow
- **Week 4:** Testing, refinement, demo prep

**AI Agents in POC:**
- ✅ **Sourcing Agent** - Auto-populate 50-100 NYC venues
- ✅ **Recommendation Engine** - Tag-based smart matching
- ❌ **Musician Auto-Tagging** - Deferred to post-POC

**No blockers** - Authentication infrastructure is complete and ready to test!

---

*Last Updated: October 23, 2025*

