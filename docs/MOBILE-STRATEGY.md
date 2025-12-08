# MOBILE-STRATEGY.md - Expo + React Native Universal App Strategy

> **PURPOSE:** Define the mobile development strategy for PrayerMap using Expo + React Native to build a universal app for iOS, Android, and Web from a single codebase.

> **Decision Date:** 2025-12-08
> **Status:** APPROVED - Skip Capacitor, go directly to React Native

---

## Executive Summary

**The Decision:** Skip Capacitor entirely and build PrayerMap's mobile experience using **Expo + React Native** from day one. This delivers "V2 quality" in our first mobile release with full native capabilities.

**Why This Matters:**
- Full native push notifications (background, silent, rich)
- 60 FPS animations with native performance
- Universal codebase: One code → iOS, Android, Web
- No throwaway Capacitor code
- Professional app store presence from launch

---

## Strategic Rationale

### Why Not Capacitor (WebView Approach)

| Limitation | Impact on PrayerMap |
|------------|---------------------|
| WebView animations | Can't achieve "wow" factor for memorial lines |
| Limited background execution | "Someone praying NOW" notifications unreliable |
| No silent push | Can't sync prayer data in background |
| Battery constraints | WebView drains battery faster |
| App store perception | WebView apps often rejected or poorly reviewed |

### Why Expo + React Native

| Capability | Benefit for PrayerMap |
|------------|----------------------|
| Native UI components | Buttery smooth 60 FPS animations |
| Full notification access | All notification types, background execution |
| React Native Web | Same components compile to web browser |
| EAS Build/Update | Over-the-air updates without app store review |
| Expo modules | Easy access to camera, location, haptics |
| Single codebase | Change once → updates everywhere |

---

## Phase Structure (Updated)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRAYERMAP RELEASE PHASES                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1: Web MVP                                                   │
│  ────────────────                                                   │
│  Status: ✅ COMPLETE                                                │
│  - Mapbox GL JS map with memorial lines                            │
│  - Supabase backend (auth, database, realtime)                     │
│  - Framer Motion animations                                         │
│  - PWA basics                                                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 2: Universal Mobile App (Expo + React Native)               │
│  ────────────────────────────────────────────────────              │
│  Status: 🚧 NEXT                                                    │
│  Platforms: iOS, Android, Web (universal codebase)                 │
│  Features:                                                          │
│    ✅ Memorial lines (Skia rendering)                               │
│    ✅ Real-time updates (<2 seconds)                                │
│    ✅ Full push notifications                                       │
│    ✅ Location-based prayer discovery                               │
│    ✅ 60 FPS native animations (Reanimated)                         │
│    ✅ Phone-sized web experience (Snapchat style)                   │
│    ❌ Drive mode (deferred to Phase 3)                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 3: Drive Feature                                             │
│  ──────────────────────                                             │
│  Status: 📋 PLANNED                                                 │
│  - Heads-up navigation with prayer overlay                          │
│  - Audio prayers while driving                                      │
│  - Voice-activated prayer submission                                │
│  - CarPlay / Android Auto integration                               │
│  See: DRIVE-FEATURE-SPEC.md                                         │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 4: Wearables & Widgets                                       │
│  ────────────────────────────                                       │
│  Status: 📋 FUTURE                                                  │
│  - Apple Watch app (prayer notifications, quick responses)          │
│  - iOS Widgets (prayer count, nearby activity)                      │
│  - Android Widgets                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Monorepo Structure

```
prayermap/
├── apps/
│   └── mobile/                    # Expo app (iOS, Android, Web)
│       ├── app/                   # Expo Router screens
│       ├── components/            # UI components (NativeWind)
│       ├── features/              # Feature-Sliced Design modules
│       └── app.json               # Expo config
│
├── packages/
│   ├── core/                      # Shared business logic
│   │   ├── prayers/               # Prayer CRUD operations
│   │   ├── notifications/         # Notification handlers
│   │   └── types/                 # TypeScript types
│   │
│   ├── api/                       # Supabase client
│   │   ├── client.ts              # Singleton Supabase instance
│   │   ├── hooks/                 # React Query hooks
│   │   └── realtime/              # Subscription handlers
│   │
│   └── ui/                        # Shared UI components
│       ├── Button/
│       ├── Card/
│       └── Map/                   # Map components
│
├── supabase/                      # Database (UNCHANGED)
│   ├── migrations/
│   └── functions/
│
└── turbo.json                     # Turborepo config
```

### Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Expo SDK 52+ | React Native with managed workflow |
| **Navigation** | Expo Router | File-based routing |
| **Styling** | NativeWind 4 | Tailwind CSS for React Native |
| **Animations** | Reanimated 4 | 60 FPS native animations |
| **Graphics** | React Native Skia | GPU-accelerated memorial lines |
| **Maps** | @rnmapbox/maps | Native Mapbox SDK wrapper |
| **State** | Zustand | Same as web |
| **Data** | TanStack Query | React Query for caching |
| **Backend** | Supabase | Auth, Database, Realtime (UNCHANGED) |
| **Notifications** | Expo Notifications | Full native push |
| **OTA Updates** | EAS Update | Code updates without app store |

### What Stays the Same (Zero Changes)

| System | Status |
|--------|--------|
| Supabase Database Schema | ✅ Unchanged |
| RLS Policies | ✅ Unchanged |
| Edge Functions | ✅ Unchanged |
| Authentication Flow | ✅ Unchanged |
| TypeScript Types | ✅ Shared via packages/core |
| Business Logic | ✅ Shared via packages/core |
| Realtime Subscriptions | ✅ Same Supabase channels |

### What Changes (UI Layer Only)

| From (Web) | To (React Native) |
|------------|-------------------|
| `react-dom` | `react-native` |
| `mapbox-gl` | `@rnmapbox/maps` |
| `framer-motion` | `react-native-reanimated` |
| CSS/Tailwind | NativeWind |
| `<div>` | `<View>` |
| `<span>` | `<Text>` |

---

## Notification System

### Full Native Capabilities (Phase 2)

| Notification Type | Description | Trigger |
|-------------------|-------------|---------|
| **Prayer Response** | "Someone prayed for your request" | Real-time |
| **Message Received** | "New message from [name]" | Real-time |
| **Nearby Prayer** | "New prayer request within 15 miles" | Background |
| **Praying NOW** | "Someone is praying for you right now!" | Real-time |
| **Prayer Answered** | "A prayer you supported was answered" | Event |
| **Prayer Milestone** | "Your prayer received 10 responses!" | Threshold |
| **Memorial Anniversary** | "1 year ago, this prayer was answered" | Scheduled |
| **Weekly Digest** | "12 prayers answered in your area" | Scheduled |
| **Admin Announcement** | Custom message from admin | Admin panel |

### Radius Settings

| Setting | Value |
|---------|-------|
| Default notification radius | 15 miles |
| Maximum notification radius | 25 miles |
| Minimum notification radius | 1 mile |

### Admin Notification Panel (Phase 2)

- Full notification builder UI
- Audience targeting (all users, radius, custom)
- Message types: Announcements, Maintenance, Spiritual
- Scheduling: One-time, Recurring, Time-zone aware
- Preview before send

---

## Animation Preservation Strategy

### Current Animations (Web - Framer Motion)

Must be preserved and enhanced in React Native:

1. **Prayer Pin Drop** - Bounce effect on marker placement
2. **Memorial Line Drawing** - Animated SVG path drawing
3. **Pulse Effect** - Concentric circles for active prayers
4. **Card Transitions** - Slide/fade for prayer cards
5. **Map Interactions** - Smooth pan/zoom
6. **Success Celebrations** - Confetti/particle effects
7. **Real-time Indicators** - Glowing edges, breathing animations

### Translation Guide

| Framer Motion | React Native Equivalent |
|---------------|------------------------|
| `motion.div` | `Animated.View` (Reanimated) |
| `animate={{ opacity: 1 }}` | `useAnimatedStyle()` |
| `variants` | Reanimated shared values |
| `AnimatePresence` | `entering`/`exiting` props |
| SVG paths | Skia Path |
| CSS transitions | `withTiming()`, `withSpring()` |

### Animation Development Tools

- **Rive** - AI-assisted animation creation
- **Lottie** - After Effects animations
- **Storybook** - Isolated component testing
- **Animation Inspector** - Performance profiling

---

## Web Experience (Phase 2)

### Phone-Sized Web (Snapchat Style)

The web version will display as a centered phone-sized frame:

```
┌──────────────────────────────────────────────────────────┐
│                    DESKTOP BROWSER                       │
│                                                          │
│         ┌─────────────────────────────────┐             │
│         │                                 │             │
│         │    PrayerMap                    │             │
│         │    ┌─────────────────────┐      │             │
│         │    │       MAP           │      │             │
│         │    │                     │      │             │
│         │    │    [Prayer Pins]    │      │             │
│         │    │                     │      │             │
│         │    └─────────────────────┘      │             │
│         │                                 │             │
│         │    [Prayer Cards]               │             │
│         │                                 │             │
│         └─────────────────────────────────┘             │
│                                                          │
│         "Download on App Store"                          │
│         "Get it on Google Play"                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Why Phone-Sized Web

1. **Consistency** - Same experience across all platforms
2. **Expectation Setting** - Users know this is a mobile app
3. **Development Efficiency** - One responsive size to maintain
4. **Marketing** - Drives app store downloads
5. **Expandable Later** - Can add desktop layout in future

### Browser Compatibility

React Native Web supports 90%+ of browsers:
- Chrome 51+ (98% of Chrome users)
- Firefox 54+ (97% of Firefox users)
- Safari 10+ (99% of Safari users)
- Edge 79+ (all modern Edge)

---

## Beta Testing Workflow

### iOS (TestFlight)

1. **Internal Testing** - Up to 100 testers, instant distribution
2. **External Testing** - Up to 10,000 testers, light review
3. **Build Distribution** - EAS Build → TestFlight automatically

### Android (Google Play)

1. **Internal Testing** - Instant, no review
2. **Closed Testing** - Invite-only groups
3. **Open Testing** - Public beta link

### Over-the-Air Updates (EAS Update)

After app store approval, code updates can be pushed instantly:

```bash
eas update --branch production
```

- No app store review for JS/TS changes
- Users get updates on next app launch
- Rollback capability if issues detected

---

## Migration Timeline

### Phase 2 Development Sequence

```
Week 1-2: Project Setup
├── Initialize Expo app in monorepo
├── Configure NativeWind
├── Set up Expo Router
└── Establish packages/core structure

Week 3-4: Core Infrastructure
├── Supabase client in packages/api
├── Authentication flow
├── Realtime subscription setup
└── Basic navigation

Week 5-6: Map Implementation
├── @rnmapbox/maps integration
├── Prayer pin rendering
├── Memorial line drawing (Skia)
└── Map interactions

Week 7-8: Features
├── Prayer creation flow
├── Prayer response flow
├── Notification system
└── Profile/settings

Week 9-10: Polish
├── Animation refinement
├── Performance optimization
├── Error handling
└── Accessibility

Week 11-12: Launch Prep
├── TestFlight/Play Store beta
├── Bug fixes from beta feedback
├── App store submissions
└── Launch
```

---

## Related Documentation

- **[ANIMATION-SPEC.md](./ANIMATION-SPEC.md)** - Detailed animation specifications
- **[DRIVE-FEATURE-SPEC.md](./DRIVE-FEATURE-SPEC.md)** - Phase 3 Drive mode specs
- **[LIVING-MAP-PRINCIPLE.md](./LIVING-MAP-PRINCIPLE.md)** - Core spiritual mission
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and ADRs
- **[PRD.md](./PRD.md)** - Product requirements

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-08 | Skip Capacitor, go React Native | Capacitor limitations block "wow" animations and full notifications |
| 2025-12-08 | Defer Drive to Phase 3 | Focus Phase 2 on core mobile experience |
| 2025-12-08 | Defer Apple Watch to Phase 4 | Prioritize primary platforms first |
| 2025-12-08 | 15 mile default radius | Balance relevance with not overwhelming users |
| 2025-12-08 | Phone-sized web | Consistency across platforms, drives app downloads |

---

**Last Updated:** 2025-12-08
**Version:** 1.0
**Author:** Claude (approved by user)
