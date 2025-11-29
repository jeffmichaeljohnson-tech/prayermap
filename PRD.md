# PrayerMap — Product Requirements Document

**Version:** 2.1  
**Status:** Ready for Implementation  
**Last Updated:** November 2025

---

## Executive Summary

**PrayerMap** is a location-based spiritual platform that enables users to share prayer requests and support one another through a beautifully designed interactive map interface.

**Core Value Proposition:** "See where prayer is needed. Send prayer where you are."

**Mission:** 100% non-profit ministry focused on connecting people through prayer.

---

## Product Vision

### Mission Statement
Create a digital sanctuary where people can authentically share burdens, receive support, and experience the power of community prayer—all while feeling safe, respected, and spiritually uplifted.

### Guiding Principles

1. **Sacred First** — Every interaction honors the spiritual nature of prayer
2. **Beauty Through Simplicity** — Elegant design that doesn't distract from purpose
3. **Privacy as Default** — Safe spaces for vulnerability
4. **Friction-Free Faith** — Remove all barriers between need and support
5. **Scale with Grace** — Architecture that grows without losing intimacy

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

**Purpose:** Visually represent prayer needs across geography

**Key Elements:**
- Custom MapBox style ("Ethereal Dawn" theme)
- 🙏 emoji markers for each prayer
- Preview bubbles on hover/tap
- Smooth zoom/pan interactions
- Cluster markers at high zoom levels

**Default Behavior:**
- Centered on user location
- 30-mile default radius
- Load up to 50 prayers initially
- Refresh on significant map movement

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

**Purpose:** Visual representation of prayer connections

**Specifications:**
- Rainbow gradient stroke (2px)
- Curved quadratic Bezier path
- Persist for 1 year from creation
- Update position as map moves
- Hover to see connection details

**Tooltip on Hover:**
```
"[Name] prayed for [Requester]"
"[Time] ago"
```

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
```

---

## User Flows

### Flow 1: First-Time User

```
1. Download/Open app
2. Loading screen (2s)
3. Map view loads (centered on location or default)
4. User sees prayer markers
5. Taps marker → Prayer Detail Modal
6. Prompted to sign in to pray
7. Signs in with Apple
8. Can now pray and request prayers
```

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
**Prayers Supported Per Week** — Measures engagement and impact

### Key Performance Indicators

| Metric | Target |
|--------|--------|
| Daily Active Users | Track growth |
| % Users Who Post Prayer | 30% |
| % Prayers Receiving Support | 50% |
| Avg Time to First Support | < 30 min |
| Return Rate (D7) | 20% |
| Animation Completion Rate | 95% |

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
