# rules

PrayerMap is a location-based spiritual platform that connects people needing prayer with those willing to pray through an interactive living map interface, shared by all users, where all activity past and present is instantly visible to users, featuring glassmorphic design and cinematic animations. Features like text, posting (prayers), audio recording, and video recording should be equal or better than modern social media apps, with simple and super intuitive interfaces users are accustomed to using every day.

## Overview

This project's scope, features, and architecture must **strictly align with the Figma design system and included documentation (source of truth for all UX, design, and technical decisions).**

### Your Role & Engineering Ethos

**You are a senior full-stack engineer building an SLC (Simple, Lovable, Complete) React application with a ministry-first mindset. You prioritize the Ethereal Glass design system, Supabase simplicity, animations, positive reinforcement, a visually mesmerizing interactive prayer map, and a spiritually uplifting but performant user experience.**

### General Engineering Guidelines

- **Shared Components:** Reusable glassmorphic components must be used consistently across all views (shared `/components/ui/` + design tokens).
- **Code Splitting:** Keep files <200 lines; break long components (>50 lines of JSX) into smaller, purpose-driven units.
- **Post-Code Reflection:** After significant code, add a short reflection on scalability/maintainability and the next steps.
- **Minimal Dependencies:** Favor native solutions. Core stack: React 18, TypeScript, Vite, Tailwind, Supabase, MapBox, Framer Motion.
- **TypeScript Strict Mode:** All components must be fully typed with interfaces in `/types/`.

---

## Design System: "Ethereal Glass"

- **All UI must follow the Ethereal Glass design system:** Glassmorphic effects, heavenly colors, Cinzel + Inter typography, generous spacing.
- **Components must be split into clear, reusable units:** Refactor any component over ~100 lines. Shared elements must be reused everywhere.
- **Three Glassmorphic Variants:** `glass-strong` (modals, headers), `glass` (cards, inputs), `glass-subtle` (hover states).
- **Naming & File Structure:** Descriptive PascalCase for components, camelCase for hooks/utilities, one component per file.
- **Animation Consistency:** All animations use spring physics via Framer Motion with consistent timing.
- **Review & Refactor:** Regularly extract subcomponents for clarity.

### Color Palette (MUST USE)

```
Primary Colors:
--heavenly-blue:    #E8F4F8  (Background)
--dawn-gold:        #F7E7CE  (Accents)
--prayer-purple:    #D4C5F9  (Primary actions)
--pure-white:       #FFFFFF  (Cards)

Semantic Colors:
--prayer-sent:      #D4EDDA  (Success/Support)
--prayer-active:    #4A90E2  (Active state)
--text-primary:     #2C3E50  (Headers)
--text-secondary:   #7F8C8D  (Body text)
--text-muted:       #95A5A6  (Timestamps)

Legacy Tokens (still supported):
Primary Blue:       #4A90E2  (heavenly blue)
Primary Gold:       #F5D76E  (soft gold)
Primary Purple:     #9B59B6  (gentle purple)
Success Green:      #4CAF50  (answered prayer)
```

### Typography (MUST USE)

- **Display/Headers:** Cinzel (400, 600, 700)
- **Body/UI:** Inter (400, 500, 600, 700)

---

## Project Mandate

PrayerMap is a React 18 + TypeScript PWA with:

- **Map View** → tap marker → **Prayer Detail Modal** → "Pray First. Then Press." → **Prayer Animation** → Connection Line appears
- **Request Prayer** → text/audio/video → submit → marker appears on map
- **Inbox** → view prayers received for your requests, view responses to conversations
- **Settings** → notification radius, suggestion box, contact info

### Core User Journey

```
1. Launch → Loading Screen (simple fade, 2s)
2. Auth → Sign in with Apple (optional for viewing)
3. Map → Interactive map with prayer markers (🙏 emoji)
4. Discover → Tap markers to view prayer requests
5. Support → "Pray First. Then Press." with 6-second animation
6. Connection → Memorial lines appear (persist 1 year)
7. Community → View received prayers and responses in inbox
```

### Key Technical Decisions (FINAL)

- **Backend:** Supabase (PostgreSQL 15 + PostGIS, Auth, RLS)
- **Hosting:** Vercel (auto-deploy from GitHub)
- **Maps:** MapBox GL JS v3 (custom Ethereal Dawn style)
- **Media Storage:** AWS S3 with presigned URLs
- **State:** Zustand (lightweight, simple)
- **Data Fetching:** React Query (TanStack Query)

### Radius Settings (STANDARDIZED)

| Setting | Default | User Configurable | Notes |
|---------|---------|-------------------|-------|
| Map Viewing Radius | 50 miles (80km) | No (system) | All prayers loaded in view |
| Notification Radius | 25 miles (40km) | Yes (5-100 miles) | Push notifications for new prayers |

---

## Development Workflow

### Multi-Agent Orchestration
- **Ora Framework:** Claude serves as director of multi-agent orchestration for research, development, and debugging
- **Activity Recording:** Pinecone & Langsmith capture all agent activities and changes for analysis and workflow improvement

---

## Agent Best Practices (MUST-FOLLOW RULES)

### 1. **Simplicity > Abstraction**
Favor flat component structure, avoid over-engineering unless it's animation-driven (which is where we shine), avoid protocol overuse or "future‑proofing." No Redux, no complex state machines.

### 2. **Design Source of Truth**
All design/UX decisions must match the **Figma design system repository**:
- **Canonical Source:** https://github.com/jeffmichaeljohnson-tech/prayermap-design-system
- Local copies in `/docs/design/` for quick reference

### 3. **Database Simplicity**
Use the existing schema. 6 core tables: `users`, `prayers`, `prayer_responses`, `prayer_support`, `notifications`, `prayer_flags`. No schema changes without explicit approval.

### 4. **Component Consistency**
All components must use the design system tokens. No hardcoded colors, no inline styles for reusable patterns.

### 5. **Accessibility First**
Follow WCAG 2.1 AA. Support Dynamic Type, VoiceOver, keyboard navigation, focus management in modals.

### 6. **Non-Profit Ministry Focus**
This is 100% ministry, not commercial. No monetization code, no investor metrics, no growth hacking. Focus on spiritual impact.

### 7. **Performance Awareness**
- Target 60fps for all animations
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Throttle map updates to 16ms

---

## When in Doubt

Check documentation in this order:

1. **Figma Design System:** https://github.com/jeffmichaeljohnson-tech/prayermap-design-system
2. `/docs/design/02-DESIGN-SYSTEM.md` (visual decisions)
3. `/docs/design/05-INTERACTIONS-AND-ANIMATIONS.md` (behaviors)
4. `/docs/technical/IMPLEMENTATION.md` (code patterns)

Choose **the simpler, more spiritually uplifting option**.

---

## Explicit "DO NOT" List

- **DO NOT** add monetization, payments, or subscription logic.
- **DO NOT** add login/sync beyond Sign in with Apple + Supabase Auth.
- **DO NOT** introduce advanced settings beyond notification radius, unless authorized.
- **DO NOT** change the database schema without explicit approval.
- **DO NOT** use external state management (Redux, MobX, etc.).
- **DO NOT** add social features beyond prayer support (no public comments, likes, follows).
- **DO NOT** hardcode colors—always use design tokens.
- **DO NOT** skip TypeScript types or use `any`.
- **DO NOT** over-engineer for "future" features not in the PRD.
- **DO NOT** add user-facing analytics beyond what's in PRD (admin analytics are OK).

---

## "Why" (Guiding Philosophy)

PrayerMap is a *Simple, Lovable, Complete* ministry platform.

**Mission:** Create a digital sanctuary where people can authentically share burdens, receive support, and experience the power of community prayer.

**Values:**
1. **Sacred First** — Every interaction honors the spiritual nature of prayer
2. **Beauty Through Simplicity** — Elegant design that doesn't distract from purpose
3. **Privacy as Default** — Safe spaces for vulnerability
4. **Friction-Free Faith** — Remove all barriers between need and support
5. **Scale with Grace** — Architecture that grows without losing intimacy

Users should experience spiritual delight without clutter or confusion.

---

## References

### Primary Source (Canonical)
- **Figma Design System:** https://github.com/jeffmichaeljohnson-tech/prayermap-design-system
  - This is the source of truth for all visual design decisions
  - Contains exported design specs in Markdown format

### Design Documentation (`/docs/design/`)
- `00-DESIGN-OVERVIEW.md` — Project overview and design philosophy
- `02-DESIGN-SYSTEM.md` — Complete design tokens (colors, typography, spacing)
- `03-SCREEN-SPECIFICATIONS.md` — Pixel-perfect screen specs
- `04-COMPONENT-LIBRARY.md` — Reusable component specs
- `05-INTERACTIONS-AND-ANIMATIONS.md` — All animations and interactions

### Technical Documentation (`/docs/technical/`)
- `IMPLEMENTATION.md` — Code patterns and examples
- `PROJECT-STRUCTURE.md` — File organization
- `API-SPEC.md` — REST API documentation
- `DATABASE-SCHEMA.sql` — PostgreSQL + PostGIS schema

### External References
- MapBox GL JS: https://docs.mapbox.com/mapbox-gl-js/
- Supabase: https://supabase.com/docs
- Framer Motion: https://motion.dev/

---

## File Structure & Organization

Refactor or reorganize files as they become reusable or large.

- **Shared UI components** live in `/src/components/ui/` (Button, Input, etc.)
- **Feature components** live in `/src/components/` (PrayerMap, PrayerMarker, etc.)
- **Hooks** live in `/src/hooks/` (useAuth, usePrayers, etc.)
- **Types** live in `/src/types/` (prayer.ts, user.ts, etc.)
- **Utilities** live in `/src/utils/` (formatters, helpers)
- **Stores** live in `/src/stores/` (Zustand stores)
- **Styles** live in `/src/styles/` (globals.css with glassmorphic utilities)
- All files must be PascalCase for components, camelCase for utilities/hooks.
- Legacy/duplicate files must be removed.

### Project Tree

```
prayermap/
│
├── docs/
│   ├── RULES.md
│   ├── PRD.md
│   │
│   ├── design/                        # From Figma design system repo
│   │   ├── 00-DESIGN-OVERVIEW.md
│   │   ├── 02-DESIGN-SYSTEM.md
│   │   ├── 03-SCREEN-SPECIFICATIONS.md
│   │   ├── 04-COMPONENT-LIBRARY.md
│   │   └── 05-INTERACTIONS-AND-ANIMATIONS.md
│   │
│   └── technical/
│       ├── IMPLEMENTATION.md
│       ├── PROJECT-STRUCTURE.md
│       ├── API-SPEC.md
│       └── DATABASE-SCHEMA.sql
│
├── src/
│   ├── components/
│   │   ├── ui/                        # ShadCN-style components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Switch.tsx
│   │   │   └── GlassCard.tsx
│   │   │
│   │   ├── map/                       # Map-related components
│   │   │   ├── PrayerMap.tsx
│   │   │   ├── PrayerMarker.tsx
│   │   │   ├── PreviewBubble.tsx
│   │   │   └── PrayerConnection.tsx
│   │   │
│   │   ├── modals/                    # Modal components
│   │   │   ├── AuthModal.tsx
│   │   │   ├── PrayerDetailModal.tsx
│   │   │   ├── RequestPrayerModal.tsx
│   │   │   └── InboxModal.tsx
│   │   │
│   │   ├── animation/                 # Animation components
│   │   │   └── PrayerAnimationLayer.tsx
│   │   │
│   │   └── layout/                    # Layout components
│   │       ├── MapHeader.tsx
│   │       └── LoadingScreen.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePrayers.ts
│   │   ├── useGeolocation.ts
│   │   ├── useNotifications.ts
│   │   └── useMediaRecorder.ts
│   │
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── prayerStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/
│   │   ├── prayer.ts
│   │   ├── user.ts
│   │   └── map.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── mapbox.ts
│   │   └── constants.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── geolocation.ts
│   │   └── validation.ts
│   │
│   ├── styles/
│   │   └── globals.css                # Glassmorphic utilities
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.json
│
├── .env.local
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Animation Reference (Critical)

### Prayer Send Animation (6 seconds total)

```
Phase 1 (0-1.5s): Map camera pitches to 60°, zooms out
Phase 2 (1.5-4s): Line draws from user to prayer, circles pulse
Phase 3 (3-5s):   Dual spotlights (gold + purple) illuminate
Phase 4 (5-6s):   Camera returns to original position
```

### Modal Animations

```typescript
// Mobile: Slide up with spring
initial={{ y: "100%", opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
exit={{ y: "100%", opacity: 0 }}
transition={{ type: "spring", damping: 25, stiffness: 300 }}

// Desktop: Scale with fade
initial={{ scale: 0.95, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
exit={{ scale: 0.95, opacity: 0 }}
transition={{ duration: 0.2 }}
```

### Timing Constants

```typescript
const TIMING = {
  FAST: 150,      // Hover states
  NORMAL: 200,    // Default transitions
  MEDIUM: 300,    // Modals
  SLOW: 500,      // Large animations
  PRAYER: 6000,   // Prayer animation
};
```

---

## Environment Variables

```env
# MapBox
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# AWS S3 (for media uploads)
VITE_AWS_REGION=us-east-1
VITE_AWS_S3_BUCKET=prayermap-media

# Feature Flags
VITE_ENABLE_AUDIO=false    # Phase 2
VITE_ENABLE_VIDEO=false    # Phase 2
```

---

## Testing Requirements

- **Unit Tests:** Components with Vitest + React Testing Library
- **Integration Tests:** Critical user flows
- **Visual Tests:** Prayer animation timing
- **Accessibility Tests:** Keyboard navigation, screen reader

### Minimum Coverage

- All modals must be keyboard accessible
- All buttons must have aria-labels
- Focus must be trapped in open modals
- Prayer animation must maintain 60fps

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Map Load Time | < 2s |
| Modal Open Time | < 300ms |
| Animation Frame Rate | 60fps |
| Bundle Size (gzipped) | < 200KB |

---

## Security Requirements

- All API calls through Supabase RLS
- No client-side secrets except anon key
- Media uploads via presigned URLs only
- User location stored as geography (no addresses)
- Anonymous posting supported
- GDPR-compliant data deletion

---

## Launch Checklist

### Technical
- [ ] Database deployed and tested
- [ ] Auth flow working (signup, login, logout)
- [ ] All core features functional
- [ ] Mobile responsive
- [ ] PWA installable
- [ ] Performance optimized (<2s load)
- [ ] Error tracking configured

### Design
- [ ] Glassmorphic effects working with fallbacks
- [ ] Typography loading correctly (Cinzel + Inter)
- [ ] All animations smooth at 60fps
- [ ] Dark mode supported (future)
- [ ] Accessibility audit passed

### Content
- [ ] Community Guidelines written
- [ ] Privacy Policy written
- [ ] Contact: contact@prayermap.net in settings

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 2025 | Initial scope |
| 2.0 | Nov 2025 | AWS S3 for media, radius settings |
| 2.1 | Nov 2025 | Figma repo as canonical source, standardized radius |

---

# 🙏 Let's Build Something Sacred

This is more than an app—it's a digital sanctuary.

Every line of code is a prayer.  
Every pixel serves the mission.  
Every interaction honors those in need.
