# UI Design Document - MVPConnect
## Music Industry Platform for Musicians, Venues & Promoters

**Version:** 1.0  
**Date:** October 26, 2025  
**Platform:** React Native (iOS, Android, Web via React Native Web)  
**Design Philosophy:** Mobile-First, Dark Mode Default

---

## Table of Contents
1. [Design Philosophy & Core Principles](#design-philosophy--core-principles)
2. [Color Palette & Typography](#color-palette--typography)
3. [Public Landing Page (Not Logged In)](#public-landing-page-not-logged-in)
4. [Onboarding Flows](#onboarding-flows)
5. [Musician Home Page](#musician-home-page)
6. [Venue Home Page](#venue-home-page)
7. [Promoter Home Page](#promoter-home-page)
8. [Common Navigation Elements](#common-navigation-elements)
9. [Component Architecture](#component-architecture)
10. [Responsive Design Strategy](#responsive-design-strategy)
11. [Accessibility Considerations](#accessibility-considerations)

---

## Design Philosophy & Core Principles

### Mobile-First Approach
- Primary development target: React Native (iOS/Android)
- Secondary target: Web (via React Native Web, ~80-90% code reuse)
- Users are often on-the-go, checking messages, responding to inquiries
- Push notifications for time-sensitive bookings
- Native camera integration for instant media uploads
- Seamless geolocation for finding nearby venues

### Dark Mode Aesthetic
- Reflects music industry culture and vibe
- Reduces eye strain for users in low-light environments (venues, late-night booking)
- Modern, sophisticated appearance
- Default dark theme with optional light mode toggle

### AI-Driven Discovery
- Subtle match scoring (no explicit percentages)
- Visual indicators: star ratings, colored badges
- Contextual explanations on hover/tap
- Smart recommendations based on multi-dimensional tagging

### User Experience Priorities
1. **Speed**: Quick access to key actions (send inquiry, view recommendations)
2. **Clarity**: Clear separation between search and recommendations
3. **Trust**: Social proof, testimonials, success metrics
4. **Efficiency**: Minimal taps/clicks to complete core actions

---

## Color Palette & Typography

### Color System (Dark Mode Default)

#### Background Colors
- **Primary Background:** `#1a1a1a` (Main screen background)
- **Secondary Background:** `#262626` (Cards, panels, elevated surfaces)
- **Tertiary Background:** `#333333` (Hover states, subtle differentiation)

#### Text Colors
- **Primary Text:** `#e5e5e5` (Main content, headings)
- **Secondary Text:** `#a3a3a3` (Supporting info, timestamps)
- **Disabled Text:** `#666666` (Inactive states)

#### Accent Colors
- **Primary Accent:** `#0ea5e9` (Electric Blue - CTAs, links, active states)
- **Secondary Accent:** `#8b5cf6` (Purple - Alternative CTAs, highlights)
- **Success:** `#10b981` (Green - Confirmations, positive status)
- **Warning:** `#f59e0b` (Amber - Pending states, cautions)
- **Error:** `#ef4444` (Red - Errors, declined inquiries)
- **Info:** `#3b82f6` (Blue - Information, notifications)

#### Borders & Dividers
- **Border Color:** `#404040` (Subtle separation)
- **Strong Border:** `#525252` (Emphasis, focus states)

### Typography

#### Font Family
- **Primary:** Inter, SF Pro (iOS native), Roboto (Android native)
- **Fallback:** system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"

#### Font Sizes (React Native scale)
- **Heading 1:** 32px (Bold) - Page titles
- **Heading 2:** 24px (Bold) - Section headings
- **Heading 3:** 20px (Semibold) - Card titles, subsections
- **Body Large:** 16px (Regular) - Main content, descriptions
- **Body Regular:** 14px (Regular) - Standard text
- **Body Small:** 12px (Regular) - Supporting text, metadata
- **Caption:** 10px (Regular) - Timestamps, subtle labels

#### Line Heights
- Headings: 1.2x
- Body text: 1.5x
- Tight (cards, labels): 1.3x

---

## Public Landing Page (Not Logged In)

### Design Goal
Marketing-focused page that clearly communicates value propositions for each user type without requiring login. Uses geolocation to create personalized, local relevance.

### Wireframe Description

#### Hero Section
```
┌─────────────────────────────────────────────────┐
│  [Logo] MVPConnect          [Login] [Sign Up]  │
├─────────────────────────────────────────────────┤
│                                                 │
│         Discover Live Music in [New York]       │
│                                                 │
│     Connect. Collaborate. Create Moments.       │
│                                                 │
│  [Sign Up as Musician] [Sign Up as Venue]      │
│        [Sign Up as Promoter]                    │
│                                                 │
│         📍 Using your location: NYC             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Navigation Bar** (Sticky)
  - Logo (left, 40px height)
  - Login button (text button, right)
  - Sign Up button (primary accent color, right)
  
- **Hero Content** (Centered, full viewport height)
  - Dynamic headline with detected city name
  - Geolocation API integration (Google Geolocation)
  - Fallback: "Discover Live Music Everywhere" if location denied
  - Three prominent CTA buttons (stacked on mobile, inline on desktop)
  - Each button: 280px width × 50px height on mobile
  - Location indicator at bottom (subtle, small text)

**Visual Style:**
- Background: Subtle gradient from `#1a1a1a` to `#0d1117`
- Hero text: White (`#ffffff`), 40px bold on mobile, 56px on desktop
- Subheading: `#a3a3a3`, 18px regular
- CTA buttons: Primary accent blue with white text, rounded corners (8px)
- Micro-interaction: Buttons scale 1.05x on press

---

#### Value Propositions Section
```
┌────────────────────────────────────────────────┐
│                                                │
│            Why Choose MVPConnect?              │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   🎸     │  │   🎤      │  │   🎭     │    │
│  │          │  │           │  │          │    │
│  │ For      │  │ For       │  │ For      │    │
│  │ Musicians│  │ Venues    │  │ Promoters│    │
│  │          │  │           │  │          │    │
│  │ Get      │  │ Find      │  │ Connect  │    │
│  │ Booked   │  │ Perfect   │  │ Artists  │    │
│  │ More     │  │ Performers│  │ & Venues │    │
│  │          │  │           │  │          │    │
│  │ • AI-... │  │ • Smart...│  │ • Manage │    │
│  │ • Profile│  │ • Easy... │  │ • Grow   │    │
│  │ • Direct │  │ • Calendar│  │ • Track  │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Section Heading** (Centered)
  - 32px bold, white text
  - 60px margin top/bottom
  
- **Three Columns** (Flexbox on desktop, stacked on mobile)
  - Each card: `#262626` background, 8px border radius
  - Icon at top: 64px emoji or SVG icon
  - User type heading: 24px semibold
  - Tagline: 18px regular, `#a3a3a3`
  - Feature bullets: 14px, left-aligned, `#e5e5e5`
  - Padding: 32px on desktop, 24px on mobile
  - Gap between cards: 24px

**Features Per User Type:**

**Musicians:**
- AI-powered venue matching
- Profile showcasing (media, links, bio)
- Direct booking inquiries
- Collaboration discovery
- Availability management

**Venues:**
- Smart musician recommendations
- Easy booking management
- Calendar integration
- Genre/vibe filtering
- Promoter connections

**Promoters:**
- Manage artist rosters
- Grow venue networks
- Track successful bookings
- Match opportunities
- Commission management

---

#### Dynamic Local Content Section
```
┌────────────────────────────────────────────────┐
│                                                │
│           What's Hot in [New York]             │
│                                                │
│  < ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ >      │
│    │Venue │ │Venue │ │Venue │ │Venue │        │
│    │Image │ │Image │ │Image │ │Image │        │
│    │      │ │      │ │      │ │      │        │
│    │Name  │ │Name  │ │Name  │ │Name  │        │
│    │Loc   │ │Loc   │ │Loc   │ │Loc   │        │
│    └──────┘ └──────┘ └──────┘ └──────┘        │
│                                                │
│              [Explore More Venues]             │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Carousel Container**
  - Horizontal scrolling (swipeable on mobile)
  - Shows 5-10 venues based on user's detected location
  - Arrow navigation on desktop
  - Dot indicators below carousel
  
- **Venue Cards** (within carousel)
  - 200px × 280px on mobile, 240px × 320px on desktop
  - Venue image: 200px/240px × 160px (cover, rounded top corners)
  - Venue name: 16px semibold, truncate if too long
  - Location: 12px regular, `#a3a3a3`, with pin icon
  - Background: `#262626`
  - Hover: Scale 1.02x, subtle shadow
  
- **CTA Button** (Below carousel)
  - Secondary button style (outline, accent color)
  - Links to public venue directory (or sign-up if not implemented)

---

#### Social Proof Section
```
┌────────────────────────────────────────────────┐
│                                                │
│         Join Thousands of Music Makers         │
│                                                │
│    🎸 500+ Musicians  🎤 200+ Venues           │
│          🎭 50+ Promoters                      │
│                                                │
│  ┌──────────────────────────────────────┐     │
│  │ "This platform helped me book..."    │     │
│  │         - Jane Doe, Indie Artist     │     │
│  └──────────────────────────────────────┘     │
│                                                │
│  ┌──────────────────────────────────────┐     │
│  │ "Finding the right musicians..."     │     │
│  │         - John Smith, Venue Owner    │     │
│  └──────────────────────────────────────┘     │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Stats Row** (Centered, icons + numbers)
  - Large numbers: 32px bold, white
  - Labels: 14px regular, `#a3a3a3`
  - Icons: 24px, accent color
  - Horizontally spaced (Flexbox with gap)
  
- **Testimonial Cards**
  - Background: `#262626`, 16px padding
  - Border-left: 4px solid accent blue
  - Quote text: 14px italic, `#e5e5e5`
  - Attribution: 12px regular, `#a3a3a3`, right-aligned
  - Stacked vertically, 16px gap
  - Max 2-3 testimonials visible (rotate dynamically later)

---

#### Footer Section
```
┌────────────────────────────────────────────────┐
│                                                │
│  [Logo] MVPConnect                             │
│                                                │
│  About  |  How It Works  |  Pricing           │
│  Contact  |  Terms  |  Privacy                │
│                                                │
│  © 2025 MVPConnect. All rights reserved.      │
│                                                │
│  [Facebook] [Twitter] [Instagram]              │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- Simple, minimalist footer
- Links: 14px, `#a3a3a3`, hover to accent blue
- Social icons: 24px, grayscale, hover to color
- Copyright: 12px, `#666666`

---

### Mobile vs Desktop Layout

**Mobile (< 768px):**
- Single column layout
- Hero CTAs stacked vertically
- Value prop cards stacked
- Carousel fills width, swipeable
- Footer links stacked

**Desktop (≥ 768px):**
- Hero CTAs inline (3 columns)
- Value prop cards in 3-column grid
- Carousel shows 4 cards at once with arrows
- Footer links inline

---

### Geolocation Implementation Notes

**Google Geolocation API:**
1. Request user's location on page load (with permission prompt)
2. If granted: Fetch city name from coordinates
3. If denied: Show default "Discover Live Music Everywhere"
4. Store location in localStorage for subsequent visits
5. Display "Using your location: [City]" badge near hero

**Fallback Strategy:**
- If geolocation fails, use IP-based location detection
- If all fails, show generic content without location reference

---

## Onboarding Flows

### Design Philosophy
Multi-step wizard with clear progress indication, AI-powered tagging at each stage, and gamification elements to encourage completion. Each user type (Musician, Venue, Promoter) has a tailored 5-step flow.

### Common Onboarding Components

#### Progress Stepper
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚪─────⚪─────⚪─────⚪                  │
│  Basic  Sound  Logistics  Media  Preferences   │
└────────────────────────────────────────────────┘
```

**Component Specs:**
- Horizontal stepper at top of every onboarding screen
- Filled circles: Completed steps (accent blue)
- Hollow circles: Incomplete steps (gray border)
- Lines between steps: Gray for incomplete, blue for completed
- Step labels: 12px, below circles
- Mobile: Show only circles (labels on current step only)
- Desktop: Show full labels

#### Save & Resume Banner
```
┌────────────────────────────────────────────────┐
│  ℹ️  Not ready to finish? Save your progress   │
│     and we'll email you a reminder.            │
│                 [Save & Exit]                  │
└────────────────────────────────────────────────┘
```

**Component Specs:**
- Sticky banner at bottom of screen
- Background: `#262626` with subtle border
- Icon: Info icon, 16px
- Text: 14px regular, `#e5e5e5`
- Button: Secondary style (outline), accent blue
- Dismissible (X icon on right)

#### Gamification Badge
```
┌─────────────────────┐
│   🏆 60% Complete   │
│  Finish to unlock   │
│   recommendations!  │
└─────────────────────┘
```

**Component Specs:**
- Circular progress indicator (top-right corner)
- Percentage: Bold, large (20px)
- Text: 10px, encouraging message
- Trophy emoji scales 1.1x when percentage increases

---

### Musician Onboarding Flow

#### Step 1: Basic Info
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚪─────⚪─────⚪─────⚪   🏆 20% Complete │
│                                                │
│          Let's Create Your Profile             │
│                                                │
│  Band/Artist Name *                            │
│  [_________________________________]           │
│                                                │
│  Email *                                       │
│  [_________________________________]           │
│                                                │
│  Password *                                    │
│  [_________________________________] 👁️         │
│                                                │
│  Confirm Password *                            │
│  [_________________________________] 👁️         │
│                                                │
│  Location *                                    │
│  [_________________________________] 📍         │
│  ✓ Use my current location                    │
│                                                │
│              [Continue →]                      │
│                                                │
│         Already have an account? [Login]       │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Input Fields**
  - Full-width on mobile (padding 16px)
  - Max-width 400px on desktop (centered)
  - Height: 48px
  - Border: 1px solid `#404040`, focus: 2px solid accent blue
  - Background: `#333333`
  - Text: 16px, `#e5e5e5`
  - Placeholder: 14px, `#666666`
  
- **Password Fields**
  - Toggle visibility icon (eye icon, right side)
  - Password strength indicator below (red/yellow/green bar)
  
- **Location Field**
  - Pin icon (clickable to trigger geolocation)
  - Checkbox below: "Use my current location"
  - If checked: Auto-fill with detected city/state
  
- **Continue Button**
  - Primary CTA style
  - Full-width on mobile, 200px on desktop
  - Disabled (gray) until all required fields valid
  - Validates on click, shows inline errors if needed

**Validation Rules:**
- Band/Artist Name: 2-50 characters
- Email: Valid email format
- Password: Min 8 characters, 1 uppercase, 1 number, 1 special char
- Location: Required (manual or geolocation)

---

#### Step 2: Sound & Style (AI TAGGING)
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚪─────⚪─────⚪   🏆 40% Complete │
│                                                │
│          Tell Us About Your Sound              │
│                                                │
│  Who does your band sound like? 🤖             │
│  [_________________________________]           │
│  (e.g., Led Zeppelin, Greta Van Fleet)         │
│                                                │
│  AI suggested genres: [Rock] [Blues] [x]       │
│                                                │
│  Select your primary genres *                  │
│  [Jazz] [Rock] [Blues] [Electronic] [Indie]   │
│  [Folk] [Hip-Hop] [Pop] [Country] [Metal]     │
│  +More                                         │
│                                                │
│  Your vibe is... (select all that apply)       │
│  [Energetic] [Mellow] [Sophisticated] [Raw]   │
│  [Intimate] [High-Energy] [Acoustic] [Dark]   │
│  [Uplifting] [Experimental] +More              │
│                                                │
│        [← Back]        [Continue →]            │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Sound-Alike Input**
  - Free text field with autocomplete suggestions
  - AI icon (🤖) indicates AI processing
  - As user types, show dropdown with popular artist names
  - On submission: AI extracts genres and vibes
  - Display extracted tags below input (pill-shaped badges)
  - User can remove tags by clicking X on badge
  
- **Genre Multi-Select**
  - Pill-shaped buttons (32px height)
  - Unselected: `#333333` background, `#a3a3a3` text
  - Selected: Accent blue background, white text
  - Flexbox wrap layout
  - "+More" expands to show additional genres (collapsible)
  - Required: At least 1 genre selected
  
- **Vibe Multi-Select**
  - Similar styling to genre tags
  - Optional field (can skip)
  - AI auto-populates based on sound-alike input
  
- **Navigation Buttons**
  - Back button: Secondary style (text button)
  - Continue button: Primary CTA (disabled until ≥1 genre selected)

**AI Tagging Logic:**
- User input: "We sound like The Black Keys"
- AI extracts: `[Rock, Blues Rock, Garage Rock]` + `[Raw, Energetic, Retro]`
- Pre-populates genre and vibe selections (user can edit)

---

#### Step 3: Logistics
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚫─────⚪─────⚪   🏆 60% Complete │
│                                                │
│            Booking Information                 │
│                                                │
│  Minimum Booking Fee (optional)                │
│  $ [_________________]                         │
│                                                │
│  Willing to Travel?                            │
│  ◉ Yes   ⚪ No                                 │
│                                                │
│  If yes, how far? (miles)                      │
│  [__________] or [Anywhere]                    │
│                                                │
│  Typical Set Length                            │
│  [▼ Select...]                                 │
│     • 30 minutes                               │
│     • 45 minutes                               │
│     • 1 hour                                   │
│     • 1.5 hours                                │
│     • 2+ hours                                 │
│                                                │
│  Block Out Unavailable Dates                   │
│  [Calendar Widget]                             │
│  (Tap dates to mark unavailable)               │
│                                                │
│        [← Back]        [Continue →]            │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Minimum Fee Input**
  - Number input with $ prefix
  - Optional field (musicians can skip)
  - Placeholder: "e.g., 500"
  - Format with commas on blur (e.g., "1,500")
  
- **Travel Radio Buttons**
  - Two large, tappable options (48px height)
  - Selected: Accent blue border, filled circle
  - Unselected: Gray border, hollow circle
  
- **Distance Input**
  - Appears only if "Yes" selected
  - Number input + "or" + checkbox for "Anywhere"
  - Default: 50 miles (smart default based on urban/rural location)
  
- **Set Length Dropdown**
  - Native select on mobile
  - Custom dropdown on desktop (matches dark theme)
  - 5 predefined options
  
- **Calendar Widget**
  - Month view (current month + next 3 months)
  - Tap dates to toggle unavailable (turns red)
  - "Clear All" and "Select Multiple" buttons below
  - Optional: Can skip if no unavailable dates

**Smart Defaults:**
- If user is in NYC: Default travel distance = 50 miles
- If user is in rural area: Default travel distance = 100 miles

---

#### Step 4: Media & Links (Optional)
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚫─────⚫─────⚪   🏆 80% Complete │
│                                                │
│          Showcase Your Talent                  │
│                                                │
│  Profile Photo                                 │
│  ┌──────────────┐                              │
│  │   📷         │  [Upload Photo]              │
│  │   Tap to     │   or [Take Photo]            │
│  │   upload     │                              │
│  └──────────────┘                              │
│                                                │
│  YouTube Links (we'll auto-tag genres!)        │
│  [_________________________________] + Add     │
│  • https://youtube.com/watch?v=...             │
│                                                │
│  Spotify Link (we'll fetch your genres!)       │
│  [_________________________________]           │
│                                                │
│  Instagram Handle                              │
│  @ [_____________________________]             │
│                                                │
│  Website                                       │
│  [_________________________________]           │
│                                                │
│     [Skip This Step]   [Continue →]            │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Profile Photo Upload**
  - Circular preview (120px diameter)
  - Tap to open file picker or camera (mobile)
  - Drag-and-drop zone on desktop
  - Crop tool after selection (circular crop)
  - Max size: 5MB, JPG/PNG only
  
- **YouTube Links**
  - Multiple inputs (add more via "+ Add" button)
  - Validates YouTube URL format
  - AI scrapes video title, description, tags for genre extraction
  - Shows loading spinner while processing
  - Displays extracted genres below each link (removable badges)
  
- **Spotify Link**
  - Single input for artist profile URL
  - Validates Spotify URL format
  - Hits Spotify API to fetch artist genres, audio features
  - Auto-populates genre tags (shown below input)
  - User can accept or modify tags
  
- **Instagram Handle**
  - Text input with @ prefix
  - Removes @ if user includes it
  - Optional validation: Checks if handle exists (API call)
  
- **Website**
  - URL input with http:// or https:// validation
  - Auto-prepends https:// if not included
  
- **Skip Button**
  - Allows users to skip media entirely
  - Encourages completion with tooltip: "Profiles with media get 3x more views!"

**AI Integration:**
- Spotify API: Fetch genres, popularity, audio features (energy, danceability)
- YouTube: Scrape metadata, extract genre keywords from title/description
- Update user's genre/vibe tags based on media analysis

---

#### Step 5: Collaboration Preferences
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚫─────⚫─────⚫  🎉 100% Complete │
│                                                │
│       Collaboration & Network Preferences      │
│                                                │
│  Are you looking to collaborate with           │
│  other musicians?                              │
│  ◉ Yes, I'm open to collaborations             │
│  ⚪ No, just looking for gigs                  │
│                                                │
│  If yes, what kind of collaborations?          │
│  [✓] Session work (studio recordings)          │
│  [✓] Band formation / joining bands            │
│  [ ] Features on tracks                        │
│  [ ] Songwriting partnerships                  │
│  [ ] Live performance fill-ins                 │
│                                                │
│  Any specific instruments or roles?            │
│  [_________________________________]           │
│  (e.g., looking for a drummer)                 │
│                                                │
│              [Complete Profile]                │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Collaboration Radio Buttons**
  - Two large options (48px height each)
  - Selected: Accent blue border, filled circle
  - Unselected: Gray border, hollow circle
  
- **Collaboration Types (Checkboxes)**
  - Multi-select checkboxes
  - Only appears if "Yes" selected above
  - Styled checkboxes (accent blue when checked)
  - 5 predefined options
  
- **Free Text Input**
  - Optional field for specific needs
  - Placeholder: "e.g., looking for a drummer for indie rock project"
  - Max 200 characters
  
- **Complete Profile Button**
  - Large primary CTA (full-width on mobile)
  - On click: Shows loading spinner, processes AI tagging
  - Redirects to success screen (see below)

---

#### Success Screen (Post-Onboarding)
```
┌────────────────────────────────────────────────┐
│                                                │
│               🎉 Welcome to MVPConnect!        │
│                                                │
│         Your profile is now complete!          │
│                                                │
│  ┌──────────────────────────────────────┐     │
│  │  🎸 Musicians That Sound Like You    │     │
│  │                                      │     │
│  │  [Card] [Card] [Card] [Card] [Card]  │     │
│  │                                      │     │
│  │          [View All Matches]          │     │
│  └──────────────────────────────────────┘     │
│                                                │
│  ┌──────────────────────────────────────┐     │
│  │  🎤 Venues Booking Your Sound        │     │
│  │                                      │     │
│  │  [Card] [Card] [Card] [Card] [Card]  │     │
│  │                                      │     │
│  │          [Explore Venues]            │     │
│  └──────────────────────────────────────┘     │
│                                                │
│         [Go to Your Dashboard →]               │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Celebratory Header**
  - Large emoji (64px)
  - Heading: 32px bold, white
  - Subheading: 16px, `#a3a3a3`
  
- **Recommendation Sections**
  - Two sections: Musicians and Venues
  - Each has a horizontal carousel (5 cards)
  - Cards: 180px × 240px (small profile cards)
  - "View All" button below each carousel
  
- **Main CTA**
  - Large button to enter dashboard
  - Primary accent blue, full-width on mobile

**AI Magic:**
- Based on sound-alike input, genres, vibes, and media analysis
- Immediately generate 5 musician matches and 5 venue matches
- Display match indicators (e.g., "Great Match" badge)

---

### Venue Onboarding Flow

#### Step 1: Basic Info
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚪─────⚪─────⚪─────⚪   🏆 20% Complete │
│                                                │
│          Tell Us About Your Venue              │
│                                                │
│  Venue Name *                                  │
│  [_________________________________]           │
│                                                │
│  Email *                                       │
│  [_________________________________]           │
│                                                │
│  Password *                                    │
│  [_________________________________] 👁️         │
│                                                │
│  Confirm Password *                            │
│  [_________________________________] 👁️         │
│                                                │
│  Venue Address *                               │
│  [_________________________________] 📍         │
│  Street Address                                │
│  [_________________________________]           │
│  City, State, ZIP                              │
│                                                │
│              [Continue →]                      │
│                                                │
│         Already have an account? [Login]       │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- Similar to Musician Step 1
- Address fields: Use Google Places autocomplete
- Validates complete address format

---

#### Step 2: Venue Details
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚪─────⚪─────⚪   🏆 40% Complete │
│                                                │
│            Venue Specifications                │
│                                                │
│  Capacity *                                    │
│  [__________] people                           │
│                                                │
│  Does your venue host live music? *            │
│  ◉ Yes, regularly   ⚪ Occasionally            │
│  ⚪ Planning to      ⚪ No                      │
│                                                │
│  Typical Budget Range for Performers           │
│  $ [___________] to $ [___________]            │
│                                                │
│  Booking Contact *                             │
│  Name: [__________________________]            │
│  Email: [__________________________]           │
│  Phone: [__________________________]           │
│                                                │
│        [← Back]        [Continue →]            │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Capacity Input**
  - Number input, required
  - Validation: 1 - 100,000
  
- **Live Music Radio Buttons**
  - Four options (vertical stack on mobile)
  - Affects matching algorithm priority
  
- **Budget Range**
  - Two number inputs (min and max)
  - Optional (venues can skip)
  - Validates: max > min
  
- **Booking Contact**
  - Three fields (name, email, phone)
  - Phone: Auto-formats with dashes/parentheses
  - Email: Must be valid format

---

#### Step 3: Music Preferences (AI TAGGING)
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚫─────⚪─────⚪   🏆 60% Complete │
│                                                │
│          What's Your Venue's Vibe? 🤖          │
│                                                │
│  Describe your venue in a few words:           │
│  [_________________________________]           │
│  (e.g., "Intimate jazz lounge with candlelit   │
│   tables and vintage decor")                   │
│                                                │
│  AI suggested ambience: [Intimate] [Sophisti- │
│  cated] [Jazzy] [x]                            │
│                                                │
│  What genres do you typically book? *          │
│  [Jazz] [Rock] [Blues] [Electronic] [Indie]   │
│  [Folk] [Hip-Hop] [Pop] [Country] [Metal]     │
│  +More                                         │
│                                                │
│  Name a few artists that have played here      │
│  or that you'd love to book:                   │
│  [_________________________________] + Add     │
│  • Artist 1                                    │
│  • Artist 2                                    │
│                                                │
│        [← Back]        [Continue →]            │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Venue Description (Free Text)**
  - Large text area (4 lines visible)
  - Max 300 characters
  - AI extracts ambience tags (e.g., "intimate", "sophisticated", "jazzy")
  - Displays extracted tags below (removable badges)
  
- **Genre Multi-Select**
  - Same styling as Musician onboarding
  - Required: At least 1 genre
  
- **Artist Name Inputs**
  - Multiple inputs (add more via "+ Add")
  - AI looks up artists and extracts their genres
  - Builds venue's genre preference profile
  - Shows "Genre detected: Rock, Blues" below each artist

**AI Tagging Logic:**
- User describes venue: "Cozy wine bar with acoustic performances"
- AI extracts: `[Acoustic, Folk]` genres + `[Intimate, Sophisticated, Relaxed]` vibes
- User lists artists: "John Mayer, Ed Sheeran"
- AI detects: `[Pop, Acoustic, Singer-Songwriter]` genres

---

#### Step 4: Media & Branding
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚫─────⚫─────⚪   🏆 80% Complete │
│                                                │
│         Showcase Your Venue                    │
│                                                │
│  Logo Upload                                   │
│  ┌──────────────┐                              │
│  │   🏢         │  [Upload Logo]               │
│  │   Tap to     │                              │
│  │   upload     │                              │
│  └──────────────┘                              │
│                                                │
│  Venue Photos (Interior, Stage, Crowd)         │
│  [+ Add Photo] [+ Add Photo] [+ Add Photo]     │
│                                                │
│  ┌────────┐ ┌────────┐ ┌────────┐             │
│  │ Photo1 │ │ Photo2 │ │ Photo3 │             │
│  │ [x]    │ │ [x]    │ │ [x]    │             │
│  └────────┘ └────────┘ └────────┘             │
│                                                │
│  Website                                       │
│  [_________________________________]           │
│                                                │
│  Social Media Links                            │
│  Instagram: @ [_____________________]          │
│  Facebook: [_________________________]         │
│  Twitter: @ [_______________________]          │
│                                                │
│     [Skip This Step]   [Continue →]            │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Logo Upload**
  - Square preview (120px × 120px)
  - Max size: 5MB, JPG/PNG only
  - Optional crop tool
  
- **Photo Gallery**
  - Multiple upload slots (up to 10 photos)
  - Grid layout (3 columns on desktop, 2 on mobile)
  - Each photo: 100px × 100px thumbnail with X to remove
  - Drag to reorder photos
  
- **Website & Social Links**
  - Same validation as Musician onboarding
  - Optional fields

---

#### Step 5: Booking Needs
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚫─────⚫─────⚫  🎉 100% Complete │
│                                                │
│          Booking Preferences                   │
│                                                │
│  Are you currently looking for musicians?      │
│  ◉ Yes, actively booking                       │
│  ⚪ Sometimes, depending on the artist          │
│  ⚪ Not right now                               │
│                                                │
│  Do you work with promoters?                   │
│  ◉ Yes, we partner with promoters              │
│  ⚪ No, we book directly                        │
│  ⚪ Looking for promoters to work with          │
│                                                │
│  Mark your open dates:                         │
│  [Calendar Widget]                             │
│  (Tap dates to mark as available for booking)  │
│                                                │
│              [Complete Profile]                │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Booking Status Radio Buttons**
  - Three options, affects recommendation priority
  - "Yes, actively booking" → Higher priority in musician searches
  
- **Promoter Preference Radio Buttons**
  - Three options
  - "Looking for promoters" → Shows promoter matches on success screen
  
- **Calendar Widget**
  - Month view (current month + next 3 months)
  - Tap dates to toggle available (turns green)
  - "Select All" and "Clear All" buttons below
  - Optional: Can skip if not ready to mark dates

---

#### Success Screen (Post-Onboarding)
```
┌────────────────────────────────────────────────┐
│                                                │
│               🎉 Welcome to MVPConnect!        │
│                                                │
│         Your venue is now discoverable!        │
│                                                │
│  ┌──────────────────────────────────────┐     │
│  │  🎸 Musicians Perfect for Your Venue │     │
│  │                                      │     │
│  │  [Card] [Card] [Card] [Card] [Card]  │     │
│  │                                      │     │
│  │          [View All Matches]          │     │
│  └──────────────────────────────────────┘     │
│                                                │
│  ┌──────────────────────────────────────┐     │
│  │  🎭 Promoters in Your Area           │     │
│  │                                      │     │
│  │  [Card] [Card] [Card] [Card] [Card]  │     │
│  │                                      │     │
│  │          [Explore Promoters]         │     │
│  └──────────────────────────────────────┘     │
│                                                │
│         [Go to Your Dashboard →]               │
│                                                │
└────────────────────────────────────────────────┘
```

---

### Promoter Onboarding Flow

#### Step 1: Basic Info
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚪─────⚪─────⚪─────⚪   🏆 20% Complete │
│                                                │
│          Create Your Promoter Profile          │
│                                                │
│  Business Name / Your Name *                   │
│  [_________________________________]           │
│                                                │
│  Email *                                       │
│  [_________________________________]           │
│                                                │
│  Password *                                    │
│  [_________________________________] 👁️         │
│                                                │
│  Confirm Password *                            │
│  [_________________________________] 👁️         │
│                                                │
│  Location (City, State) *                      │
│  [_________________________________] 📍         │
│  ✓ Use my current location                    │
│                                                │
│              [Continue →]                      │
│                                                │
│         Already have an account? [Login]       │
│                                                │
└────────────────────────────────────────────────┘
```

---

#### Step 2: Specialties (AI TAGGING)
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚪─────⚪─────⚪   🏆 40% Complete │
│                                                │
│            What's Your Specialty? 🤖           │
│                                                │
│  What genres do you specialize in? *           │
│  [Jazz] [Rock] [Blues] [Electronic] [Indie]   │
│  [Folk] [Hip-Hop] [Pop] [Country] [Metal]     │
│  +More                                         │
│                                                │
│  What types of events do you promote?          │
│  [✓] Concerts                                  │
│  [✓] Festivals                                 │
│  [ ] Private Events (weddings, corporate)      │
│  [ ] Club Nights                               │
│  [ ] Touring                                   │
│                                                │
│  Name some artists you currently represent     │
│  or have worked with:                          │
│  [_________________________________] + Add     │
│  • Artist 1                                    │
│  • Artist 2                                    │
│                                                │
│        [← Back]        [Continue →]            │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Genre Multi-Select**
  - Same styling as previous onboarding flows
  - Required: At least 1 genre
  
- **Event Types (Checkboxes)**
  - Multi-select checkboxes
  - 5 predefined options
  
- **Artist Inputs**
  - Multiple inputs (add more via "+ Add")
  - AI looks up artists and extracts their genres
  - Builds promoter's genre specialty profile

**AI Tagging Logic:**
- User lists artists they've worked with: "Taylor Swift, Ed Sheeran"
- AI detects: `[Pop, Singer-Songwriter, Acoustic]` genres
- Builds promoter's expertise profile for matching

---

#### Step 3: Network Status
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚫─────⚪─────⚪   🏆 60% Complete │
│                                                │
│            Your Current Network                │
│                                                │
│  Current roster size                           │
│  [▼ Select...]                                 │
│     • Just starting (0 artists)                │
│     • 1-5 artists                              │
│     • 6-10 artists                             │
│     • 11-25 artists                            │
│     • 25+ artists                              │
│                                                │
│  Are you accepting new artists?                │
│  ◉ Yes, actively looking                       │
│  ⚪ Selectively                                 │
│  ⚪ Not at this time                            │
│                                                │
│  Looking for new venue partnerships?           │
│  ◉ Yes, building my network                    │
│  ⚪ Open to opportunities                       │
│  ⚪ Not currently                               │
│                                                │
│        [← Back]        [Continue →]            │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Roster Size Dropdown**
  - 5 predefined ranges
  - Affects matching priority (new promoters get more musician suggestions)
  
- **Accepting Artists (Radio Buttons)**
  - Three options
  - Determines if promoter appears in musician searches
  
- **Venue Partnerships (Radio Buttons)**
  - Three options
  - Determines if promoter appears in venue searches

---

#### Step 4: Business Details
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚫─────⚫─────⚪   🏆 80% Complete │
│                                                │
│            Business Information                │
│                                                │
│  Phone Number                                  │
│  [_________________________________]           │
│                                                │
│  Website                                       │
│  [_________________________________]           │
│                                                │
│  Commission Structure (optional, private)      │
│  [__________] %                                │
│  (This won't be shown publicly)                │
│                                                │
│  Bio / About Your Business                     │
│  [_________________________________]           │
│  [_________________________________]           │
│  [_________________________________]           │
│  [_________________________________]           │
│  (Tell musicians and venues why they should    │
│   work with you)                               │
│                                                │
│     [Skip This Step]   [Continue →]            │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Phone Number**
  - Auto-formats with dashes/parentheses
  - Optional field
  
- **Commission Structure**
  - Number input (0-100%)
  - Private field (not shown on public profile)
  - Optional
  
- **Bio Text Area**
  - Large text area (6 lines visible)
  - Max 500 characters
  - Character counter below

---

#### Step 5: Network Preferences
```
┌────────────────────────────────────────────────┐
│  ⚫─────⚫─────⚫─────⚫─────⚫  🎉 100% Complete │
│                                                │
│        Network & Collaboration Goals           │
│                                                │
│  Are you open to collaborating with            │
│  other promoters?                              │
│  ◉ Yes, I believe in collaboration             │
│  ⚪ Maybe, depending on the opportunity         │
│  ⚪ No, I work independently                    │
│                                                │
│  What's your ideal artist profile?             │
│  [_________________________________]           │
│  [_________________________________]           │
│  [_________________________________]           │
│  (e.g., "Up-and-coming indie bands with strong │
│   social media presence")                      │
│                                                │
│              [Complete Profile]                │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Collaboration Radio Buttons**
  - Three options
  - Affects if promoter appears in other promoters' searches
  
- **Ideal Artist Profile (Free Text)**
  - Large text area (4 lines visible)
  - Max 300 characters
  - AI extracts matching criteria keywords
  - Used to refine musician recommendations

---

#### Success Screen (Post-Onboarding)
```
┌────────────────────────────────────────────────┐
│                                                │
│               🎉 Welcome to MVPConnect!        │
│                                                │
│       Your promoter profile is live!           │
│                                                │
│  ┌──────────────────────────────────────┐     │
│  │  🎸 Musicians Looking for Represen-  │     │
│  │      tation                          │     │
│  │                                      │     │
│  │  [Card] [Card] [Card] [Card] [Card]  │     │
│  │                                      │     │
│  │          [View All Matches]          │     │
│  └──────────────────────────────────────┘     │
│                                                │
│  ┌──────────────────────────────────────┐     │
│  │  🎤 Venues You Can Promote For       │     │
│  │                                      │     │
│  │  [Card] [Card] [Card] [Card] [Card]  │     │
│  │                                      │     │
│  │          [Explore Venues]            │     │
│  └──────────────────────────────────────┘     │
│                                                │
│         [Go to Your Dashboard →]               │
│                                                │
└────────────────────────────────────────────────┘
```

---

### Post-Onboarding Email Campaign

After onboarding completion, trigger automated email sequence:

**Day 1: Welcome Email**
- Subject: "🎉 Welcome to MVPConnect, [Name]!"
- Content: Profile completion confirmation, quick tips for getting started
- CTA: "View Your Matches"

**Day 3: Matches Email**
- Subject: "See your top 5 matches on MVPConnect"
- Content: Preview of top AI-recommended matches (with photos, names, match indicators)
- CTA: "Explore All Matches"
- Even sent if user hasn't logged back in

**Day 7: Tips Email**
- Subject: "How to get your first booking on MVPConnect"
- Content: Best practices, success stories, tips for optimizing profile
- CTA: "Optimize Your Profile"

**Day 14: Success Stories Email**
- Subject: "Musicians/Venues/Promoters are connecting on MVPConnect"
- Content: Testimonials, statistics (X bookings made, Y collaborations formed)
- CTA: "Start Connecting"

---

## Musician Home Page

### Design Goal
Personalized dashboard for logged-in musicians, featuring AI-powered recommendations, activity tracking, quick actions, and collaboration opportunities.

### Wireframe Description

#### Top Navigation Bar
```
┌────────────────────────────────────────────────┐
│ [☰] MVPConnect          [🔍] [🔔] [👤]        │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Hamburger Menu (Mobile)** or **Horizontal Tabs (Desktop)**
  - Mobile: Collapsible side drawer
  - Desktop: Inline tabs (Profile | Home | Recommendations | Inquiries | Messages | Search)
  - Active tab: Accent blue underline (3px)
  - Inactive tabs: `#a3a3a3` text, hover to white
  
- **Search Icon**
  - Opens search overlay
  - Global search: Musicians, Venues, Promoters
  
- **Notifications Bell**
  - Badge with count (red circle with number)
  - Dropdown shows recent notifications (max 5)
  - "View All" link at bottom
  
- **User Avatar**
  - Circular profile photo (32px diameter)
  - Dropdown menu: View Profile, Edit Profile, Settings, Help, Logout

---

#### Dashboard Content (Home Tab)

##### Welcome Section
```
┌────────────────────────────────────────────────┐
│                                                │
│  Welcome back, [Band Name]! 👋                 │
│  Your profile has been viewed 12 times this    │
│  week.                                         │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- Greeting with user's band name
- Profile views stat (encourages engagement)
- Small emoji for personality
- Background: `#262626`, padding: 24px, rounded corners

---

##### Quick Actions Bar
```
┌────────────────────────────────────────────────┐
│  [Update Availability] [Add Media] [Edit Profile]│
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- Three large, tappable buttons (horizontal on desktop, stacked on mobile)
- Icon + text label on each button
- Secondary button style (outline, accent blue)
- Tapping opens relevant modal/screen

---

##### Stats Widget
```
┌───────────────────────────────────────────┐
│          Your Stats This Month            │
│  ─────────────────────────────────────    │
│  Profile Views:  47  📈 +12 from last mo. │
│  Inquiries Sent: 5   ✉️                   │
│  Inquiries Recv: 3   📥                   │
│  Booking Rate:   60% 🎯                   │
└───────────────────────────────────────────┘
```

**Component Breakdown:**
- Card with `#262626` background
- Stats displayed in 2-column grid
- Icons next to each stat (16px)
- Trend indicators (↑ green, ↓ red, → gray)
- "Booking Rate" calculated as (accepted inquiries / sent inquiries)

---

##### Musicians Like You (AI-Powered)
```
┌────────────────────────────────────────────────┐
│  🎸 Musicians That Sound Like You              │
│  (Perfect for collaborations)                  │
│                                                │
│  < [Card1] [Card2] [Card3] [Card4] [Card5] >  │
│                                                │
│              [View All Matches]                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Section Header**
  - Icon + title (20px semibold)
  - Subtitle in smaller gray text
  
- **Horizontal Carousel**
  - 5 musician cards visible (scrollable/swipeable)
  - Arrow navigation on desktop
  
- **Musician Card** (200px × 280px)
  - Profile photo (200px × 150px, cover, rounded top corners)
  - Band name (16px semibold, truncate)
  - Primary genre (12px, `#a3a3a3`)
  - Match indicator: "Great Match" badge (green) or star rating
  - Location (12px, `#a3a3a3`, pin icon)
  - CTA button: "Request Collaboration" (accent blue, small)
  - Background: `#262626`, hover: scale 1.02x
  
- **View All Button**
  - Secondary style, full-width on mobile
  - Links to full recommendations page

---

##### Venues Booking Your Sound (AI-Powered)
```
┌────────────────────────────────────────────────┐
│  🎤 Venues Booking Your Sound                  │
│  (87% match • Available for booking)           │
│                                                │
│  < [Card1] [Card2] [Card3] [Card4] [Card5] >  │
│                                                │
│              [Explore All Venues]              │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- Same styling as "Musicians Like You" section
- **Venue Card** (200px × 280px)
  - Venue photo (200px × 150px)
  - Venue name (16px semibold, truncate)
  - Capacity: "150 capacity" (12px, `#a3a3a3`)
  - Match percentage: "87% match" (subtle, 12px, green text)
  - Primary genres: Jazz, Blues (pill badges)
  - Location (12px, pin icon)
  - CTA button: "Send Inquiry" (accent blue, small)

---

##### Promoters in Your Network
```
┌────────────────────────────────────────────────┐
│  🎭 Promoters Booking Your Genre               │
│                                                │
│  < [Card1] [Card2] [Card3] [Card4] [Card5] >  │
│                                                │
│              [Find More Promoters]             │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- Same carousel styling
- **Promoter Card** (200px × 280px)
  - Business logo or avatar (200px × 150px)
  - Business name (16px semibold, truncate)
  - Specialties: Rock, Blues (pill badges)
  - Location (12px, pin icon)
  - "Roster: 12 artists" (12px, `#a3a3a3`)
  - CTA button: "Request Representation" (accent blue, small)

---

##### Activity Feed
```
┌────────────────────────────────────────────────┐
│  Recent Activity                               │
│  ─────────────────────────────────────────     │
│  • The Blue Note viewed your profile (2h ago)  │
│  • Your inquiry to Jazz Lounge was accepted!   │
│    🎉 (1 day ago)                              │
│  • New message from Promoter XYZ (3 days ago)  │
│  • Your inquiry to Rock Bar is pending         │
│    (5 days ago)                                │
│                                                │
│              [View All Activity]               │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Activity Items** (List)
  - Bullet points, chronological order (most recent first)
  - Icon per activity type (eye for views, checkmark for accepted, etc.)
  - Timestamp in relative format (2h ago, 1 day ago)
  - Clickable items (links to relevant page)
  - Max 5 items shown, "View All" to see full history
  
- **Activity Types:**
  - Profile views
  - Inquiry status changes (sent, accepted, declined, pending)
  - New messages
  - Collaboration requests
  - System announcements

---

### Mobile Layout Adjustments

**Mobile (< 768px):**
- Navigation: Hamburger menu (side drawer)
- Quick actions: Stacked vertically
- Stats widget: 1-column layout
- Carousels: Full-width, swipeable
- Activity feed: Full-width, 3 items visible

**Desktop (≥ 768px):**
- Navigation: Horizontal tabs
- Quick actions: Inline (3 buttons side-by-side)
- Stats widget: 2-column grid
- Carousels: Show 4-5 cards at once with arrows
- Activity feed: 5 items visible

---

## Venue Home Page

### Design Goal
Personalized dashboard for venue owners/managers, featuring musician recommendations, booking calendar, inquiry management, and promoter connections.

### Wireframe Description

#### Top Navigation Bar
```
┌────────────────────────────────────────────────┐
│ [☰] MVPConnect          [🔍] [🔔] [👤]        │
└────────────────────────────────────────────────┘
```

**Tabs (Desktop):** Profile | Home | Recommendations | Bookings | Messages | Search

---

#### Dashboard Content (Home Tab)

##### Welcome Section
```
┌────────────────────────────────────────────────┐
│  Welcome back, [Venue Name]! 🎤                │
│  You have 3 pending inquiries and 2 confirmed  │
│  bookings this month.                          │
└────────────────────────────────────────────────┘
```

---

##### Quick Actions Bar
```
┌────────────────────────────────────────────────┐
│  [Find Musicians for Date] [Update Calendar]   │
│  [View Inquiries]                              │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- "Find Musicians for Date" opens date picker → shows available musicians
- "Update Calendar" opens calendar modal to mark open/booked dates
- "View Inquiries" links to inquiries page

---

##### Stats Widget
```
┌───────────────────────────────────────────┐
│        Your Venue Stats This Year         │
│  ─────────────────────────────────────    │
│  Total Bookings:     24  🎸               │
│  Avg Booking Lead:   30 days  📅          │
│  Popular Genres:     Jazz, Blues  🎵      │
│  Profile Views:      78  📈               │
└───────────────────────────────────────────┘
```

---

##### Musicians Perfect for Your Venue (AI-Powered)
```
┌────────────────────────────────────────────────┐
│  🎸 Musicians Perfect for Your Venue           │
│  (Matched by genre & availability)             │
│                                                │
│  < [Card1] [Card2] [Card3] [Card4] [Card5] >  │
│                                                │
│              [View All Musicians]              │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Musician Card** (200px × 280px)
  - Profile photo (200px × 150px)
  - Band name (16px semibold)
  - Primary genre (12px, `#a3a3a3`)
  - "Available: Oct 15, 22, 29" (12px, green text)
  - Minimum fee: "$500" (12px, `#a3a3a3`)
  - Match indicator: "Great Fit" badge
  - CTA button: "Send Booking Inquiry" (accent blue, small)

---

##### Promoters Bringing You Talent
```
┌────────────────────────────────────────────────┐
│  🎭 Promoters in Your Network                  │
│                                                │
│  < [Card1] [Card2] [Card3] [Card4] [Card5] >  │
│                                                │
│              [Find More Promoters]             │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- Same carousel styling as other sections
- **Promoter Card** (200px × 280px)
  - Business logo (200px × 150px)
  - Business name (16px semibold)
  - Specialties: Rock, Blues (pill badges)
  - "Roster: 15 artists" (12px, `#a3a3a3`)
  - CTA button: "Connect with Promoter" (accent blue, small)

---

##### Booking Calendar
```
┌────────────────────────────────────────────────┐
│  📅 Booking Calendar                           │
│                                                │
│  October 2025                     [< Today >]  │
│  ─────────────────────────────────────────     │
│  Sun Mon Tue Wed Thu Fri Sat                   │
│   1   2   3   4   5   6   7                    │
│   8   9  10  11  12  13  14                    │
│  15  16  17  18  19  20  21                    │
│  22  23  24  25  26  27  28                    │
│  29  30  31                                    │
│  ─────────────────────────────────────────     │
│  🟢 Available  🔵 Pending  🟠 Confirmed        │
│                                                │
│          [Find Musicians for Oct 15]           │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Calendar Widget**
  - Month view (current month)
  - Date cells color-coded:
    - Green: Available (open dates)
    - Blue: Pending inquiries
    - Orange: Confirmed bookings
    - Gray: Past dates or unavailable
  - Tapping a date shows details (musician name, inquiry status)
  - Navigation: Previous/Next month arrows
  - "Today" button to jump to current date
  
- **Legend**
  - Small color-coded legend below calendar
  
- **Quick Action Button**
  - Links to musician search filtered by selected date

---

##### Recently Viewed Musicians
```
┌────────────────────────────────────────────────┐
│  Recently Viewed                               │
│                                                │
│  < [Card1] [Card2] [Card3] [Card4] [Card5] >  │
│                                                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- Horizontal carousel (same styling as recommendations)
- Shows last 10 musicians viewed (most recent first)
- Quick access to revisit profiles without searching

---

##### Inquiry Management
```
┌────────────────────────────────────────────────┐
│  Pending Inquiries                             │
│  ─────────────────────────────────────────     │
│  From Musicians:                               │
│  • The Blue Notes (Jazz) - Oct 15 [Accept]     │
│    [Decline] [View Profile]                    │
│  • Rock Rebels (Rock) - Oct 22 [Accept]        │
│    [Decline] [View Profile]                    │
│                                                │
│  From Promoters:                               │
│  • XYZ Promotions - Multiple dates [Accept]    │
│    [Decline] [View Details]                    │
│                                                │
│              [View All Inquiries]              │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Inquiry Items** (List)
  - Sender name (musician or promoter)
  - Genre (if musician)
  - Proposed date(s)
  - Action buttons: Accept, Decline, View Profile/Details
  - Accept button: Green, primary style
  - Decline button: Red, secondary style
  - Max 5 items shown, "View All" to see full list
  
- **Sections:**
  - From Musicians (direct booking requests)
  - From Promoters (promoter proposing their artists)

---

## Promoter Home Page

### Design Goal
Comprehensive dashboard for promoters to manage their roster, venue network, match opportunities, and track performance.

### Wireframe Description

#### Top Navigation Bar
```
┌────────────────────────────────────────────────┐
│ [☰] MVPConnect          [🔍] [🔔] [👤]        │
└────────────────────────────────────────────────┘
```

**Tabs (Desktop):** Profile | Home | Artists | Venues | Opportunities | Messages | Search

---

#### Dashboard Content (Home Tab)

##### Welcome Section
```
┌────────────────────────────────────────────────┐
│  Welcome back, [Promoter Name]! 🎭             │
│  You have 5 new match opportunities and 2      │
│  upcoming bookings to manage.                  │
└────────────────────────────────────────────────┘
```

---

##### Performance Dashboard
```
┌───────────────────────────────────────────┐
│        Your Performance This Year         │
│  ─────────────────────────────────────    │
│  Successful Bookings:  47  🎸             │
│  Revenue Generated:    $12,450  💰        │
│  Network Growth:       +18 venues  📈     │
│  Active Roster:        12 artists  🎤     │
└───────────────────────────────────────────┘
```

**Component Breakdown:**
- Stats displayed in 2-column grid
- Icons next to each stat
- Revenue: Only shown if commission tracking enabled
- Network growth: Trend indicator (↑ green)

---

##### Quick Actions Bar
```
┌────────────────────────────────────────────────┐
│  [Add Artist] [Find Venues] [View Opportunities]│
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- "Add Artist" opens artist search/invite modal
- "Find Venues" links to venue search page
- "View Opportunities" links to opportunities page

---

##### Musicians Ready for Representation (AI-Powered)
```
┌────────────────────────────────────────────────┐
│  🎸 Musicians Looking for Representation       │
│  (Matched by your genre specialties)           │
│                                                │
│  < [Card1] [Card2] [Card3] [Card4] [Card5] >  │
│                                                │
│              [View All Musicians]              │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Musician Card** (200px × 280px)
  - Profile photo (200px × 150px)
  - Band name (16px semibold)
  - Primary genre (12px, `#a3a3a3`)
  - "Available: Yes" (12px, green text)
  - Booking stats: "5 bookings this year" (12px, `#a3a3a3`)
  - CTA button: "Add to Roster" (accent blue, small)

---

##### Venues Looking for Talent
```
┌────────────────────────────────────────────────┐
│  🎤 Venues in Your Network                     │
│  (Open dates • Looking for artists)            │
│                                                │
│  < [Card1] [Card2] [Card3] [Card4] [Card5] >  │
│                                                │
│              [Explore All Venues]              │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Venue Card** (200px × 280px)
  - Venue photo (200px × 150px)
  - Venue name (16px semibold)
  - "Open dates: Oct 15, 22, Nov 5" (12px, green text)
  - Genre preferences: Jazz, Blues (pill badges)
  - CTA button: "Propose Musicians" (accent blue, small)

---

##### Your Roster
```
┌────────────────────────────────────────────────┐
│  Your Artist Roster (12 artists)               │
│                                                │
│  🔍 Search roster... [__________]              │
│                                                │
│  [Grid of Artist Cards]                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ Artist1 │ │ Artist2 │ │ Artist3 │         │
│  │ [View]  │ │ [View]  │ │ [View]  │         │
│  │ [Book]  │ │ [Book]  │ │ [Book]  │         │
│  └─────────┘ └─────────┘ └─────────┘         │
│                                                │
│              [View Full Roster]                │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Search Bar**
  - Filters roster by name or genre
  
- **Artist Cards** (Grid layout)
  - Smaller cards: 150px × 200px
  - Profile photo (150px × 120px)
  - Band name (14px semibold, truncate)
  - Primary genre (10px, `#a3a3a3`)
  - Two buttons:
    - "View Profile" (secondary style)
    - "Find Venues" (primary style, links to venue search with artist pre-selected)
  - Grid: 3 columns on desktop, 2 on tablet, 1 on mobile
  - Max 6 artists shown, "View Full Roster" to see all

---

##### Your Venue Network
```
┌────────────────────────────────────────────────┐
│  Your Venue Network (18 venues)                │
│                                                │
│  [Grid of Venue Cards]                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ Venue1  │ │ Venue2  │ │ Venue3  │         │
│  │ Next:   │ │ Next:   │ │ Next:   │         │
│  │ Oct 15  │ │ Nov 2   │ │ Oct 28  │         │
│  │ [View]  │ │ [View]  │ │ [View]  │         │
│  └─────────┘ └─────────┘ └─────────┘         │
│                                                │
│              [View Full Network]               │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Venue Cards** (Grid layout)
  - Smaller cards: 150px × 200px
  - Venue photo (150px × 120px)
  - Venue name (14px semibold, truncate)
  - Next open date (12px, green text)
  - "View Profile" button (secondary style)
  - Grid: 3 columns on desktop, 2 on tablet, 1 on mobile
  - Max 6 venues shown, "View Full Network" to see all

---

##### Active Opportunities (AI Match Suggestions)
```
┌────────────────────────────────────────────────┐
│  🔗 Match Opportunities (AI Suggested)         │
│  ─────────────────────────────────────────     │
│  • The Blue Notes → Jazz Lounge (Oct 15)       │
│    93% match • [Propose Booking]               │
│                                                │
│  • Rock Rebels → The Rock Bar (Oct 22)         │
│    87% match • [Propose Booking]               │
│                                                │
│  • Indie Vibes → Cafe Acoustica (Nov 5)        │
│    82% match • [Propose Booking]               │
│                                                │
│              [View All Opportunities]          │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Opportunity Items** (List)
  - Artist name → Venue name
  - Proposed date (if venue has open date)
  - Match percentage (AI-calculated)
  - "Propose Booking" button (primary accent blue)
  - Tapping button opens booking inquiry form (pre-filled)
  - Max 5 opportunities shown, "View All" to see full list
  
- **AI Logic:**
  - Matches promoter's roster artists with venues in their network
  - Considers genre alignment, open dates, budget ranges
  - Prioritizes high-match opportunities

---

## Common Navigation Elements

### Top Bar (All User Types)

#### Desktop Layout
```
┌────────────────────────────────────────────────┐
│ [Logo] Profile  Home  Recommendations  Msgs    │
│         Search...  [_____________]   [🔔] [👤] │
└────────────────────────────────────────────────┘
```

#### Mobile Layout
```
┌────────────────────────────────────────────────┐
│ [☰] MVPConnect          [🔍] [🔔] [👤]        │
└────────────────────────────────────────────────┘
```

**Component Breakdown:**
- **Logo** (Left)
  - 40px height, clickable (links to home)
  - Desktop: Full "MVPConnect" wordmark
  - Mobile: "MVC" initials or icon
  
- **Navigation Tabs** (Desktop only)
  - Horizontal tabs, inline
  - Active tab: Accent blue underline (3px), white text
  - Inactive tabs: `#a3a3a3` text, hover to white
  - Tabs vary by user type (see below)
  
- **Search Bar** (Desktop only, Center)
  - Global search input
  - Placeholder: "Search musicians/venues/promoters"
  - Width: 300px, expands to 400px on focus
  - Autocomplete dropdown with recent searches
  
- **Notifications Bell** (Right)
  - Icon with badge count (red circle)
  - Dropdown shows recent notifications (max 5)
  - Notification types: Inquiry status, new messages, profile views, system announcements
  - "View All Notifications" link at bottom
  
- **User Avatar Dropdown** (Right)
  - Circular profile photo (32px diameter)
  - Dropdown menu (opens on click):
    - View Profile
    - Edit Profile
    - Account Settings
    - Help/Support
    - Logout
  - Profile completeness indicator: "Profile: 80% complete" (if < 100%)

---

### Navigation Tabs by User Type

**Musician:**
- Profile | Home | Recommendations | Inquiries | Messages | Search

**Venue:**
- Profile | Home | Recommendations | Bookings | Messages | Search

**Promoter:**
- Profile | Home | Artists | Venues | Opportunities | Messages | Search

---

### Mobile Hamburger Menu

```
┌─────────────────────────┐
│ [x]                     │
│                         │
│ 👤 [Avatar] [Name]      │
│    View Profile         │
│    Edit Profile         │
│                         │
│ ───────────────────     │
│                         │
│ 🏠 Home                 │
│ 🎸 Recommendations      │
│ ✉️  Inquiries/Bookings  │
│ 💬 Messages             │
│ 🔍 Search               │
│                         │
│ ───────────────────     │
│                         │
│ ⚙️  Settings            │
│ ❓ Help & Support       │
│ 🚪 Logout               │
│                         │
└─────────────────────────┘
```

**Component Breakdown:**
- **Side Drawer** (Slides in from left)
  - Full-height overlay
  - Background: `#1a1a1a` with slight transparency
  - Width: 80% of screen (max 320px)
  
- **User Section** (Top)
  - Profile photo + name
  - Quick links: View/Edit Profile
  
- **Main Navigation** (Middle)
  - Icon + text labels
  - Icons: 20px, accent blue
  - Active page: Accent blue background
  
- **Settings Section** (Bottom)
  - Settings, Help, Logout

---

### Notifications Dropdown

```
┌─────────────────────────────────────────┐
│ Notifications (3 new)                   │
│ ────────────────────────────────────    │
│ 🔵 The Blue Note accepted your inquiry  │
│    2 hours ago                          │
│                                         │
│ 👁️  Jazz Lounge viewed your profile     │
│    1 day ago                            │
│                                         │
│ ✉️  New message from Promoter XYZ       │
│    3 days ago                           │
│                                         │
│ [View All Notifications]                │
└─────────────────────────────────────────┘
```

**Component Breakdown:**
- **Dropdown Panel**
  - Width: 320px, right-aligned
  - Background: `#262626`, border: 1px solid `#404040`
  - Max 5 notifications shown
  
- **Notification Items**
  - Icon (status indicator): Blue = new, Gray = read
  - Message text (14px)
  - Timestamp (12px, `#a3a3a3`, relative format)
  - Clickable (links to relevant page)
  - Unread notifications: Slightly lighter background
  
- **View All Link**
  - Links to full notifications page
  - Accent blue text

---

### Search Overlay (Mobile)

```
┌─────────────────────────────────────────┐
│ [x] Search                              │
│                                         │
│ 🔍 [_______________________________]    │
│                                         │
│ Recent Searches:                        │
│ • Jazz musicians in NYC                 │
│ • The Blue Note                         │
│                                         │
│ Suggestions:                            │
│ • 🎸 Rock Rebels (Musician)             │
│ • 🎤 Jazz Lounge (Venue)                │
│ • 🎭 XYZ Promotions (Promoter)          │
│                                         │
└─────────────────────────────────────────┘
```

**Component Breakdown:**
- **Full-Screen Overlay** (Mobile)
  - Background: `#1a1a1a`, full-height
  - Close button (X) in top-left
  
- **Search Input**
  - Large input field (56px height)
  - Auto-focus on open
  - Clear button (X) on right side when typing
  
- **Recent Searches**
  - List of last 5 searches (clickable)
  - "Clear All" button (small, right-aligned)
  
- **Suggestions** (As user types)
  - Real-time autocomplete
  - Shows musicians, venues, promoters
  - Icons to indicate user type
  - Clickable items (links to profile)

---

## Component Architecture

### React Native Component Hierarchy

```
App (Root)
├── Navigation
│   ├── AuthStack (Not logged in)
│   │   ├── LandingScreen
│   │   ├── LoginScreen
│   │   └── SignupScreen (Routes to onboarding)
│   │       ├── MusicianOnboarding
│   │       ├── VenueOnboarding
│   │       └── PromoterOnboarding
│   └── AppStack (Logged in)
│       ├── MainTabs
│       │   ├── HomeTab
│       │   │   ├── MusicianHomeScreen
│       │   │   ├── VenueHomeScreen
│       │   │   └── PromoterHomeScreen
│       │   ├── RecommendationsTab
│       │   ├── InquiriesTab / BookingsTab
│       │   ├── MessagesTab
│       │   └── SearchTab
│       └── Modals
│           ├── ProfileModal
│           ├── SettingsModal
│           └── NotificationsModal
```

---

### Core Reusable Components

#### 1. **Button Component** (`components/Button.tsx`)
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'text';
  size: 'small' | 'medium' | 'large';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}
```

**Variants:**
- **Primary:** Accent blue background, white text (CTAs)
- **Secondary:** Transparent background, accent blue border + text
- **Outline:** Gray border, white text
- **Text:** No border, accent blue text (links)

**Sizes:**
- **Small:** 32px height, 12px text
- **Medium:** 48px height, 14px text (default)
- **Large:** 56px height, 16px text

---

#### 2. **Card Component** (`components/Card.tsx`)
```typescript
interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}
```

**Variants:**
- **Default:** `#262626` background, no border
- **Elevated:** Shadow + border radius (iOS style)
- **Outlined:** Border, no shadow

**Usage:** Used for musician/venue/promoter cards, stats widgets, etc.

---

#### 3. **Input Component** (`components/Input.tsx`)
```typescript
interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}
```

**Features:**
- Error state (red border, error message below)
- Icon support (left/right)
- Password toggle (eye icon)
- Character counter (for multiline)

---

#### 4. **ProfileCard Component** (`components/ProfileCard.tsx`)
```typescript
interface ProfileCardProps {
  type: 'musician' | 'venue' | 'promoter';
  id: string;
  name: string;
  imageUrl: string;
  primaryGenre?: string;
  location?: string;
  matchIndicator?: 'great' | 'good' | 'potential';
  additionalInfo?: string; // e.g., "Available: Oct 15", "Capacity: 150"
  onPress: () => void;
  ctaLabel: string;
  onCtaPress: () => void;
}
```

**Variations:**
- Musician card: Shows genres, availability, minimum fee
- Venue card: Shows capacity, open dates, genre preferences
- Promoter card: Shows specialties, roster size

---

#### 5. **Carousel Component** (`components/Carousel.tsx`)
```typescript
interface CarouselProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  horizontal?: boolean;
  showArrows?: boolean; // Desktop only
  itemWidth: number;
  itemHeight: number;
}
```

**Features:**
- Horizontal scrolling/swiping
- Snap-to-item behavior
- Arrow navigation (desktop)
- Dot indicators (mobile)

---

#### 6. **Tag Component** (`components/Tag.tsx`)
```typescript
interface TagProps {
  label: string;
  variant?: 'genre' | 'vibe' | 'status' | 'match';
  removable?: boolean;
  onRemove?: () => void;
}
```

**Variants:**
- **Genre:** Pill-shaped, accent blue background
- **Vibe:** Pill-shaped, secondary color
- **Status:** Color-coded (green/yellow/red)
- **Match:** Badge with icon (star, checkmark)

---

#### 7. **Calendar Component** (`components/Calendar.tsx`)
```typescript
interface CalendarProps {
  selectedDates?: Date[];
  onDatePress: (date: Date) => void;
  markedDates?: Record<string, { color: string; label: string }>;
  minDate?: Date;
  maxDate?: Date;
}
```

**Features:**
- Month view with navigation
- Multi-select support
- Color-coded dates (available, pending, booked)
- Tap to select/deselect

---

#### 8. **StatsWidget Component** (`components/StatsWidget.tsx`)
```typescript
interface StatsWidgetProps {
  stats: {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }[];
  columns?: 1 | 2;
}
```

**Features:**
- Grid layout (1 or 2 columns)
- Icons next to stats
- Trend indicators (↑ green, ↓ red, → gray)

---

#### 9. **NavigationBar Component** (`components/NavigationBar.tsx`)
```typescript
interface NavigationBarProps {
  userType: 'musician' | 'venue' | 'promoter';
  activeTab: string;
  onTabPress: (tab: string) => void;
  notificationCount: number;
  userAvatar: string;
}
```

**Features:**
- Dynamic tabs based on user type
- Notification badge
- User avatar dropdown
- Mobile: Hamburger menu
- Desktop: Horizontal tabs + search bar

---

#### 10. **ProgressStepper Component** (`components/ProgressStepper.tsx`)
```typescript
interface ProgressStepperProps {
  steps: string[];
  currentStep: number;
}
```

**Features:**
- Horizontal stepper
- Filled/hollow circles
- Lines between steps
- Mobile: Compact (circles only)
- Desktop: Full labels

---

### State Management Architecture

**Recommendation: Redux Toolkit + RTK Query**

```
store/
├── slices/
│   ├── authSlice.ts (User authentication state)
│   ├── userSlice.ts (User profile, preferences)
│   ├── recommendationsSlice.ts (AI-powered matches)
│   ├── inquiriesSlice.ts (Booking inquiries, status)
│   ├── messagesSlice.ts (Chat messages)
│   └── notificationsSlice.ts (Notifications)
├── api/
│   ├── authApi.ts (Login, signup, logout)
│   ├── usersApi.ts (Profile CRUD, search)
│   ├── recommendationsApi.ts (Fetch AI matches)
│   ├── inquiriesApi.ts (Send/receive inquiries)
│   └── messagesApi.ts (Chat functionality)
└── store.ts (Configure store)
```

**Key Benefits:**
- Centralized state management
- API caching via RTK Query
- TypeScript support
- Redux DevTools integration

---

### Navigation Architecture

**React Navigation v6**

```typescript
// Stack Navigators
const AuthStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Landing" component={LandingScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="MusicianOnboarding" component={MusicianOnboardingFlow} />
    <Stack.Screen name="VenueOnboarding" component={VenueOnboardingFlow} />
    <Stack.Screen name="PromoterOnboarding" component={PromoterOnboardingFlow} />
  </Stack.Navigator>
);

// Tab Navigator (Logged In)
const AppTabs = () => {
  const { userType } = useSelector((state) => state.auth);
  
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Recommendations" component={RecommendationsScreen} />
      <Tab.Screen 
        name={userType === 'promoter' ? 'Opportunities' : 'Inquiries'} 
        component={InquiriesScreen} 
      />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  return (
    <NavigationContainer>
      {isAuthenticated ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};
```

---

### Styling Architecture

**Styled Components + Theme Provider**

```typescript
// theme.ts
export const darkTheme = {
  colors: {
    background: {
      primary: '#1a1a1a',
      secondary: '#262626',
      tertiary: '#333333',
    },
    text: {
      primary: '#e5e5e5',
      secondary: '#a3a3a3',
      disabled: '#666666',
    },
    accent: {
      primary: '#0ea5e9',
      secondary: '#8b5cf6',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    border: {
      default: '#404040',
      strong: '#525252',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: 'normal' },
    bodyLarge: { fontSize: 16, fontWeight: 'normal' },
    caption: { fontSize: 12, fontWeight: 'normal' },
    small: { fontSize: 10, fontWeight: 'normal' },
  },
};

// Usage in components
import styled from 'styled-components/native';

const Container = styled.View`
  background-color: ${(props) => props.theme.colors.background.primary};
  padding: ${(props) => props.theme.spacing.md}px;
`;
```

---

### API Integration

**Base API Service** (`services/api.ts`)

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken'); // or AsyncStorage on mobile
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (handle errors)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (logout, redirect to login)
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### AI Tagging Service

**AI Service** (`services/aiTagging.ts`)

```typescript
import apiClient from './api';

export const aiTaggingService = {
  // Extract genres/vibes from sound-alike input
  extractFromSoundAlike: async (artistNames: string[]) => {
    const response = await apiClient.post('/ai/extract-from-artists', {
      artists: artistNames,
    });
    return response.data; // { genres: [], vibes: [] }
  },

  // Extract genres from Spotify link
  extractFromSpotify: async (spotifyUrl: string) => {
    const response = await apiClient.post('/ai/extract-from-spotify', {
      url: spotifyUrl,
    });
    return response.data; // { genres: [], audioFeatures: {} }
  },

  // Extract genres/tags from YouTube link
  extractFromYouTube: async (youtubeUrl: string) => {
    const response = await apiClient.post('/ai/extract-from-youtube', {
      url: youtubeUrl,
    });
    return response.data; // { genres: [], tags: [] }
  },

  // Extract ambience tags from venue description
  extractVenueAmbience: async (description: string) => {
    const response = await apiClient.post('/ai/extract-venue-ambience', {
      description,
    });
    return response.data; // { ambience: [], genres: [] }
  },

  // Get AI-powered recommendations
  getRecommendations: async (
    userType: 'musician' | 'venue' | 'promoter',
    userId: string,
    targetType: 'musician' | 'venue' | 'promoter',
    limit: number = 10
  ) => {
    const response = await apiClient.get('/ai/recommendations', {
      params: { userType, userId, targetType, limit },
    });
    return response.data; // Array of recommended profiles with match scores
  },
};
```

---

## Responsive Design Strategy

### Breakpoints

```typescript
export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  widescreen: 1440,
};
```

### Responsive Hooks

```typescript
// hooks/useResponsive.ts
import { useWindowDimensions } from 'react-native';

export const useResponsive = () => {
  const { width } = useWindowDimensions();

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isWidescreen: width >= 1440,
  };
};

// Usage in components
const MyComponent = () => {
  const { isMobile, isDesktop } = useResponsive();

  return (
    <View>
      {isMobile && <MobileLayout />}
      {isDesktop && <DesktopLayout />}
    </View>
  );
};
```

---

### Layout Adaptations

**Mobile (< 768px):**
- Single column layouts
- Stacked navigation (hamburger menu)
- Full-width cards
- Carousels: Swipeable, 1 card visible
- Bottom tab navigation (React Navigation)

**Tablet (768px - 1024px):**
- 2-column grids
- Side drawer navigation (persistent)
- Cards: 2 per row
- Carousels: 2-3 cards visible

**Desktop (≥ 1024px):**
- 3-4 column grids
- Horizontal tab navigation
- Cards: 3-4 per row
- Carousels: 4-5 cards visible with arrows

---

### React Native Web Considerations

For web deployment via React Native Web:

1. **Navigation:** Use React Navigation's web linking for URL routing
2. **Styling:** Use `Platform.select()` for web-specific styles
3. **Interactions:** Hover states work on web (`:hover` via styled-components)
4. **Forms:** Web forms submit via Enter key (handled automatically)
5. **SEO:** Use `react-helmet-async` for meta tags on web

---

## Accessibility Considerations

### WCAG 2.1 AA Compliance

#### Color Contrast
- Text on background: Minimum 4.5:1 ratio
- Primary text (`#e5e5e5`) on primary background (`#1a1a1a`): 13.4:1 ✅
- Secondary text (`#a3a3a3`) on primary background: 6.9:1 ✅
- Accent blue (`#0ea5e9`) on primary background: 4.8:1 ✅

#### Focus Indicators
- All interactive elements have visible focus states
- Focus ring: 2px solid accent blue with 2px offset
- Keyboard navigation supported throughout

#### Screen Reader Support
- `accessibilityLabel` on all interactive elements
- `accessibilityHint` for complex actions
- `accessibilityRole` for semantic meaning
- Proper heading hierarchy (h1 → h2 → h3)

Example:
```typescript
<Button
  accessibilityLabel="Send booking inquiry"
  accessibilityHint="Opens a form to request a booking from this musician"
  accessibilityRole="button"
  onPress={handleInquiry}
>
  Send Inquiry
</Button>
```

#### Touch Target Sizes
- Minimum 44x44px for all tappable elements (iOS guideline)
- Buttons: 48px height (exceeds minimum)
- Icons: 24px minimum, 32px preferred

#### Form Accessibility
- Labels associated with inputs
- Error messages announced to screen readers
- Required fields indicated visually and semantically
- Clear error recovery instructions

---

### Additional Accessibility Features

1. **Dark Mode Toggle:** Allow users to switch to light mode for preference
2. **Font Size Scaling:** Support iOS/Android system font size settings
3. **Reduced Motion:** Respect `prefers-reduced-motion` for animations
4. **Alt Text:** All images have descriptive alt text (profile photos, venue images)
5. **Semantic HTML:** Use semantic elements on web (`<nav>`, `<main>`, `<article>`)

---

## Design System Documentation

### Component Library
- **Documentation Tool:** Storybook for React Native
- **Component Previews:** All reusable components documented with examples
- **Usage Guidelines:** Props, variants, accessibility notes

### Design Tokens
- **Colors:** Defined in `theme.ts` (single source of truth)
- **Spacing:** Consistent scale (4px base unit)
- **Typography:** Defined font sizes and weights
- **Shadows:** Elevation system (0-5 levels)

### Figma Integration
- **Design Handoff:** Export Figma components to React Native via Figma API
- **Icon System:** Use `react-native-vector-icons` (Material Icons or Font Awesome)

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
1. **Video Profiles:** Musicians upload performance videos directly to profile
2. **In-App Messaging:** Real-time chat between users (Socket.io)
3. **Contract Management:** Generate booking contracts within the app
4. **Payment Integration:** Stripe/PayPal for booking deposits
5. **Reviews & Ratings:** Venues rate musicians, musicians rate venues
6. **Advanced Filters:** Search by date range, budget, equipment requirements
7. **Tour Planner:** Promoters plan multi-city tours with routing optimization
8. **Social Feed:** Activity feed showing network updates (X booked Y, new venues, etc.)

### Design Enhancements
1. **Light Mode:** Full light theme support (optional toggle)
2. **Animations:** Smooth transitions (React Native Reanimated)
3. **Custom Illustrations:** Replace emoji icons with custom illustrations
4. **Interactive Maps:** Venue locations on interactive map (MapBox)
5. **Data Visualizations:** Charts for stats (performance over time)

---

## Appendix

### Technology Stack Summary

**Frontend:**
- React Native (with Expo for POC)
- React Navigation v6
- Redux Toolkit + RTK Query
- Styled Components (React Native)
- React Native Paper (UI library, optional)
- TypeScript

**Backend API (Assumed):**
- RESTful API (or GraphQL)
- Authentication: JWT tokens
- AI/ML: Python backend (genre/vibe extraction, recommendations)
- Spotify API, YouTube API (metadata scraping)
- Google Geolocation API

**Deployment:**
- iOS: App Store
- Android: Google Play Store
- Web: Vercel/Netlify (React Native Web build)

---

### Design Handoff Checklist

- [ ] All screens designed in Figma (high-fidelity mockups)
- [ ] Component library created in Storybook
- [ ] Design tokens exported (colors, spacing, typography)
- [ ] Accessibility audit completed (WCAG 2.1 AA)
- [ ] Responsive layouts tested (mobile, tablet, desktop)
- [ ] User flows documented (onboarding, inquiries, messaging)
- [ ] Icon assets exported (SVG, 1x/2x/3x for mobile)
- [ ] Developer handoff meeting scheduled

---

### References & Inspiration

**Design Inspiration:**
- Ultimate Guitar (dark mode aesthetic)
- Spotify (music industry vibe, discovery features)
- LinkedIn (professional networking, recommendations)
- Tinder (card-based browsing, match system)

**UI/UX Best Practices:**
- Apple Human Interface Guidelines
- Material Design (Android)
- Nielsen Norman Group (usability principles)
- WCAG 2.1 Accessibility Standards

---

## Conclusion

This UI Design Document provides a comprehensive blueprint for building MVPConnect, a music industry platform connecting musicians, venues, and promoters. The design emphasizes:

1. **Mobile-First:** Optimized for on-the-go users with React Native
2. **AI-Driven:** Intelligent recommendations based on multi-dimensional tagging
3. **User-Centric:** Tailored experiences for each user type (musician, venue, promoter)
4. **Dark Mode:** Modern, music-industry-aligned aesthetic
5. **Accessibility:** WCAG 2.1 AA compliant for inclusive design
6. **Scalability:** Component-based architecture for easy maintenance and expansion

**Next Steps:**
1. Review and approve this document
2. Begin high-fidelity mockups in Figma
3. Set up React Native project with Expo
4. Implement core components and navigation
5. Integrate AI tagging and recommendation APIs
6. Conduct user testing and iterate

---

**Document Version:** 1.0  
**Last Updated:** October 26, 2025  
**Author:** MVPConnect Design Team  
**Status:** Ready for Development

---

