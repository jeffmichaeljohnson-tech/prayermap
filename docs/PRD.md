# PrayerMap — Product Requirements Document

**Version:** 2.2  
**Status:** Ready for Implementation  
**Last Updated:** November 29, 2025

---

**Product Name:** PrayerMap  
**Platform(s):** iOS (iPhone, iPad, Apple Watch), Android, Web @ prayermap.net  
**Minimum OS:** iOS 17  
**Developer:** jeffmichaeljohnson-tech  
**Design System:** https://github.com/jeffmichaeljohnson-tech/prayermap-design-system

---

## Overview

**PrayerMap** is a free, location-based spiritual platform that enables users to share prayer requests, respond to requests, chat, and support one another through a beautifully designed interactive map interface. The map is a "living map" that leaves memorial connection lines wherever prayer has been answered, leaving a network of prayers drawn on the map, providing a visual representation of prayer that "makes the invisible, visible". 

When a user logs into the app, they are immediately greeted by a map full of all requested prayers floating on the map as prayer hand emojis with a 3-word bubble preview just above the prayer hand emoji. Prayers can be requested or responded to by text, audio, and video. Users may opt to request prayer anonymously or respond anonymously. Prayers are quickly screened after sending for inappropriate content and if flagged are never posted or immediately removed. The same treatment is given to all correspondence whether it's a chat message, response, audio, video, etc. This keeps the PrayerMap community safe and free of bullying or hate speech.

**Core Value Proposition:** "Discover local prayer requests that would have otherwise gone unnoticed. PrayerMap provides opportunities to pray for your neighbors, community, and a stunning display of encouragement seeing that there is more prayer going on around your local community than you had ever thought. Now you can see where prayer is needed. Send prayer where you are."

**Mission:** 100% non-profit ministry focused on connecting people through prayer.

---

## 1. The Problem

Prayer, and being prayed for, is one of life's most meaningful things. The problem is it's invisible, and you have to trust the person who says they prayed for you actually did pray for you. This exchange usually happens verbally or in-person with another close friend or relative. This communication paradigm for something so meaningful is archaic. 

The solution is a digital platform called PrayerMap that maintains the sacred ritual of prayer (without over-socializing it), a platform that visualizes and memorializes all prayer activity and exchanges of encouragement in a shared master map called "Prayer Map". 

Another problem is that your neighbor or friend may need prayer and may not have told you due to the busyness of life or their troubles. PrayerMap creates an easy solution to quickly post your need for prayer without having to call and explain your struggles to so many people. 

Another problem is that sometimes it may be embarrassing to ask for prayer in this image-first cancel-culture we live in today. Posting an anonymous prayer may give encouragement to someone feeling alone, embarrassed, and isolated. Seeing the flurry of prayer activity on the PrayerMap will provide community in a reassuring way.

---

## 2. Motivation

Deliver the **fastest, cleanest, most beautiful animations, most interesting and captivating shared prayer map in the world**. Users can quickly create an account and instantly see the local prayer activity in their area. They may discover a neighbor a few streets away they never knew was sick, or struggling and in need of prayer. Now, with PrayerMap they can connect through the unselfish act of taking the time to pray, concentrate their thought, and invisible energy of gratitude and good will toward their neighbor. 

The mere thought of an active prayer map, changing in front of a user's eyes as people add prayer and respond to prayer, is beyond exciting. It's watching prayer for the first time in history.

---

## 3. Mission Statement

Create a digital sanctuary where people can authentically share burdens, receive support, and experience the power of community prayer—all while feeling safe, respected, and spiritually uplifted.

---

## 4. Guiding Principles

1. **Sacred First** — Every interaction honors the spiritual nature of prayer
2. **Beauty Through Simplicity** — Elegant design that doesn't distract from purpose
3. **Privacy if Desired** — Safe spaces for vulnerability and the option to make correspondence anonymous
4. **Friction-Free Faith** — Remove all barriers between need and support. A simple interface that reduces the number of steps to perform each act of faith
5. **Scale with Grace** — Architecture that grows while GAINING intimacy as all users update one shared graceful map of hope
6. **Living Map** — Every time a prayer request is made or responded to, the map changes for every user. It's a shared map accessed by every user, making it truly special. Your prayers and responses leave connection prayer memorial lines that can be hovered over or tapped to reveal a tooltip of the date of the action and who participated
7. **Positive Reinforcement through Animation and Connection** — Beautiful glass ethereal designs and unexpected animations that reward each user for their interactions with the app
8. **Data that Changes Lives** — Prayer data has never been gathered like this. Prayer activity should be gathered and organized in as many ways as possible for the administrator. This data will be able to be analyzed, processed, and compelling information will be shared with users about prayer in their local community, time of day, trends, growth, types of prayers answered, types of requests being made—this is just the tip of the iceberg

---

## 5. Target Audience

iPhone users interested in prayer (Phase 1), Android users interested in prayer (Phase 2). The website is already deployed at prayermap.net and is being utilized as a live testing ground for feature development, debugging, and animation testing.

---

## 6. Example Personas

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

### 1. The Prayer Map 🗺️

**Purpose:** Visually represent prayer needs across geography as well as all past and current prayer activity.

**Design:** Ethereal, animated, glasslike, angelic, spiritual, but minimalist.

**Key Elements:**
- Custom MapBox style ("Ethereal Dawn" theme)
- 🙏 emoji markers for each prayer
- Preview bubbles on hover/tap
- A "+" sign over multiple prayers at the same location (same location defined by the prayer emoji overlapping which makes the prayer below unclickable—solved by the plus sign)
- Smooth zoom/pan interactions
- Cluster markers at high zoom levels and remove the "+" as a practical matter
- Audio symbol above prayer emojis that are audio only, video symbol above prayer emojis that are video
- One-tap of the audio symbol or video symbol from the main map instantly triggers playback (lowest friction possible)
- Inbox where all prayer activity responses and conversations (chat feature) are accessible
- Live prayer updating—if a user is logged in and a prayer gets requested or responded to in their field of view, the user sees this live activity happening

**Default Behavior:**
- Centered on user location
- 50-mile default viewing radius
- Loads all prayer activity past and present from the living map
- User can hover over or tap on prayer connection lines to see the date of the action and who prayed for who
- User can pray for the same prayer multiple times, which adds a "+" and "Number of times" to the prayer line
- Prayer emoji icons and prayer bubbles intelligently resize and maintain practical beauty when user zooms out or in, with no distortions
- Users have option to mark their prayer request as answered or to delete their prayer request

**Notifications (Phase 2):**
- iOS and Android system notifications when someone within 25 miles (configurable) requests prayer
- "Prayer Buddy" notifications for out-of-area family/friends (v2.0)

---

### 2. Prayer Markers 📍

**Marker States:**
- **Default:** 🙏 emoji, static but gracefully floating over the location in a beautiful subtle animation
- **Prayed:** 🙏 with soft gold glow
- **New:** 🙏 with gentle pulse animation
- **Hover:** Scale 1.1x, show preview bubble

**Preview Bubble:**
- Glassmorphic card
- First 100 characters of prayer
- Distance from user
- Tap to open full detail

---

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
6. Memorial line appears on map (arcing animation, then lays flat as historical record)

---

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

---

### 5. Memorial Lines (Prayer Connections) 🌈

**Purpose:** Visual representation of prayer connections

**Specifications:**
- Rainbow gradient stroke (2px)
- Curved quadratic Bezier path originally, then lays flat on the map
- Persist for 1 year from creation (admin-configurable duration)
- Expired lines are soft-deleted (hidden, not destroyed) for policy flexibility
- Update position as map moves
- Hover to see connection details

**Multiple Prayers Display:**
- If user prayed multiple times, line shows "+2" (or count)
- Tooltip shows all dates prayed

**Tooltip on Hover:**
```
"[Name] prayed for [Requester]"
"[Time] ago"
```

---

### 6. Request Prayer Modal 🙏

**Input Types:**
- **Text** (required): Up to 500 characters
- **Audio** (Phase 2): Up to 2 minutes
- **Video** (Phase 2): Up to 90 seconds

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

---

### 7. Inbox Modal 📥

**Purpose:** View prayers received on your requests and conversations

**Tabs:**
- **Received** — Prayers others have sent for your requests
- **Sent** — Prayers you've sent to others
- **Conversations** — Chat threads (Phase 2)

**Prayer Card:**
- Who prayed (or "Anonymous")
- Time ago
- Preview of original request
- Tap to expand

---

### 8. Settings ⚙️

**Options:**
- Notification radius (default: 25 miles, range: 5-100 miles)
- Push notifications (on/off)
- Account management (Sign in with Apple)
- Contact: contact@prayermap.net
- Suggestion Box: Messages get sent to contact@prayermap.net
- Change Password

---

## Radius Settings (Standardized)

| Setting | Default | User Configurable | Notes |
|---------|---------|-------------------|-------|
| Map Viewing | 50 miles (80km) | No | System-controlled, loads all prayers in view |
| Notifications | 25 miles (40km) | Yes (5-100 miles) | Push notifications for new local prayers |

---

## Design System: "Ethereal Glass"

**Canonical Source:** https://github.com/jeffmichaeljohnson-tech/prayermap-design-system

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Heavenly Blue | #E8F4F8 | Background |
| Dawn Gold | #F7E7CE | Accents |
| Prayer Purple | #D4C5F9 | Primary actions |
| Pure White | #FFFFFF | Cards |
| Prayer Sent | #D4EDDA | Success/Support |
| Prayer Active | #4A90E2 | Active state |
| Text Primary | #2C3E50 | Headlines |
| Text Secondary | #7F8C8D | Body text |
| Text Muted | #95A5A6 | Timestamps |

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
  notification_radius_km INTEGER DEFAULT 40, -- 25 miles
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
  status ENUM('ACTIVE', 'ANSWERED', 'REMOVED') DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ
)

-- Prayer Support (allows multiple prayers per user per request)
prayer_support (
  support_id BIGINT PRIMARY KEY,
  prayer_id BIGINT REFERENCES prayers,
  user_id UUID REFERENCES users,
  created_at TIMESTAMPTZ
  -- NOTE: No UNIQUE constraint - same user can pray multiple times
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
PATCH /prayers/:id          # Mark as answered

POST /prayer_support        # Record "prayer sent"
GET  /notifications         # Get user notifications
```

### Geospatial Query

```sql
-- Get prayers within 50 miles (80km) of user
SELECT * FROM prayers
WHERE ST_DWithin(
  location::geography,
  ST_MakePoint($lng, $lat)::geography,
  80470  -- 80.47km in meters (50 miles)
)
AND status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 1000;
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

### Phase 1: MVP ✅

**Goal:** Core loop working

- [x] Map with prayer markers
- [x] Prayer detail modal
- [x] "Pray First. Then Press." action
- [x] Request prayer (text only)
- [x] Simple loading screen
- [x] Sign in with Apple
- [x] Deploy to Vercel

**Deliverable:** Working on prayermap.net

### Phase 2: Growth

**Goal:** Enhanced experience

- [ ] Audio prayer recording
- [ ] Video prayer recording
- [ ] 6-second prayer animation
- [ ] Memorial lines (connections)
- [ ] Inbox with tabs
- [ ] Push notifications
- [ ] 3D map features
- [ ] Chat/Response threads

**Deliverable:** Full-featured web app

### Phase 3: Native

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

- AI software screening of text, audio, and video for auto-removal (requires deep research for practical implementation)
- Community reporting (flag button)
- Manual review queue
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

The following are **not** part of PrayerMap v1:

- ❌ Monetization / payments
- ❌ Subscriptions
- ❌ Social features (follows, bios, profile pics)
- ❌ Direct messaging (beyond prayer responses)
- ❌ Group prayers / circles
- ❌ Church integrations
- ❌ Gamification (streaks, badges)
- ❌ AI prayer generation
- ❌ Multi-language support

---

## References

### Primary Source (Canonical)
- **Figma Design System:** https://github.com/jeffmichaeljohnson-tech/prayermap-design-system

### Design Documentation (`/docs/design/`)
- `00-DESIGN-OVERVIEW.md` — Project overview
- `02-DESIGN-SYSTEM.md` — Design tokens
- `03-SCREEN-SPECIFICATIONS.md` — Pixel-perfect specs
- `04-COMPONENT-LIBRARY.md` — Component specs
- `05-INTERACTIONS-AND-ANIMATIONS.md` — Animation details

### Technical Documentation (`/docs/technical/`)
- `IMPLEMENTATION.md` — Code examples
- `API-SPEC.md` — API documentation
- `DATABASE-SCHEMA.sql` — Database schema

### Contact

- **Project:** PrayerMap
- **Contact:** contact@prayermap.net
- **Mission:** 100% Non-Profit Ministry

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 2025 | Initial PRD |
| 2.0 | Nov 2025 | AWS S3 for media, expanded design system |
| 2.1 | Nov 2025 | 50-mile viewing radius, XCode development |
| 2.2 | Nov 2025 | Standardized radius settings, schema fix for multiple prayers, Figma repo as canonical source |

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
