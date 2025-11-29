# PrayerMap — Product Requirements Document

**Version:** 2.1  
**Status:** Ready for Implementation  
**Last Updated:** November 2025

**📖 Required Reading:** Before working on PrayerMap, you MUST read `ARTICLE.md` - The Autonomous Excellence Manifesto. This document defines our operational philosophy, research standards, and execution methodology that governs every aspect of this project.

---

## Executive Summary

**PrayerMap** is a location-based spiritual platform that enables users to share prayer requests and support one another through a beautifully designed interactive map interface.

**Core Value Proposition:** "See where prayer is needed. Send prayer where you are."

**Mission:** 100% non-profit ministry focused on connecting people through prayer.

---

## Product Vision

### Mission Statement
Create a digital sanctuary where people can authentically share burdens, receive support, and experience the power of community prayer—all while feeling safe, respected, and spiritually uplifted.

### The "Living Map" Philosophy

**PrayerMap is fundamentally different from typical location-based apps.** While other map applications show current, temporary data (like nearby restaurants or traffic), PrayerMap displays a **persistent, growing tapestry of prayer connections** that accumulates meaning over time.

#### What Makes Our Map "Living":

1. **Spiritual Persistence** — Prayer connections (memorial lines) remain visible indefinitely, creating a visual history of compassion that grows richer with time
2. **Emotional Resonance** — New users see years of prayer activity, immediately understanding they're joining an active community of faith
3. **Sacred Geography** — Locations become imbued with spiritual significance through accumulated prayer history
4. **Community Memory** — The map serves as a collective memory of where God has been at work through prayer

#### Design Implications:

**Memory Over Recency:** Unlike social feeds that prioritize new content, our map prioritizes meaningful connections that build up over time. A memorial line from 6 months ago is just as valuable as one from yesterday.

**Layered Storytelling:** The visual density of prayer connections tells stories about communities - areas with many lines indicate either high need or strong prayer coverage, both spiritually significant.

**First Impression Impact:** When someone opens PrayerMap for the first time, they should see a map rich with existing connections, immediately conveying "this is a place where prayer happens." An empty map communicates abandonment; a connected map communicates active faith community.

**Technical Architecture Priority:** All data persistence decisions must favor long-term visibility over short-term performance. Memorial lines are not "old data to be cleaned up" - they are the fundamental value proposition.

### Guiding Principles

1. **Sacred First** — Every interaction honors the spiritual nature of prayer
2. **Living Over Static** — The map grows more meaningful with time, never resets
3. **Beauty Through Simplicity** — Elegant design that doesn't distract from purpose
4. **Privacy as Default** — Safe spaces for vulnerability
5. **Friction-Free Faith** — Remove all barriers between need and support
6. **Persistence as Purpose** — Memorial lines are features, not bugs
7. **Scale with Grace** — Architecture that grows without losing intimacy

---

## Target Audience

### Primary Personas

**The Vulnerable Seeker** (Sarah, 28)
- In a difficult season, needs prayer but uncomfortable sharing publicly
- Values anonymity but wants to be heard
- Pain Point: Feels alone, traditional church feels judgmental
- Motivation: Authentic connection without social pressure

**The Compassionate Neighbor** (Mike, 36)
- Actively looks for ways to serve community
- Prays regularly, wants to be more intentional
- Pain Point: Doesn't know what's happening in neighborhood
- Motivation: Make tangible difference through prayer

**The Faithful Intercessor** (Grace, 54)
- Committed prayer warrior
- Wants to "see" community needs visually
- Pain Point: Feels disconnected from real needs
- Motivation: Deepen prayer life with actionable focus

---

## Core Features

### 1. The Ethereal Map 🗺️

**Purpose:** Visually represent the living history of prayer across geography

**The "Living Map" Experience:**
When users first open PrayerMap, they encounter a map that immediately feels alive with spiritual activity. Unlike typical apps that show empty maps to new users, PrayerMap displays years of accumulated prayer connections, creating an instant sense of joining an active faith community.

**Key Elements:**
- Custom MapBox style ("Ethereal Dawn" theme)
- 🙏 emoji markers for each prayer
- Rainbow memorial lines connecting pray-ers to requests
- Preview bubbles on hover/tap
- Smooth zoom/pan interactions
- Cluster markers at high zoom levels

**Default Behavior:**
- Centered on user location
- 30-mile default radius
- Load up to 50 recent prayers + all memorial lines in view
- Show memorial lines from all time periods (no expiration)
- Refresh prayers on significant map movement
- Memorial lines persist across all sessions

**Visual Density Indicators:**
- **Light Activity:** Few scattered memorial lines = emerging prayer community
- **Moderate Activity:** Visible network of connections = active community
- **High Activity:** Rich tapestry of overlapping lines = mature prayer network

**New User First Impression Goal:**
"Wow, there's so much prayer happening here. I want to be part of this."

**How PrayerMap Differs from Other Map Apps:**

| Traditional Map Apps | PrayerMap (Living Map) |
|---------------------|------------------------|
| Show current/recent data | Show cumulative spiritual history |
| Clean up old data | Preserve all prayer connections |
| Prioritize relevance | Prioritize meaning and continuity |
| Empty map for new users | Rich tapestry immediately visible |
| Temporary interactions | Permanent spiritual memorials |
| Optimize for speed/recency | Optimize for emotional impact/belonging |
| Data as utility | Data as sacred record |

**Examples of "Living" vs "Static" Design:**

**❌ Static Map Thinking:** "Memorial lines older than 30 days should be hidden to improve performance"

**✅ Living Map Thinking:** "Memorial lines from 6 months ago show new users that this community has sustained prayer activity and is worth joining"

**❌ Static Map Thinking:** "Too many lines make the map cluttered"

**✅ Living Map Thinking:** "Many overlapping lines in an area tell a story - either high need or strong prayer coverage, both spiritually significant"

### 2. Prayer Markers 📍

**Marker States:**
- **Default:** 🙏 emoji, static
- **Prayed:** 🙏 with soft gold glow
- **New:** 🙏 with gentle pulse animation
- **Hover:** Scale 1.1x, show preview bubble

**Preview Bubble:**
- Glassmorphic card
- First 100 characters of prayer
- Distance from user
- Tap to open full detail

### 3. Prayer Detail Modal 📖

**Content:**
- Full prayer text
- Audio/video player (if applicable)
- Distance and time since posted
- Support count ("X people are praying")
- Anonymous or user name

**Primary Action:**
```
┌────────────────────────────────┐
│                                │
│   "Pray First. Then Press."   │
│                                │
└────────────────────────────────┘
```

**Interaction:**
1. User reads prayer
2. User prays silently
3. User presses button
4. 6-second animation plays
5. Support count increments
6. Memorial line appears on map

### 4. Prayer Animation Layer ✨

**The Showpiece Feature — 6 Seconds Total**

```
Phase 1 (0-1.5s):   Camera Movement
                    - Map pitches to 60°
                    - Zoom level decreases by 1
                    - Both locations visible

Phase 2 (1.5-4s):   Line Drawing
                    - Curved path draws from user to prayer
                    - Pulsing circles at both endpoints
                    - Rainbow gradient on line

Phase 3 (3-5s):     Spotlights
                    - Gold spotlight on user location
                    - Purple spotlight on prayer location
                    - Both fade up then down

Phase 4 (5-6s):     Return
                    - Camera returns to original position
                    - Line persists as memorial
                    - Modal closes
```

### 5. Memorial Lines (Prayer Connections) 🌈

**Purpose:** The heart of the "Living Map" - permanent visual testament to prayer connections

**Spiritual Significance:**
Memorial lines are not temporary UI elements but sacred records of compassion. Each line represents a moment when one human being paused to lift another in prayer. These connections form the spiritual geography of our communities, showing where love has been active.

**Technical Specifications:**
- Rainbow gradient stroke (2px)
- Curved quadratic Bezier path
- **Persist indefinitely** (no expiration - this is critical to living map concept)
- Update position as map moves
- Hover to see connection details
- Fade opacity slightly after 1 year (0.7) but remain visible
- Layer newer lines above older ones

**Tooltip on Hover:**
```
"[Name] prayed for [Requester]"
"[Time] ago"
"Part of [X] total prayers for this request"
```

**Why Memorial Lines Never Expire:**
1. **Spiritual Value:** Prayer doesn't have an expiration date - a prayer from 2 years ago blessed someone just as much as one from today
2. **Community Building:** New users see established prayer networks, encouraging participation
3. **Sacred Geography:** Locations gain spiritual significance through accumulated prayer history
4. **Visual Storytelling:** Dense networks of lines tell stories about community needs and responses
5. **Emotional Connection:** Users can revisit their past prayer connections, reinforcing the lasting impact of their spiritual investment

**Performance Considerations:**
- Lines more than 2 years old render at lower detail level
- Clustering algorithms for high-density areas
- Progressive loading based on zoom level
- Client-side caching for frequently viewed areas

**CRITICAL TECHNICAL REQUIREMENT:** Memorial lines must NEVER be filtered out or deleted based on age. They are the core feature that makes our map "living" rather than just "current."

### 6. Request Prayer Modal 🙏

**Input Types:**
- **Text** (required): Up to 500 characters
- **Audio** (optional, Phase 2): Up to 2 minutes
- **Video** (optional, Phase 2): Up to 90 seconds

**Options:**
- Post anonymously (toggle)
- Use current location (default)

**Flow:**
1. Select input type
2. Enter/record content
3. Toggle anonymous if desired
4. Submit
5. Show confirmation
6. Marker appears on map

### 7. Inbox Modal 📥

**Purpose:** View prayers received on your requests

**Tabs:**
- **Received** — Prayers others have sent
- **Sent** — Prayers you've sent to others

**Prayer Card:**
- Who prayed (or "Anonymous")
- Time ago
- Preview of original request
- Tap to expand

### 8. Settings ⚙️

**Options:**
- Notification radius (default: 30 miles)
- Push notifications (on/off)
- Account management (Sign in with Apple)
- Contact: contact@prayermap.net

---

## Design System: "Ethereal Glass"

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #4A90E2 | CTAs, links, user location |
| Primary Gold | #F5D76E | Highlights, prayer sent |
| Primary Purple | #9B59B6 | Accents, received prayers |
| Success Green | #4CAF50 | Answered prayer indicator |
| Background | #E8F4F8 | Base background |
| Text Primary | #333333 | Headlines, important text |
| Text Secondary | #666666 | Body text, descriptions |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Display | Cinzel | 700 | 32-48px |
| H1 | Cinzel | 600 | 24-32px |
| H2 | Cinzel | 400 | 20-24px |
| Body | Inter | 400 | 16px |
| Body Small | Inter | 400 | 14px |
| Button | Inter | 600 | 16px |
| Caption | Inter | 500 | 12px |

### Glassmorphic Effects

```css
/* Glass Strong — Modals, headers */
.glass-strong {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Glass Medium — Cards, inputs */
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* Glass Subtle — Hover states */
.glass-subtle {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
```

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tiny gaps |
| sm | 8px | Small gaps |
| md | 12px | Medium gaps |
| base | 16px | Default |
| lg | 20px | Large gaps |
| xl | 24px | Section padding |
| 2xl | 32px | Modal padding |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 8px | Small cards |
| md | 12px | Default cards |
| lg | 16px | Large cards |
| xl | 24px | Modals |
| full | 9999px | Buttons, avatars |

---

## Technical Architecture

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS 3+
- Framer Motion (animations)
- Zustand (state management)
- React Query (data fetching)
- MapBox GL JS v3

**Backend:**
- Supabase (PostgreSQL 15 + PostGIS)
- Supabase Auth (Sign in with Apple)
- Supabase Realtime (WebSocket subscriptions)
- AWS S3 (media storage)
- CloudFront (CDN)

**Hosting:**
- Vercel (frontend)
- Supabase (backend)
- AWS (media)

### Database Schema (Core Tables)

```sql
-- Users
users (
  user_id UUID PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  notification_radius_km INTEGER DEFAULT 48, -- 30 miles
  created_at TIMESTAMPTZ
)

-- Prayers
prayers (
  prayer_id BIGINT PRIMARY KEY,
  user_id UUID REFERENCES users,
  text_body TEXT NOT NULL,
  media_type ENUM('TEXT', 'AUDIO', 'VIDEO'),
  media_url TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  location GEOGRAPHY(Point, 4326),
  support_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ
)

-- Prayer Support (the "Pray First. Then Press." action)
prayer_support (
  support_id BIGINT PRIMARY KEY,
  prayer_id BIGINT REFERENCES prayers,
  user_id UUID REFERENCES users,
  created_at TIMESTAMPTZ,
  UNIQUE(prayer_id, user_id)
)

-- Notifications
notifications (
  notification_id BIGINT PRIMARY KEY,
  user_id UUID REFERENCES users,
  type ENUM('PRAYER_RECEIVED', 'RESPONSE_RECEIVED'),
  payload JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
)
```

### API Endpoints (Key)

```
POST /auth/signup           # Create account
POST /auth/login            # Sign in
POST /auth/refresh          # Refresh token

GET  /rpc/get_prayers_within_radius  # Geospatial query
POST /prayers               # Create prayer
GET  /prayers/:id           # Get prayer detail

POST /prayer_support        # Record "prayer sent"
GET  /notifications         # Get user notifications
```

### Geospatial Query

```sql
-- Get prayers within 30 miles (48km) of user
SELECT * FROM prayers
WHERE ST_DWithin(
  location::geography,
  ST_MakePoint($lng, $lat)::geography,
  48000  -- 48km in meters (30 miles)
)
AND status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 50;

-- CRITICAL: Get ALL memorial lines within view (no time limit)
-- This query supports the "Living Map" concept
SELECT 
  ps.support_id,
  ps.created_at,
  ps.user_id as prayer_giver_id,
  p.location as prayer_location,
  u.location as giver_location,
  p.is_anonymous,
  u.first_name
FROM prayer_support ps
JOIN prayers p ON ps.prayer_id = p.prayer_id
JOIN users u ON ps.user_id = u.user_id
WHERE 
  -- Prayer location within view
  ST_DWithin(
    p.location::geography,
    ST_MakePoint($lng, $lat)::geography,
    $radius_meters
  )
  OR
  -- Prayer giver location within view
  ST_DWithin(
    u.location::geography,
    ST_MakePoint($lng, $lat)::geography,
    $radius_meters
  )
-- NO created_at filter - show all memorial lines ever created
ORDER BY ps.created_at DESC;
```

### Living Map Architecture Principles

**Data Retention Policy:**
- Memorial lines: **NEVER DELETE** (infinite retention)
- Active prayers: 1 year then archive (still searchable)
- User locations: Retain as long as account exists
- Media files: 2 year retention minimum

**Performance Strategy:**
- Memorial lines use spatial indexing for fast rendering
- Progressive detail loading (older lines render with less detail)
- Client-side caching of frequently viewed areas
- Background pre-loading of adjacent map regions

**Database Design for Persistence:**
```sql
-- Memorial lines table optimized for long-term storage
memorial_lines (
  line_id BIGINT PRIMARY KEY,
  support_id BIGINT REFERENCES prayer_support,
  prayer_location GEOGRAPHY(Point, 4326),
  giver_location GEOGRAPHY(Point, 4326),
  created_at TIMESTAMPTZ,
  -- Spatial index for fast geospatial queries
  INDEX USING GIST (prayer_location),
  INDEX USING GIST (giver_location)
);

-- Partitioning strategy for performance at scale
-- Partition by year but NEVER drop old partitions
```

---

## User Flows

### Flow 1: First-Time User

```
1. Download/Open app
2. Loading screen (2s)
3. Map view loads (centered on location or default)
4. User IMMEDIATELY sees rich network of memorial lines + active prayers
   - Visual impact: "This place is spiritually active"
   - Emotional response: "I want to be part of this community"
5. User explores map, seeing prayer history spanning months/years
6. Taps marker → Prayer Detail Modal
7. Prompted to sign in to pray
8. Signs in with Apple
9. Can now pray and request prayers
10. User's first prayer creates their first memorial line
    - Instant belonging: their line joins the existing tapestry
```

**CRITICAL:** The first 5 seconds determine if users understand PrayerMap's unique value. They must see an active, living prayer community, not an empty map waiting for content.

### Flow 2: Request Prayer

```
1. User taps "Request Prayer" button
2. Request Prayer Modal opens
3. User types prayer (or records audio/video)
4. Toggles anonymous if desired
5. Taps "Submit"
6. Confirmation shown
7. Marker appears on map
8. Modal closes
```

### Flow 3: Pray for Someone

```
1. User taps prayer marker
2. Prayer Detail Modal opens
3. User reads/listens to prayer
4. User prays silently
5. User taps "Pray First. Then Press."
6. 6-second animation plays
7. Support count increments
8. Memorial line appears
9. Modal closes
10. Notification sent to prayer requester
```

### Flow 4: Check Inbox

```
1. User taps Inbox icon
2. Inbox Modal opens
3. User sees "Received" tab (default)
4. Prayers received for their requests
5. Can switch to "Sent" tab
6. See prayers they've sent to others
```

---

## Success Metrics

### North Star Metric
**Total Memorial Lines Created** — Measures the cumulative spiritual connections built over time

Unlike typical app metrics that focus on weekly/monthly activity, PrayerMap measures the growing tapestry of prayer connections. A memorial line created 2 years ago is just as valuable to the living map as one created today.

### Key Performance Indicators

| Metric | Target |
|--------|--------|
| Daily Active Users | Track growth |
| % Users Who Post Prayer | 30% |
| % Prayers Receiving Support | 50% |
| Avg Time to First Support | < 30 min |
| Return Rate (D7) | 20% |
| Animation Completion Rate | 95% |
| **Living Map Health Metrics** | |
| Memorial Lines Visible to New Users | > 100 in default view |
| Historical Prayer Connection Density | Growing over time |
| First-Session Memorial Line Creation Rate | > 60% |

### Technical Metrics

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Map Load Time | < 2s |
| API Response Time (p95) | < 300ms |
| Crash-Free Rate | 99.5% |

---

## Implementation Roadmap

### Phase 1: MVP (Week 1) ✅

**Goal:** Core loop working

- [ ] Map with prayer markers
- [ ] Prayer detail modal
- [ ] "Pray First. Then Press." action
- [ ] Request prayer (text only)
- [ ] Simple loading screen
- [ ] Sign in with Apple
- [ ] Deploy to Vercel

**Deliverable:** Working MVP on prayermap.net

### Phase 2: Growth (Weeks 2-4)

**Goal:** Enhanced experience

- [ ] Audio prayer recording
- [ ] Video prayer recording
- [ ] 6-second prayer animation
- [ ] Memorial lines (connections)
- [ ] Inbox with tabs
- [ ] Push notifications
- [ ] 3D map features

**Deliverable:** Full-featured web app

### Phase 3: Native (Months 2-3)

**Goal:** iOS app

- [ ] SwiftUI native app
- [ ] Apple Watch complication
- [ ] Siri integration
- [ ] Native push notifications
- [ ] App Store submission

**Deliverable:** iOS app in App Store

---

## Cost Projections

### MVP (Months 1-3)

| Service | Cost |
|---------|------|
| Supabase | $0 (free tier) |
| Vercel | $0 (hobby tier) |
| MapBox | $0 (50k loads free) |
| AWS S3 | $0 (5GB free tier) |
| Domain | $12/year |
| **Total** | **~$1/month** |

### Growth (5,000 users)

| Service | Cost |
|---------|------|
| Supabase Pro | $25/month |
| Vercel | $0 |
| MapBox | $0 |
| AWS S3 | $5/month |
| **Total** | **~$31/month** |

### Scale (50,000 users)

| Service | Cost |
|---------|------|
| Supabase Pro | $100/month |
| Vercel Pro | $20/month |
| MapBox | $100/month |
| AWS S3 | $30/month |
| **Total** | **~$250/month** |

---

## Security & Privacy

### Data Protection

- Location stored as geography (no addresses)
- Anonymous posting supported
- User can delete all data (GDPR compliant)
- No third-party tracking
- Media encrypted at rest

### Authentication

- Sign in with Apple (primary)
- JWT tokens with Supabase
- Row-Level Security (RLS) on all tables
- Automatic token refresh

### Content Moderation

- Community reporting (flag button)
- Manual review queue
- AI moderation (Phase 2, optional)
- Community Guidelines enforcement

---

## Accessibility

### Requirements

- WCAG 2.1 AA compliance
- VoiceOver support
- Dynamic Type support
- Keyboard navigation
- Focus management in modals
- Sufficient color contrast
- Touch targets ≥ 44px

### ARIA Implementation

- All buttons have aria-labels
- Modals have role="dialog" and aria-modal="true"
- Prayer markers have descriptive labels
- Form inputs have associated labels

---

## Out of Scope (Explicit)

The following are **not** part of PrayerMap:

- ❌ Monetization / payments
- ❌ Subscriptions
- ❌ Social features (follows, comments)
- ❌ Direct messaging
- ❌ Group prayers / circles
- ❌ Church integrations
- ❌ Gamification (streaks, badges)
- ❌ AI prayer generation
- ❌ Multi-language support (v1)

---

## Appendices

### A. Reference Documents

**Foundational (READ FIRST):**
- `ARTICLE.md` — **MANDATORY**: The Autonomous Excellence Manifesto - operational philosophy and methodology
- `CLAUDE.md` — **MANDATORY**: Project instructions and critical principles

**Technical Documentation:**
- `00-MASTER-HANDOFF-DOCUMENT.md` — Project overview
- `02-DESIGN-SYSTEM.md` — Design tokens
- `03-SCREEN-SPECIFICATIONS.md` — Pixel-perfect specs
- `05-INTERACTIONS-AND-ANIMATIONS.md` — Animation details
- `06-TECHNICAL-IMPLEMENTATION.md` — Code examples
- `prayermap_schema_v2.sql` — Database schema
- `prayermap_api_spec_v2.md` — API documentation

### B. Contact

- **Project:** PrayerMap
- **Contact:** contact@prayermap.net
- **Mission:** 100% Non-Profit Ministry

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 2025 | Initial PRD |
| 2.0 | Nov 2025 | AWS S3 for media, expanded design system |
| 2.1 | Nov 2025 | 1-week MVP timeline, 30-mile radius, 90s video |

---

# 🙏 This is Your Calling

Not a side project.  
Not a portfolio piece.  
Not a business.

**A ministry.**

Every line of code is a prayer.  
Every pixel serves the mission.  
Every interaction honors those in need.

---

**Let's build something sacred.**
