# CLAUDE.md - PrayerMap Project Instructions

> **READ THIS FIRST**: This file contains the most critical context and principles for the PrayerMap project.
> These principles must NEVER be forgotten and should guide EVERY decision you make.

> **📖 FOUNDATIONAL READING**: Before proceeding, you MUST read `ARTICLE.md` - The Autonomous Excellence Manifesto. This document defines the operational philosophy, research standards, quality gates (85%+ quality, 90%+ accuracy), and execution methodology that governs ALL our work. The principles in ARTICLE.md supersede and inform everything in this file.

---

## 📖 MANDATORY READING: ARTICLE.md

> **STOP. Before proceeding with ANY work, you MUST read [ARTICLE.md](./ARTICLE.md).**

**ARTICLE.md is the Autonomous Excellence Manifesto** — the philosophical and operational foundation for everything we build. It is:

- **The source of truth** for how we think, build, and win
- **Required daily reading** for all agents and workers
- **The benchmark** against which all decisions are measured
- **Non-negotiable** — every interaction must embody these principles

### Why ARTICLE.md Matters

ARTICLE.md captures:
1. **How We Think** — Pursuit of truth, world-class standards, speed-first execution
2. **Our Superpowers** — Autonomous AI workforce, omniscient memory, Ora framework
3. **Research Excellence** — Quality gates (85%+ quality, 90%+ accuracy, 95%+ docs)
4. **Operating Principles** — Validation before optimizing, parallel over sequential
5. **The North Star** — What PrayerMap truly is and our success criteria

**When in doubt, return to ARTICLE.md. It is the source of truth for how we operate.**

### The Core Mindset (from ARTICLE.md)

Every interaction should embody:
- **Relentless pursuit of truth** — Find the best in the world, study them, outproduce them
- **World-class as minimum standard** — Benchmark against Anthropic, Stripe, Google, Cursor
- **Speed without sacrificing quality** — 150+ hours of work in 7 hours through parallelization
- **Measurement before optimization** — Never assume, always measure
- **Parallel execution by default** — Run multiple agent tracks simultaneously
- **Complete transparency** — Radical honesty in capability assessment
- **Zero corners cut** — Premium infrastructure, no exceptions

---

## ⚠️ CRITICAL PRINCIPLES (NEVER FORGET THESE)

### PRINCIPLE 0: AUTOMATIC MULTI-AGENT WORKFLOW AT ALL TIMES

  /*
  MEMORY LOG:
  Topic: Automatic Multi-Agent Workflow Activation
  Context: User wants Claude to automatically recognize when to use Ora multi-agent workflows
  Decision: Auto-trigger Ora workflow for complex/multi-domain tasks
  Pattern Recognition:
    - 3+ distinct steps OR
    - Multiple technology domains OR  
    - Research + implementation phases OR
    - Multiple file types involved OR
    - User says "fix all" / "implement X" / "optimize"
  Response Template: "I'll use the Ora multi-agent workflow to..."
  Success Metric: No need for user to explicitly request multi-agent approach
  Mobile Notes: Especially important for mobile tasks (iOS + Android + web)
  Date: 2024-11-29
  */

### 🔍 PRINCIPLE 0.1: MANDATORY OBSERVABILITY INTEGRATION (2024 STANDARDS)

**CRITICAL**: All AI agents MUST implement world-class observability with 100% automated log monitoring. This follows 2024 industry standards including EU AI Act compliance, NIST AI Risk Management Framework, and enterprise observability best practices.

**MANDATORY for EVERY task:**

1. **Initialize Observability Context** - Start every task with logging context
```typescript
const { logPerformance, trackError, queryPatterns } = useObservability(agentRole);
```

2. **Query Past Failures First** - Always check for similar past issues
```typescript
const pastPatterns = await queryPatterns('failure', taskDescription);
```

3. **Track All Operations** - Monitor performance and errors continuously
```typescript
logPerformance('operation_name', duration);
trackError(error, fullContext);
```

4. **Automated Failure Recovery** - Attempt self-healing before escalation
```typescript
const autoRecovered = await trackError(error, context);
if (!autoRecovered) await escalateForHumanReview(context);
```

**Non-Negotiable Requirements:**
- OpenTelemetry-compliant structured logging for every operation
- Google SRE Golden Signals monitoring (latency, traffic, errors, saturation)
- AI-powered pattern recognition and anomaly detection for instant diagnosis
- Comprehensive audit trails for EU AI Act and regulatory compliance
- Real-time performance boundary enforcement with automated failure detection
- Self-healing procedures before human escalation
- 100% log coverage automation as implemented in `/src/lib/logging/`

**Observability System Integration:**
The world-class observability system is already implemented and integrated:
- **Structured Logging**: `/src/lib/logging/structuredLogger.ts`
- **Performance Monitoring**: `/src/lib/logging/performanceMonitor.ts` 
- **Error Tracking**: `/src/lib/logging/errorTracking.ts`
- **Log Analysis**: `/src/lib/logging/logAnalyzer.ts`
- **Monitoring Orchestrator**: `/src/lib/logging/monitoringOrchestrator.ts`
- **React Hooks**: `/src/hooks/useObservability.ts`
- **Dashboard**: `/src/components/MonitoringDashboard.tsx`

**Failure Recovery Protocol:**
When ANY agent encounters failure, the system automatically:
1. Captures full failure context with system state
2. Attempts pattern-based automated recovery
3. Logs to structured logging with AI analysis
4. Triggers real-time anomaly detection
5. Self-heals using proven recovery strategies
6. Escalates to human review only if auto-recovery fails

### 🔬 PRINCIPLE 1: RESEARCH-DRIVEN DEVELOPMENT

**ALWAYS check the MOST RECENT official technical documentation BEFORE making decisions.**

**FOUNDATION**: This principle directly implements "The Research Protocol" from `ARTICLE.md` - we identify world leaders, study primary sources, extract transferable patterns, validate empirically, and document everything. All research must meet the quality gates: 85%+ quality, 90%+ accuracy, with proper citations.

#### The Rule
```
BEFORE writing any code:
1. Identify the technology involved (React, Supabase, Capacitor, MapBox, etc.)
2. Search for the OFFICIAL documentation from the vendor
3. Read the CURRENT version's documentation (check version numbers!)
4. Understand the recommended patterns DEEPLY
5. ONLY THEN implement

NEVER rely on:
- Memory of how something "used to work"
- Outdated blog posts or tutorials
- Unverified Stack Overflow answers
- Generic AI knowledge without verification
```

#### Source Credibility Requirement

**APPROVED SOURCES ONLY:**
- ✅ Official vendor documentation (React.dev, Supabase docs, Capacitor docs, MapBox docs)
- ✅ Industry leaders (Apple, Google, Meta, Stripe, Vercel, etc.)
- ✅ World-class experts (Dan Abramov, Kent C. Dodds, etc.)
- ✅ Official GitHub repositories and issue trackers
- ✅ Authoritative technical books (O'Reilly, Manning, etc.)

**REJECTED SOURCES:**
- ❌ Random blog posts from unknown authors
- ❌ Outdated tutorials (check publish date!)
- ❌ Unverified Stack Overflow answers
- ❌ Medium articles without credentials
- ❌ ChatGPT/AI knowledge without official source verification
- ❌ "I think this will work" without research

#### Example: The RIGHT Way
```
User: "Add geolocation to the app"

WRONG Response:
"I'll use navigator.geolocation..." [implements immediately]

RIGHT Response:
1. Check: We're using Capacitor for mobile
2. Research: Read Capacitor Geolocation plugin docs (current version)
3. Discover: Native permissions required, web fallback available
4. Verify: Check iOS/Android permission requirements in official docs
5. Implement: Based on official patterns and best practices
```

#### Why This Matters
- PrayerMap deploys to iOS, Android, AND web
- One wrong assumption can break mobile builds
- Mobile app store rejections are EXPENSIVE in time
- Users trust us with spiritual content - reliability is sacred

---

### 📱 PRINCIPLE 2: iOS & ANDROID DEPLOYMENT

**Every decision must support mobile deployment via Capacitor. If it works on web but breaks mobile, IT'S WRONG.**

#### The Mobile-First Checklist

Before implementing ANY feature:
- [ ] Will this work on iOS Safari?
- [ ] Will this work on Android Chrome?
- [ ] Does this require native permissions?
- [ ] Is there a Capacitor plugin for this?
- [ ] Have I tested the web fallback?
- [ ] Will Apple/Google approve this?

#### Common Mobile Gotchas

**DON'T:**
- ❌ Use web-only APIs without checking Capacitor support
- ❌ Assume browser geolocation works the same on mobile
- ❌ Use file system APIs without Capacitor filesystem plugin
- ❌ Implement features that violate App Store guidelines
- ❌ Use CSS that only works in desktop browsers
- ❌ Forget about touch gestures vs mouse events
- ❌ Ignore safe area insets (notches, home indicators)

**DO:**
- ✅ Check `Capacitor.isNativePlatform()` before using native features
- ✅ Request permissions properly using Capacitor plugins
- ✅ Test on actual iOS and Android devices
- ✅ Use Capacitor plugins for camera, geolocation, storage, etc.
- ✅ Consider touch target sizes (minimum 44x44 points on iOS)
- ✅ Test with poor network connections
- ✅ Handle app backgrounding/foregrounding

#### Verification Commands
```bash
# After ANY change that might affect mobile:
npm run build && npx cap sync

# Test on iOS
npx cap open ios

# Test on Android
npx cap open android
```

#### Critical Question
**Before shipping ANY feature, ask:**
"Will this work perfectly when a user on an iPhone in rural America with spotty connection opens the PrayerMap app?"

---

### ✨ PRINCIPLE 3: LIVING, BREATHING APP

**PrayerMap must feel ALIVE. Fast. Animated. Interactive. This differentiates us from every other prayer app.**

#### The "Living" Quality Standards

**PERFORMANCE (Non-Negotiable):**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 2s
- Map load time: < 1s
- Button response: < 100ms
- Scroll: 60fps smooth
- Animation: 60fps or don't ship

**ANIMATION (Tasteful Motion Throughout):**
```typescript
// Every interaction should have motion
// Use Framer Motion for all animations

// Example: Prayer card entrance
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
>
  <PrayerCard />
</motion.div>

// Guidelines:
- Enter animations: 300-400ms
- Exit animations: 200-300ms
- Micro-interactions: 100-200ms
- Use easing: "easeOut", "easeInOut"
- Prefer transforms over position changes (GPU accelerated)
```

**INTERACTIVITY (Responds to Every Touch):**
- Every button press gives haptic feedback (mobile)
- Every state change is visible
- Loading states are beautiful, not boring spinners
- Gestures feel natural (swipe, pinch, drag)
- Touch ripple effects on important actions
- Hover states on desktop (but don't rely on them)

#### Examples of "Living"

**Prayer Submission:**
```
BAD: Click button → spinner → success message
GOOD: Touch button → haptic feedback → button morphs into loading state →
      gentle pulse animation → success checkmark animates in →
      confetti/sparkle effect → prayer appears on map with entrance animation
```

**Map Interaction:**
```
BAD: Click marker → popup appears
GOOD: Tap marker → marker gently pulses → card slides up from bottom →
      content fades in → background blurs subtly
```

**Prayer Feed Scroll:**
```
BAD: Infinite scroll, items just appear
GOOD: Pull down → gentle resistance → release → smooth refresh animation →
      new items cascade in one by one with stagger
```

#### Implementation Checklist
- [ ] Does this feel FAST? (measure with Lighthouse)
- [ ] Does this feel SMOOTH? (60fps animations)
- [ ] Does this RESPOND to touch? (feedback within 100ms)
- [ ] Does this DELIGHT? (tasteful, meaningful animations)

---

### 🎯 PRINCIPLE 4: MINIMAL STEPS UX

**REDUCE user steps for everything. Count the taps/clicks required. Fewer is ALWAYS better.**

#### The Step-Counting Rule

Before implementing ANY user flow:
1. Write out each step required
2. Count the taps/clicks/form fields
3. Challenge yourself: Can I remove ONE step?
4. If no, why not? Write justification.
5. Repeat until you can't remove more

#### Examples: Before & After

**Posting a Prayer (BEFORE - 8 steps):**
```
1. Open app
2. Find "Post Prayer" button
3. Click button
4. Fill out title field
5. Fill out description field
6. Select category dropdown
7. Click submit
8. Confirm location popup
Total: 8 steps
```

**Posting a Prayer (AFTER - 4 steps):**
```
1. Open app (defaults to quick-post modal if location enabled)
2. Speak or type prayer (one field, AI extracts title)
3. Tap post (category auto-detected, location auto-captured)
4. Optional: Toggle anonymous (if desired)
Total: 4 steps (50% reduction!)
```

**Sending Prayer Support (BEFORE - 5 steps):**
```
1. See prayer on map
2. Click marker
3. Read prayer
4. Click "Pray" button
5. Write prayer response
Total: 5 steps
```

**Sending Prayer Support (AFTER - 2 steps):**
```
1. Tap prayer marker (full detail in preview)
2. Tap "I'm Praying" (auto-sends notification, optional message)
Total: 2 steps (60% reduction!)
```

#### Friction Points to Eliminate

**Forms:**
- ❌ Don't ask for information you can infer
- ❌ Don't make fields required unless absolutely necessary
- ❌ Don't use dropdowns if there are < 5 options (use radio buttons)
- ✅ Use smart defaults
- ✅ Auto-fill from context (location, time, previous prayers)
- ✅ Validate inline, not on submit

**Navigation:**
- ❌ Don't hide features in menus if they're frequently used
- ❌ Don't require login for browsing
- ✅ Use bottom tab bar for primary actions
- ✅ Make "back" always available
- ✅ Remember user's last location/view

**Authentication:**
- ❌ Don't force sign-up to browse prayers
- ❌ Don't ask for email AND password if magic link works
- ✅ Allow anonymous prayer posting
- ✅ Use biometric auth (Face ID, Touch ID)
- ✅ Keep sessions long (30 days)

#### Measurement

Track these metrics:
- Time to first prayer view: < 3 seconds
- Time to post prayer: < 30 seconds
- Time to send support: < 10 seconds
- Form abandonment rate: < 5%

---

### 📚 PRINCIPLE 5: QUERY MEMORY BEFORE DECISIONS

**Before making ANY significant decision, query the memory system to learn from past decisions.**

**CRITICAL**: This principle directly implements the "Omniscient Memory" superpower from `ARTICLE.md`. We use multiple memory systems as defined in the Autonomous Excellence Manifesto - Pinecone vectors, conversation search, and project knowledge search must ALL be consulted before decisions.

#### The Memory System (Multi-Layer Integration per ARTICLE.md)

PrayerMap uses multiple memory systems as outlined in our foundational methodology:
- **Pinecone** — 2,400+ vectors of conversations, docs, and code
- **PostgreSQL** — Persistent state with optimized performance  
- **LangSmith** — Agent performance tracking
- **Cursor conversation sync** — Every 5 minutes to Pinecone

Legacy Context (PrayerMap-specific):
- Past architectural decisions
- Bug fixes and their solutions
- Performance optimizations
- Failed experiments (what NOT to do)
- Successful patterns

#### How to Use Memory

**Before implementing:**
```bash
# Query memory for relevant past decisions
# Example: Planning authentication flow

Query: "authentication social login mobile"
Results:
- Decision: Used Supabase Auth with Apple/Google
- Reason: Required for App Store, built-in security
- Gotcha: Android requires SHA-256 fingerprint setup
- Don't: Don't implement custom JWT - security risk
```

**When solving bugs:**
```bash
# Check if this was solved before
Query: "map markers not loading iOS"
Results:
- Issue: MapBox GL incompatibility with WKWebView
- Solution: Updated MapBox version to 3.x
- Prevention: Test iOS specifically after MapBox updates
```

#### Memory Logging Requirements

**ALWAYS log these to memory:**
- Architectural decisions ("Why did we choose X over Y?")
- Mobile-specific discoveries ("iOS requires permission X")
- Performance optimizations ("Lazy loading reduced load time by 40%")
- Failed approaches ("Tried X, but it broke Y")
- Security considerations ("Never store Z in localStorage")

**Format for memory logs:**
```typescript
// When making a significant decision, document it:
/*
MEMORY LOG:
Decision: Chose Zustand over Redux for state management
Context: Need lightweight global state for auth and preferences
Reasoning:
  - Zustand: 1.3kb vs Redux: 6.5kb
  - Simpler API, less boilerplate
  - Better TypeScript support
  - Sufficient for our scale
Alternatives Considered: Redux, Jotai, Recoil
Mobile Impact: Smaller bundle = faster mobile load
Date: 2024-11-29
*/
```

---

## 🚀 Project Overview

### What is PrayerMap?

PrayerMap is a location-based spiritual platform that enables users to share prayer requests and support one another through a beautifully designed map interface. It's a sacred digital sanctuary where people can authentically share burdens, receive support, and experience the power of community prayer.

**Live Site:** https://prayermap.net

**Core Value Proposition:** "See where prayer is needed. Send prayer where you are."

### Technology Stack

**Frontend:**
- React 19 + TypeScript 5.9
- Vite 7 (build tool)
- TailwindCSS 4 (styling)
- Radix UI (components)
- Framer Motion (animations)
- MapBox GL JS v3 (maps)

**State Management:**
- Zustand (global state - auth, preferences)
- React Query (server state - data fetching, caching)
- React Context (auth context only)

**Backend:**
- Supabase (PostgreSQL 15 + PostGIS + Auth + Storage + Realtime)
- Row Level Security (RLS) for data protection
- Edge Functions for serverless operations

**Mobile:**
- Capacitor (iOS & Android wrapper)
- Native plugins: Camera, Geolocation, Push Notifications, Haptics

**Deployment:**
- Vercel (frontend)
- Supabase Cloud (backend)
- TestFlight (iOS beta)
- Google Play Internal Testing (Android beta)

### Project Structure

```
prayermap/
├── src/                        # Main React application
│   ├── components/             # React components
│   │   ├── ui/                # Radix UI base components
│   │   ├── PrayerCard.tsx     # Feature components
│   │   └── ...
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePrayers.ts
│   │   └── ...
│   ├── services/              # API/data services
│   │   ├── prayerService.ts
│   │   ├── userService.ts
│   │   └── storageService.ts
│   ├── lib/                   # Utilities
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── types/                 # TypeScript definitions
│   │   ├── prayer.ts
│   │   └── database.ts
│   ├── App.tsx                # Root component
│   └── main.tsx               # Entry point
├── admin/                      # Admin dashboard (separate app)
│   └── src/                   # Same structure as main
├── supabase/                   # Database migrations & seeds
│   ├── migrations/
│   └── functions/             # Edge functions
├── ios/                        # iOS native project
├── android/                    # Android native project
├── docs/                       # Documentation
├── .cursor/                    # Cursor IDE configuration
│   └── rules/                 # AI coding rules (.mdc files)
└── tests/                      # Playwright tests
```

---

## 📋 Quick Commands

### Development
```bash
# Install dependencies
npm install
cd admin && npm install

# Start development server
npm run dev              # Main app on http://localhost:5173
cd admin && npm run dev  # Admin on http://localhost:5174

# Build for production
npm run build            # Outputs to dist/
npm run preview          # Preview production build

# Type checking
npx tsc --noEmit        # Check TypeScript errors

# Linting
npm run lint            # Run ESLint
```

### Mobile Development
```bash
# Sync web assets to native projects
npm run build && npx cap sync

# Open in native IDEs
npx cap open ios         # Opens Xcode
npx cap open android     # Opens Android Studio

# Live reload on device (requires setup)
npx cap run ios --livereload
npx cap run android --livereload
```

### Testing
```bash
# Run all tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test tests/prayers.spec.ts

# Debug mode
npx playwright test --debug
```

### Database
```bash
# Connect to local Supabase
npx supabase start

# Run migrations
npx supabase db push

# Reset database
npx supabase db reset
```

---

## 🏗️ Architecture

### Design System: "Ethereal Glass"

**Visual Language:**
- Glassmorphic design with soft, heavenly aesthetics
- Gentle animations that feel spiritual and calming
- Generous white space
- Depth through blur and transparency

**Color Palette:**
```css
/* Primary Colors */
--heavenly-blue: #E8F4F8;    /* Soft sky background */
--dawn-gold: #F7E7CE;        /* Warm accents */
--prayer-purple: #D4C5F9;    /* Spiritual accent */

/* Text Colors */
--text-primary: #2C3E50;     /* Dark slate blue */
--text-secondary: #7F8C8D;   /* Muted gray */

/* Glassmorphic Effects */
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

**Typography:**
- Display: Cinzel (serif) for headings - spiritual, elegant
- Body: Inter (sans-serif) for content - clean, readable
- Scale: Tailwind's default type scale

### State Management Philosophy

**Three-Tier Approach:**

1. **React Query** (Server State)
   - All data from Supabase
   - Automatic caching, refetching, invalidation
   - Optimistic updates

2. **Zustand** (Global Client State)
   - User preferences (theme, language)
   - UI state that crosses components
   - Map viewport state

3. **React State** (Local Component State)
   - Form inputs
   - Toggle states
   - Temporary UI state

### Data Flow

```
User Action → Service Function → Supabase API → React Query Cache → UI Update
                                                      ↓
                                                Zustand Store (if global state)
```

### Authentication Flow

```
1. User opens app
2. AuthContext checks for existing session (Supabase)
3. If session exists → Load user data → Grant access
4. If no session → Allow anonymous browsing
5. User wants to post prayer → Prompt sign in
6. Sign in via Supabase Auth (Email, Google, Apple)
7. Session persisted in localStorage
8. Auto-refresh tokens on expiry
```

---

## 🧠 Memory System

### Pinecone Vector Database Integration

PrayerMap uses Pinecone to create institutional memory of:
- Architectural decisions and their reasoning
- Bug fixes and solutions
- Performance optimizations
- Failed experiments (anti-patterns)
- Mobile-specific discoveries
- Security considerations

### Logging Requirements

**When to log to memory:**
- Making an architectural decision
- Solving a complex bug
- Discovering a mobile platform quirk
- Optimizing performance
- Implementing a security measure
- Finding a better pattern

**How to log:**
```typescript
// In code comments for important decisions
/*
MEMORY_LOG:
Topic: [Brief title]
Context: [What problem were we solving?]
Decision: [What did we choose?]
Reasoning: [Why this over alternatives?]
Alternatives: [What else did we consider?]
Impact: [Performance, bundle size, UX, etc.]
Mobile Notes: [iOS/Android specific considerations]
Date: [YYYY-MM-DD]
*/
```

---

## 👥 Agent Roles

When using multiple AI agents, follow these specialized roles:

### 1. Planner Agent
**Responsibilities:**
- Break down complex features into tasks
- Create implementation plans
- Identify dependencies
- Estimate complexity
- Query memory for similar past work

**Before planning, ask:**
- Has this been done before?
- What are the mobile implications?
- How many user steps will this require?
- What's the performance impact?

### 2. Frontend Agent
**Responsibilities:**
- React component development
- UI/UX implementation
- Framer Motion animations
- TailwindCSS styling
- Form handling with React Hook Form

**Checklist:**
- [ ] Component is responsive (mobile-first)
- [ ] Animations run at 60fps
- [ ] Accessibility attributes present
- [ ] Loading/error states handled
- [ ] TypeScript types are strict

### 3. Backend Agent
**Responsibilities:**
- Supabase queries and RPC functions
- Database schema design
- Row Level Security policies
- Edge functions
- Storage configuration

**Checklist:**
- [ ] RLS policies tested
- [ ] Queries are optimized (use EXPLAIN)
- [ ] PostGIS queries for location features
- [ ] Error handling comprehensive
- [ ] Security review complete

### 4. Mobile Agent
**Responsibilities:**
- Capacitor plugin integration
- iOS/Android specific code
- Native permissions
- Platform-specific UI adjustments
- App store compliance

**Checklist:**
- [ ] Works on both iOS and Android
- [ ] Permissions requested properly
- [ ] Native features have web fallbacks
- [ ] Touch targets are 44x44 minimum
- [ ] Safe areas respected (notch, home indicator)

### 5. Research Agent
**Responsibilities:**
- Finding official documentation
- Verifying source credibility
- Researching best practices
- Investigating new technologies
- Fact-checking implementations

**Process:**
1. Identify technology
2. Find official docs
3. Verify version compatibility
4. Check for mobile caveats
5. Report findings with sources

### 6. Archivist Agent
**Responsibilities:**
- Documenting decisions
- Updating memory logs
- Maintaining README files
- Writing migration guides
- Creating onboarding docs

**Format:**
- Clear, concise language
- Examples for complex topics
- Links to official docs
- Date stamps for time-sensitive info

### 7. Testing Agent
**Responsibilities:**
- Writing Playwright tests
- Manual testing on devices
- Performance testing
- Accessibility audits
- Security testing

**Coverage goals:**
- Critical user flows: 100%
- Component interactions: 80%
- Edge cases: Known issues covered

### 8. Reviewer Agent
**Responsibilities:**
- Code review for quality
- Security audit
- Performance review
- Mobile compatibility check
- UX review (step counting)

**Review checklist:**
- [ ] Follows 5 critical principles
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] Mobile tested
- [ ] Documentation updated

---

## ✅ Before ANY Decision Checklist

Use this EVERY time before implementing a feature or making a change:

### 1. Query Memory
```bash
# Search for relevant past decisions
- "Has this been done before?"
- "Were there issues with this approach?"
- "What patterns have worked?"
```

### 2. Research Official Documentation
```bash
- What technology is involved?
- What does the official docs say?
- What version are we using?
- Are there mobile-specific considerations?
```

### 3. Verify Source Credibility
```bash
- Is this from official documentation?
- Is this from a trusted industry leader?
- Is this current (not outdated)?
- Can I verify this independently?
```

### 4. Consider Mobile Impact
```bash
- Will this work on iOS?
- Will this work on Android?
- Do I need native permissions?
- Is there a Capacitor plugin?
- What's the web fallback?
```

### 5. Consider Animation/Interaction Impact
```bash
- Does this feel alive?
- Is the performance 60fps?
- Are transitions smooth?
- Is there haptic feedback?
- Does it respond instantly to touch?
```

### 6. Count User Steps Affected
```bash
- How many steps does the user take?
- Can I reduce by one step?
- What's the friction point?
- Is each step necessary?
- Can I automate/infer anything?
```

---

## 📁 Key Files to Know

### Documentation
- **ARTICLE.md** - **MANDATORY READING** - The Autonomous Excellence Manifesto (read daily)
- **CLAUDE.md** (this file) - Core project instructions
- **AGENTS.md** - Detailed agent guidelines and conventions
- **README.md** - Project overview and setup
- **PRD.md** - Product requirements (comprehensive)
- **docs/technical/API-SPEC.md** - API documentation
- **docs/archive/DEPLOYMENT_INSTRUCTIONS.md** - How to deploy

### Configuration
- **package.json** - Dependencies and scripts
- **vite.config.ts** - Vite build configuration
- **tsconfig.json** - TypeScript configuration
- **tailwind.config.js** - Design system tokens
- **capacitor.config.ts** - Mobile app configuration

### Database
- **prayermap_schema_v2.sql** - Database schema (source of truth)
- **supabase/** - Migrations and edge functions

### Code Entry Points
- **src/main.tsx** - Application entry point
- **src/App.tsx** - Root React component
- **src/lib/supabase.ts** - Supabase client initialization
- **src/contexts/AuthContext.tsx** - Authentication state

---

## 💎 What Makes This Project Special

### The North Star (from ARTICLE.md)

**PrayerMap** is the most dynamic real-time map, sharing real-time user events, past events, and animations at all times to all users, connecting them in the first live visual and historical map of prayer.

It is a free, location-based spiritual platform that enables users to share prayer requests, respond to requests, chat, and support one another through a beautifully designed interactive map interface.

**The "Living Map" Vision:** The map leaves memorial connection lines wherever prayer has been answered, creating a network of prayers drawn on the map, providing a visual representation of prayer that **"makes the invisible, visible"**.

### Success Criteria (from ARTICLE.md)

The system succeeds when:
1. New users see all historical data, all animations in real time, world-class messaging, chat, privacy, and security
2. All custom code visible in one dashboard (no scattered fields)
3. System prevents conflicts before they happen
4. Works across web, iOS, Android
5. AI to production in <10 seconds
6. AI moderates inappropriate content or hate speech at lightning speed
7. PrayerMap debugs itself in real time and deploys fixes

### The Spiritual Nature

PrayerMap isn't just another social app. It's a sacred space where people are vulnerable, authentic, and seeking divine connection. This means:

**Every design decision must honor:**
- Privacy (anonymous options)
- Safety (moderation, reporting)
- Beauty (elevates the spirit)
- Simplicity (reduces distraction from purpose)
- Accessibility (everyone can participate)

### The "Living" Feel

Most prayer apps feel static and lifeless. PrayerMap should feel:
- **Responsive** - Every touch acknowledged instantly
- **Fluid** - Smooth transitions, never jarring
- **Delightful** - Tasteful animations that bring joy
- **Fast** - No waiting, no frustration
- **Alive** - Like the app is breathing with the user

**This is our competitive advantage.** Other apps have prayers. We have a living, breathing prayer experience.

### The Mission

"See where prayer is needed. Send prayer where you are."

We're building something that matters. Every optimization isn't just about metrics - it's about a person in crisis being able to quickly share their burden. Every animation isn't just polish - it's about creating a peaceful moment in someone's day. Every decision to reduce steps isn't just UX - it's about removing barriers between people and hope.

### The Bigger Vision (from ARTICLE.md)

We're not just building products. We're building **a way of building** — an autonomous, world-class development methodology that can be applied to any project, producing results that match or exceed the best companies in the world.

---

## 🎯 Code Quality Standards

### TypeScript Standards
- Strict mode enabled (no `any`, ever)
- Use `interface` for object shapes, `type` for unions
- Export types alongside their implementations
- Use descriptive names with auxiliary verbs: `isLoading`, `hasError`, `canSubmit`

### React Patterns
- Functional components only
- Custom hooks for reusable logic
- Props interfaces named `[Component]Props`
- Component file structure:
  ```typescript
  // 1. Imports (React, external libs, internal, relative)
  import { useState } from 'react';
  import { motion } from 'framer-motion';
  import { supabase } from '@/lib/supabase';
  import { Prayer } from '@/types/prayer';

  // 2. Types
  interface PrayerCardProps {
    prayer: Prayer;
    onPray: () => void;
  }

  // 3. Component
  export function PrayerCard({ prayer, onPray }: PrayerCardProps) {
    // Component logic
  }

  // 4. Subcomponents (if small)
  function PrayerActions() { }

  // 5. Helper functions
  function formatPrayerTime(date: Date): string { }
  ```

### Naming Conventions
- **Files**: PascalCase for components (`PrayerCard.tsx`), camelCase for utilities (`prayerService.ts`)
- **Variables**: camelCase (`userName`, `isAuthenticated`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_AUDIO_DURATION`)
- **Types/Interfaces**: PascalCase (`Prayer`, `UserProfile`)

### Git Commit Messages
```
<type>: <description>

Types: feat, fix, refactor, docs, style, test, chore, mobile

Examples:
✅ feat: Add audio prayer recording
✅ fix: Resolve map marker clustering on iOS
✅ mobile: Add haptic feedback to prayer submission
✅ refactor: Extract prayer validation logic
❌ "updates" (too vague)
❌ "fixed bug" (what bug?)
```

---

## 🚫 Never Do

1. **Never commit secrets** - .env files stay local
2. **Never bypass RLS** - Row Level Security is sacrosanct
3. **Never use `any` type** - TypeScript strict mode is enabled
4. **Never push to main** - Always use pull requests
5. **Never skip error handling** - Every operation can fail
6. **Never assume web works on mobile** - Test on devices
7. **Never implement without research** - Official docs first
8. **Never add friction** - Count and minimize user steps
9. **Never ship slow animations** - 60fps or don't ship
10. **Never forget to update memory** - Document important decisions

---

## ✅ Always Do

1. **Always research official docs first** - Never rely on memory
2. **Always verify source credibility** - Reject random blogs
3. **Always test on mobile** - iOS and Android, not just web
4. **Always count user steps** - Minimize friction relentlessly
5. **Always measure performance** - 60fps animations, fast loads
6. **Always handle loading/error states** - Never leave users confused
7. **Always validate input** - Use Zod schemas
8. **Always use React Query** - For all server state
9. **Always consider accessibility** - ARIA labels, keyboard nav
10. **Always update memory logs** - Help future you

---

## 📞 When You're Stuck

1. **Check official documentation** - Start with the source
2. **Query project memory** - Has this been solved before?
3. **Review similar code** - Look at existing patterns in codebase
4. **Check AGENTS.md** - Detailed guidelines and conventions
5. **Review PRD** - Understand the product intent
6. **Ask for clarification** - Never guess on important decisions

---

## 📊 Success Metrics

### Quality Gates (from ARTICLE.md)

Every deliverable must pass:
- **Quality:** 85%+ target
- **Accuracy:** 90%+ target
- **Completeness:** 95%+ documentation coverage
- **Citations:** All claims backed by sources
- **Testing notes:** How was this verified?

### Performance
- First Contentful Paint: < 1.5s
- Time to Interactive: < 2s
- Map load time: < 1s
- Animation frame rate: 60fps
- Bundle size: < 500kb (main app)
- AI to production: < 10 seconds

### UX
- Time to first prayer view: < 3 seconds
- Time to post prayer: < 30 seconds
- Time to send support: < 10 seconds
- Form abandonment rate: < 5%
- User steps for core actions: Minimize constantly

### Quality
- TypeScript strict mode: 100% (no `any`)
- Test coverage (critical flows): 100%
- Mobile compatibility: iOS 14+, Android 10+
- Accessibility: WCAG 2.1 AA minimum
- Security: No RLS bypasses, no exposed secrets

---

## 🌟 The Bottom Line

**Every line of code serves the mission of connecting people through prayer.**

When in doubt about a decision:
1. Will this honor the spiritual nature of what we're building?
2. Will this work perfectly on a rural iPhone with spotty connection?
3. Will this feel fast, alive, and delightful?
4. Will this reduce friction or add it?
5. Is this based on official, current documentation?

If you can answer "yes" to all five, you're on the right track.

---

## 🆕 Recent Features (2025)

### Video Prayer Responses
- Social media-style video prayers
- Video recording and playback support
- Video moderation in admin dashboard

### Prayer Response System
- Users can respond to prayers with text, audio, or video
- Notification system for prayer responses
- Admin moderation for prayer responses

### Admin Moderation Dashboard
- Review and moderate prayer content
- Manage user reports
- Content approval workflows

---

*This is a sacred project. Code accordingly.*

**Remember: Read [ARTICLE.md](./ARTICLE.md) daily. It is the source of truth.**

---

**Last Updated:** 2025-11-29
**Maintained for:** Claude Code (Anthropic CLI)
**Version:** 2.0 (Autonomous Excellence Edition)
