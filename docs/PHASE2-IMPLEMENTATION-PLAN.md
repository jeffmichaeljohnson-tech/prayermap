# Phase 2 Implementation Plan: Universal Mobile App

> **Goal:** Launch PrayerMap on iOS App Store and Google Play Store with a universal Expo + React Native codebase.

> **Created:** 2025-12-08
> **Status:** PLANNING

---

## Overview

Phase 2 transforms PrayerMap from a web-only application to a universal mobile app available on iOS, Android, and Web from a single codebase using Expo + React Native.

### Success Criteria

- [ ] iOS app live on App Store
- [ ] Android app live on Google Play Store
- [ ] Feature parity with web MVP
- [ ] Push notifications working (15mi default, 25mi max radius)
- [ ] 60 FPS animations on all platforms
- [ ] Memorial lines rendering with Skia

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 52+ |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind 4 (Tailwind for RN) |
| Animations | React Native Reanimated 4 |
| Graphics | React Native Skia (memorial lines) |
| Maps | @rnmapbox/maps |
| State | TanStack Query + Zustand |
| Storage | SecureStore + AsyncStorage |
| Backend | Supabase (unchanged) |
| Builds | EAS Build + EAS Submit |
| Updates | EAS Update (OTA) |

---

## Project Structure

```
prayermap/
├── apps/
│   └── mobile/                 # Expo app
│       ├── app/                # Expo Router screens
│       │   ├── (tabs)/         # Tab navigator
│       │   │   ├── index.tsx   # Map tab
│       │   │   ├── inbox.tsx   # Inbox tab
│       │   │   └── profile.tsx # Profile tab
│       │   ├── prayer/
│       │   │   └── [id].tsx    # Prayer detail
│       │   ├── auth/
│       │   │   ├── login.tsx
│       │   │   └── signup.tsx
│       │   └── _layout.tsx     # Root layout
│       ├── components/         # UI components
│       ├── features/           # Feature modules
│       ├── hooks/              # Custom hooks
│       ├── lib/                # Utilities
│       └── assets/             # Images, fonts
├── packages/
│   ├── core/                   # Shared business logic
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Utility functions
│   │   └── constants/          # App constants
│   ├── api/                    # Supabase client
│   │   ├── client.ts
│   │   ├── prayers.ts
│   │   └── auth.ts
│   └── ui/                     # Shared components
│       ├── Button/
│       ├── Card/
│       └── Modal/
├── supabase/                   # Database (unchanged)
└── src/                        # Web app (legacy, Phase 1)
```

---

## Implementation Milestones

### Milestone 1: Project Setup (Foundation)

**Goal:** Bootable Expo app with navigation and Supabase connection.

#### Tasks

- [ ] **1.1** Initialize Expo project with TypeScript
  ```bash
  npx create-expo-app apps/mobile -t expo-template-blank-typescript
  ```

- [ ] **1.2** Configure monorepo with npm workspaces
  ```json
  // package.json (root)
  {
    "workspaces": ["apps/*", "packages/*"]
  }
  ```

- [ ] **1.3** Set up app.config.ts with environment variables
  - Dev/Preview/Production bundle IDs
  - Supabase URL and anon key
  - Mapbox token
  - EAS project ID

- [ ] **1.4** Configure EAS builds (eas.json)
  - Development profile (simulator)
  - Preview profile (internal testing)
  - Production profile (app stores)

- [ ] **1.5** Set up Expo Router navigation
  - Tab navigator (Map, Inbox, Profile)
  - Stack navigator for detail screens
  - Auth flow screens

- [ ] **1.6** Configure Supabase client for React Native
  - AsyncStorage for session persistence
  - SecureStore for tokens

- [ ] **1.7** Set up NativeWind
  - Install and configure
  - Port design tokens from web

**Deliverable:** App runs on iOS Simulator and Android Emulator with working navigation.

---

### Milestone 2: Authentication

**Goal:** Complete auth flow matching web experience.

#### Tasks

- [ ] **2.1** Email/password login screen
- [ ] **2.2** Sign up screen with email verification
- [ ] **2.3** Password reset flow
- [ ] **2.4** Google OAuth (Expo AuthSession)
- [ ] **2.5** Apple Sign In (iOS only)
- [ ] **2.6** Session persistence with SecureStore
- [ ] **2.7** Auth state management with Zustand
- [ ] **2.8** Protected route handling

**Deliverable:** Users can sign up, log in, and maintain session across app restarts.

---

### Milestone 3: Map & Prayer Display

**Goal:** Interactive map showing prayers with markers and clustering.

#### Tasks

- [ ] **3.1** Configure @rnmapbox/maps
  - Set access token
  - Configure download token for EAS builds

- [ ] **3.2** Implement base map view
  - Light style matching web
  - User location tracking
  - Camera controls

- [ ] **3.3** Prayer markers with custom components
  - Category-based marker styles
  - Floating animation (Reanimated)
  - Tap to select

- [ ] **3.4** Marker clustering for performance
  - Supercluster integration
  - Cluster tap to zoom

- [ ] **3.5** Location permission flow
  - Request foreground permission
  - Handle denied state gracefully

- [ ] **3.6** Prayer detail modal
  - Slide-up animation
  - Full prayer content
  - Pray button

**Deliverable:** Map displays prayers with smooth 60 FPS interactions.

---

### Milestone 4: Memorial Lines (Skia)

**Goal:** Render prayer connection lines with gradient animation.

#### Tasks

- [ ] **4.1** Set up React Native Skia
- [ ] **4.2** Calculate line paths from prayer to responder
- [ ] **4.3** Implement quadratic bezier curves
- [ ] **4.4** Add gold → blue → purple gradient
- [ ] **4.5** Animate line drawing with Reanimated
- [ ] **4.6** Optimize for many simultaneous lines
- [ ] **4.7** Handle map zoom/pan transformations

**Deliverable:** Memorial lines render beautifully matching web experience.

---

### Milestone 5: Prayer Creation

**Goal:** Users can create prayer requests.

#### Tasks

- [ ] **5.1** Create prayer form screen
  - Title input
  - Content textarea
  - Category picker
  - Anonymous toggle

- [ ] **5.2** Location picker (tap map or use current)
- [ ] **5.3** Form validation with Zod
- [ ] **5.4** Submit to Supabase
- [ ] **5.5** Success animation and confirmation
- [ ] **5.6** Optimistic UI update

**Deliverable:** Users can create prayers that appear on the map.

---

### Milestone 6: Prayer Response

**Goal:** Users can respond to prayers.

#### Tasks

- [ ] **6.1** "I Prayed" button with animation
- [ ] **6.2** Optional encouragement message
- [ ] **6.3** Response confirmation with haptic feedback
- [ ] **6.4** Memorial line creation animation
- [ ] **6.5** Real-time prayer count update

**Deliverable:** Full prayer response flow with visual feedback.

---

### Milestone 7: Inbox & Notifications

**Goal:** Users receive and view prayer activity.

#### Tasks

- [ ] **7.1** Inbox screen with response list
- [ ] **7.2** Pull-to-refresh
- [ ] **7.3** Push notification registration
  - Expo push token
  - Save to user_push_tokens table

- [ ] **7.4** Notification handlers
  - Foreground display
  - Background tap to navigate

- [ ] **7.5** Notification preferences screen
  - Radius slider (15-25 miles)
  - Category filters
  - Quiet hours

- [ ] **7.6** Badge count management

**Deliverable:** Users receive push notifications for prayer responses.

---

### Milestone 8: Profile & Settings

**Goal:** User account management.

#### Tasks

- [ ] **8.1** Profile screen
  - Display name
  - Email
  - Prayer statistics

- [ ] **8.2** Edit profile flow
- [ ] **8.3** Notification settings
- [ ] **8.4** Privacy settings
- [ ] **8.5** Sign out
- [ ] **8.6** Delete account flow
- [ ] **8.7** About / Terms / Privacy links

**Deliverable:** Complete user settings experience.

---

### Milestone 9: Polish & Performance

**Goal:** Production-ready quality.

#### Tasks

- [ ] **9.1** Splash screen configuration
- [ ] **9.2** App icon (all sizes)
- [ ] **9.3** Loading states and skeletons
- [ ] **9.4** Error boundaries
- [ ] **9.5** Offline handling
- [ ] **9.6** Performance profiling
- [ ] **9.7** Memory leak fixes
- [ ] **9.8** Accessibility audit (VoiceOver, TalkBack)

**Deliverable:** Polished, performant app ready for review.

---

### Milestone 10: App Store Submission

**Goal:** Live on iOS App Store and Google Play Store.

#### Tasks

- [ ] **10.1** App Store Connect setup
  - App listing
  - Screenshots (6.5", 5.5")
  - Description, keywords
  - Privacy policy URL

- [ ] **10.2** Google Play Console setup
  - Store listing
  - Screenshots
  - Content rating questionnaire
  - Data safety form

- [ ] **10.3** TestFlight beta
  - Internal testing
  - External beta testers

- [ ] **10.4** Play Store internal testing
- [ ] **10.5** Fix review feedback
- [ ] **10.6** Production release

**Deliverable:** Apps live on both stores.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Mapbox token exposure | Use download token for builds, public token for runtime |
| App Store rejection | Follow HIG, test on real devices, clear privacy policy |
| Performance issues | Profile early, use Reanimated for animations |
| Push notification failures | Test on real devices, handle permission denial |
| Memory issues with many markers | Implement clustering, virtualize lists |

---

## Testing Requirements

### Unit Tests
- All utility functions
- Zustand stores
- API client methods

### Component Tests
- Prayer card rendering
- Form validation
- Navigation flows

### E2E Tests (Detox)
- Login flow
- Create prayer
- Respond to prayer
- Notification handling

### Device Testing
- iPhone 12 mini (small screen)
- iPhone 15 Pro Max (large screen)
- Pixel 7 (Android reference)
- iPad (tablet layout)

---

## Definition of Done

A milestone is complete when:

1. [ ] All tasks checked off
2. [ ] Unit tests passing
3. [ ] E2E tests passing for critical flows
4. [ ] Tested on iOS device
5. [ ] Tested on Android device
6. [ ] No TypeScript errors
7. [ ] No console warnings
8. [ ] Performance acceptable (60 FPS, <100ms interactions)
9. [ ] Accessibility basics verified
10. [ ] Code reviewed and merged to develop

---

## Post-Launch

After initial release:

1. Monitor crash reports (Sentry/Datadog)
2. Respond to user reviews
3. OTA updates for bug fixes
4. Plan Phase 3 (Drive Feature)

---

**Last Updated:** 2025-12-08
**Next Review:** When starting Milestone 1
