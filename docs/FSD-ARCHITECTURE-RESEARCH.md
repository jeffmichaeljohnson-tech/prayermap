# Feature-Sliced Design (FSD) Architecture Research

**Research Date:** 2025-12-04
**Research Agent:** Research Agent 1
**Project:** PrayerMap
**Status:** Complete

---

## Executive Summary

### What is Feature-Sliced Design?

Feature-Sliced Design (FSD) is an architectural methodology for scaffolding front-end applications. It's a compilation of rules and conventions on organizing code with the main purpose of making projects more understandable and stable in the face of ever-changing business requirements.

### Key Recommendations for PrayerMap

**Status:** PrayerMap is already partially using FSD structure with `components/`, `services/`, `hooks/`, and `types/` directories. This research provides guidance for completing the migration.

| Recommendation | Priority | Rationale |
|----------------|----------|-----------|
| **Adopt incrementally** | HIGH | Don't restructure everything at once - migrate module-by-module |
| **Start with App + Shared layers** | HIGH | Create foundation before tackling features |
| **Use Steiger linter** | MEDIUM | Enforce architectural rules automatically |
| **Keep current `src/` structure initially** | HIGH | Avoid disrupting active development |
| **Document with FEATURE.md files** | MEDIUM | Help AI agents navigate the codebase |
| **Skip Features layer for MVP** | MEDIUM | Start with Pages, Widgets, Entities, Shared |

### When FSD Makes Sense

**FSD is IDEAL for PrayerMap because:**
- ✅ Project is growing beyond simple pages
- ✅ Multiple feature areas (prayers, map, notifications, messaging)
- ✅ AI-agent development benefits from clear boundaries
- ✅ Long-term maintenance planned
- ✅ Complex business logic (geospatial, real-time, media)

**FSD would be OVERKILL if:**
- ❌ Project was a simple prototype (<5 pages)
- ❌ Short-lived MVP with no maintenance
- ❌ Single developer with no scaling plans

### Quick Win: Minimal FSD Structure for PrayerMap

```
src/
├── app/                    # Application initialization
│   ├── providers/          # Context providers, theme, etc.
│   ├── router/             # Route configuration
│   └── styles/             # Global styles
│
├── pages/                  # Page components (flat list)
│   ├── map-page/
│   ├── prayer-detail-page/
│   └── inbox-page/
│
├── widgets/                # Large UI blocks
│   ├── map-view/           # MapBox integration
│   ├── prayer-list/
│   └── inbox-thread/
│
├── entities/               # Business domain concepts
│   ├── prayer/
│   │   ├── api/            # Prayer API calls
│   │   ├── model/          # Prayer types, stores
│   │   └── ui/             # Prayer card, etc.
│   ├── user/
│   └── notification/
│
└── shared/                 # Reusable utilities
    ├── ui/                 # UI kit components
    ├── api/                # Base API client
    ├── lib/                # Utilities
    └── config/             # Environment config
```

---

## 1. FSD Core Concepts

### 1.1 The Three Pillars

Feature-Sliced Design organizes code using three hierarchical concepts:

| Pillar | Purpose | Example |
|--------|---------|---------|
| **Layers** | Standardized levels of abstraction | `app`, `pages`, `widgets`, `features`, `entities`, `shared` |
| **Slices** | Business domain partitions within a layer | `prayer`, `user`, `notification` |
| **Segments** | Technical purpose within a slice | `ui`, `api`, `model`, `lib`, `config` |

### 1.2 The Seven Layers (Top to Bottom)

```
app       ← Application initialization (providers, router, global styles)
  ↓
pages     ← Full page components (one slice = one route)
  ↓
widgets   ← Large, self-sufficient UI blocks (header, footer, sidebars)
  ↓
features  ← User interactions with business value (like, comment, share)
  ↓
entities  ← Business domain concepts (User, Prayer, Post)
  ↓
shared    ← Reusable utilities, UI kit, configs
```

**Key Rule:** Dependencies flow DOWN only. A layer can only import from layers strictly below it.

**Deprecated Layer:** `processes` was removed in FSD 2.1 - avoid using it.

### 1.3 Segments (Technical Divisions)

Standard segment names (not required, but conventional):

| Segment | Purpose | Examples |
|---------|---------|----------|
| **ui** | Visual components | `PrayerCard.tsx`, `Button.tsx` |
| **api** | Backend interactions | `fetchPrayers()`, `createPrayer()` |
| **model** | Data model, business logic | Types, schemas, Zustand stores |
| **lib** | Helper code for this slice | Formatters, validators specific to this domain |
| **config** | Configuration, feature flags | API endpoints, constants |

**Custom segments are allowed** - name them by purpose, not essence.
- ❌ Bad: `components`, `hooks`, `types` (describes what it is)
- ✅ Good: `validation`, `transforms`, `constants` (describes what it does)

---

## 2. The Import Rule (Dependency Direction)

### 2.1 Core Rule

> **A module (file) in a slice can only import other slices when they are located on layers strictly below.**

**Hierarchy:** `shared < entities < features < widgets < pages < app`

### 2.2 What This Means

```typescript
// ✅ ALLOWED
// pages/map-page can import from widgets, features, entities, shared
import { MapView } from '@/widgets/map-view'
import { PrayerCard } from '@/entities/prayer/ui'

// ❌ FORBIDDEN
// entities/prayer cannot import from features
import { LikeButton } from '@/features/prayer-actions'  // BREAKS RULE

// ❌ FORBIDDEN
// pages/map-page cannot import from another page
import { InboxPage } from '@/pages/inbox-page'  // BREAKS RULE
```

### 2.3 Same-Layer Restriction

**Slices on the same layer cannot import from each other.**

This prevents circular dependencies and maintains high cohesion within slices.

```typescript
// ❌ FORBIDDEN - Same layer cross-import
// entities/prayer importing from entities/user
import { UserAvatar } from '@/entities/user/ui'  // BREAKS RULE

// ✅ SOLUTION - Move to shared if used across entities
import { Avatar } from '@/shared/ui'  // OK
```

### 2.4 Enforcement with Steiger

Use the official FSD linter to automatically enforce these rules:

```bash
npm install -D steiger @feature-sliced/steiger-plugin
```

Key rules enforced:
- `fsd/forbidden-imports` - Prevents upward/cross imports
- `fsd/no-public-api-sidestep` - Ensures imports go through index.ts
- `fsd/ambiguous-slice-names` - Prevents naming conflicts

---

## 3. Public API Pattern

### 3.1 What is Public API?

In FSD, every slice and segment must define a **public API** - an explicit declaration of what can be imported by other modules.

**Implementation:** A `index.ts` barrel file that re-exports specific items.

### 3.2 How It Works

```typescript
// entities/prayer/index.ts (PUBLIC API)
export { PrayerCard } from './ui/PrayerCard'
export { usePrayer } from './model/usePrayer'
export type { Prayer, PrayerStatus } from './model/types'

// Internal files NOT exported are private
// ui/PrayerCardSkeleton.tsx ← NOT in index.ts = private to slice
```

### 3.3 Import Rules with Public API

```typescript
// ✅ CORRECT - Import from slice root (public API)
import { PrayerCard, Prayer } from '@/entities/prayer'

// ❌ WRONG - Import from internal file (breaks encapsulation)
import { PrayerCard } from '@/entities/prayer/ui/PrayerCard'
```

### 3.4 Benefits

1. **Refactoring freedom** - Change internal structure without breaking imports
2. **Encapsulation** - Hide implementation details
3. **Clear contracts** - Explicit API surface
4. **AI navigation** - Agents know exactly what's available

### 3.5 Performance Considerations

**Problem:** Large barrel files can slow development servers.

**Solutions:**
1. Separate index files per component in `shared/ui` instead of one big barrel
2. Avoid index files in segments on layers with slices
3. Use tree-shaking-friendly named exports (not `export *`)

**Anti-Pattern:**
```typescript
// ❌ BAD - Wildcard re-export
export * from './ui/PrayerCard'
```

**Best Practice:**
```typescript
// ✅ GOOD - Explicit named exports
export { PrayerCard } from './ui/PrayerCard'
export { PrayerCardSkeleton } from './ui/PrayerCardSkeleton'
```

### 3.6 Shared Layer Public API

For `shared` (which has no slices), define separate public APIs per segment:

```
shared/
├── ui/
│   └── index.ts        # Export button, modal, etc.
├── api/
│   └── index.ts        # Export apiClient, etc.
└── lib/
    └── index.ts        # Export formatDate, etc.
```

---

## 4. Layer Breakdown

### 4.1 App Layer

**Purpose:** Everything that makes the app run - routing, entrypoints, global styles, providers.

**Structure:** No slices, only segments.

```
app/
├── providers/
│   ├── index.tsx       # All providers composed
│   ├── AuthProvider.tsx
│   └── ThemeProvider.tsx
├── router/
│   └── index.tsx       # Route configuration
├── styles/
│   └── index.css       # Global CSS
└── index.tsx           # App entry point
```

**What goes here:**
- Application bootstrap code
- Global providers (auth, theme, i18n)
- Route definitions
- Global styles/CSS reset
- Error boundaries

**What DOESN'T go here:**
- UI components (goes to widgets/shared)
- Business logic (goes to entities/features)
- Page components (goes to pages)

### 4.2 Pages Layer

**Purpose:** Full page components, typically one page = one route.

**Structure:** Flat list of pages (slices).

```
pages/
├── map-page/
│   ├── ui/
│   │   └── MapPage.tsx
│   └── index.ts
├── prayer-detail-page/
│   ├── ui/
│   └── index.ts
└── inbox-page/
    ├── ui/
    └── index.ts
```

**Key Characteristics:**
- One slice per page
- Mostly composition (import from widgets/features)
- Minimal logic (just orchestration)
- Similar pages can be grouped in one slice (e.g., login + signup)

**FSD 2.0 vs 2.1:**
- **FSD 2.0:** Keep pages thin, push logic to features/widgets
- **FSD 2.1:** "Pages first" - keep more code in pages if not reused

**For PrayerMap:**
```
pages/
├── map-page/           # Main map view
├── prayer-detail/      # Prayer detail modal/page
├── inbox/              # Messaging inbox
└── settings/           # User settings
```

### 4.3 Widgets Layer

**Purpose:** Large, self-sufficient UI blocks. Most useful when reused across multiple pages.

**Structure:** Slices with segments.

```
widgets/
├── map-view/
│   ├── ui/
│   │   └── MapView.tsx
│   ├── model/
│   │   └── useMapState.ts
│   └── index.ts
├── prayer-list/
│   ├── ui/
│   └── index.ts
└── header/
    ├── ui/
    └── index.ts
```

**Examples:**
- Header/footer
- Sidebar navigation
- Product carousel
- Comment section
- Complex forms

**For PrayerMap:**
```
widgets/
├── map-view/           # MapBox integration + controls
├── prayer-list/        # List of prayers with filters
├── inbox-thread/       # Conversation thread view
└── notification-panel/ # Notification dropdown
```

### 4.4 Features Layer

**Purpose:** User scenarios and functionality that carries business value.

**Structure:** Slices with segments.

**OPTIONAL LAYER** - Many projects skip this layer initially.

```
features/
├── prayer-actions/
│   ├── ui/
│   │   ├── PrayButton.tsx
│   │   └── ShareButton.tsx
│   ├── model/
│   └── index.ts
└── location-picker/
    ├── ui/
    └── index.ts
```

**Examples:**
- Like/favorite functionality
- Share to social
- Add to cart
- Comment/review submission
- File upload

**For PrayerMap:**
```
features/
├── prayer-support/     # "Pray for this" action
├── create-prayer/      # Prayer creation flow
├── location-picker/    # Map pin placement
└── media-recorder/     # Audio/video recording
```

**When to use Features vs Entities:**
- **Features:** User interactions, actions with side effects
- **Entities:** Data representation, display components

### 4.5 Entities Layer

**Purpose:** Business domain concepts - the real-world things your app works with.

**Structure:** Slices with segments.

```
entities/
├── prayer/
│   ├── api/
│   │   └── prayerApi.ts
│   ├── model/
│   │   ├── types.ts
│   │   └── usePrayerStore.ts
│   ├── ui/
│   │   └── PrayerCard.tsx
│   └── index.ts
├── user/
│   ├── api/
│   ├── model/
│   ├── ui/
│   └── index.ts
└── notification/
    └── ...
```

**What goes here:**
- Data types/interfaces
- API request functions
- Data stores (Zustand, Redux, etc.)
- Entity display components (cards, avatars, etc.)
- Validation schemas

**For PrayerMap:**
```
entities/
├── prayer/
│   ├── api/            # fetchPrayers, createPrayer
│   ├── model/          # Prayer type, Zustand store
│   └── ui/             # PrayerCard, PrayerMarker
├── user/
│   ├── api/            # fetchUser, updateProfile
│   ├── model/          # User type, auth store
│   └── ui/             # UserAvatar, UserProfile
├── notification/
├── message/
└── location/
```

### 4.6 Shared Layer

**Purpose:** Reusable code not tied to specific business logic.

**Structure:** No slices, only segments.

```
shared/
├── ui/
│   ├── button/
│   │   ├── Button.tsx
│   │   └── index.ts
│   ├── modal/
│   └── index.ts        # Export all UI components
├── api/
│   ├── client.ts       # Axios/fetch setup
│   ├── types.ts
│   └── index.ts
├── lib/
│   ├── formatDate.ts
│   ├── validators.ts
│   └── index.ts
├── config/
│   ├── env.ts
│   └── index.ts
└── types/
    └── common.ts
```

**What goes here:**
- UI kit (buttons, inputs, modals)
- Base API client configuration
- Generic utilities (date formatting, validators)
- Environment configuration
- Common TypeScript types

**What DOESN'T go here:**
- Business logic (goes to entities/features)
- Domain-specific components (goes to entities)
- Page-specific code (goes to pages)

**The "Shared Mess" Problem:**
Every team faces this - `shared/` becomes a dumping ground.

**Rule of thumb:** If it's not reusable in multiple independent contexts, it doesn't belong in `shared/`.

**For PrayerMap:**
```
shared/
├── ui/                 # Design system components
├── api/                # Supabase client setup
├── lib/                # formatDistance, validators
├── config/             # Env vars, constants
└── types/              # Common TypeScript types
```

---

## 5. FSD vs Other Patterns

### 5.1 FSD vs Domain-Driven Design (DDD)

| Aspect | FSD | DDD |
|--------|-----|-----|
| **Focus** | Organizing frontend features | Modeling complex business domains |
| **Complexity** | Lightweight, frontend-specific | Heavy, requires domain expertise |
| **Structure** | Standardized 7 layers | No prescribed structure |
| **Best for** | Frontend scalability | Backend/full-stack with complex logic |

**Key Similarity:** Both organize by business concepts, not technical layers.

**Key Difference:** FSD is specifically tailored for React/frontend, DDD is domain-agnostic.

### 5.2 FSD vs Bulletproof React

| Aspect | FSD | Bulletproof React |
|--------|-----|-------------------|
| **Structure** | 7 standardized layers | Simpler features + shared folders |
| **Complexity** | More rigid, more layers | More flexible, fewer rules |
| **Best for** | Large teams, complex apps | Small-medium projects |
| **Import rules** | Strictly enforced via linter | Recommended but not enforced |

**Recommendation:** Use Bulletproof React for side projects, FSD for production apps at scale.

### 5.3 FSD vs Next.js Conventions

**The Conflict:** Next.js uses `pages/` and `app/` for routing, FSD uses them for layers.

**Solutions:**

**Option 1: Move Next.js folders to root (RECOMMENDED)**
```
/app                    # Next.js App Router
/pages                  # Empty (prevents Pages Router conflict)
/src
  ├── app/              # FSD app layer
  ├── pages/            # FSD pages layer
  ├── entities/
  └── shared/
```

**Option 2: Rename FSD pages**
```
/app                    # Next.js App Router
/src
  ├── app/              # FSD app layer
  ├── views/            # FSD pages layer (renamed)
  ├── entities/
  └── shared/
```

**For PrayerMap (React Router, not Next.js):**
No conflict - can use standard FSD structure.

### 5.4 FSD vs Vertical Slice Architecture

**Similarity:** Both slice by feature, not technical layer.

**Difference:**
- **Vertical Slice:** Each feature is completely isolated (database to UI)
- **FSD:** Shared layers (entities, shared) used across features

**Use case:** Vertical Slice is more backend-focused, FSD is frontend-focused.

---

## 6. AI Navigation with FEATURE.md

### 6.1 The Problem

AI agents struggle to understand large codebases without context. They need:
- What each module does
- How modules relate
- What patterns to follow

### 6.2 The Solution: FEATURE.md Files

**Concept:** Place a `FEATURE.md` file in each slice to document its purpose and API.

**Inspired by:** `AGENTS.md` pattern used in AI coding tools.

### 6.3 FEATURE.md Template

```markdown
# Prayer Entity

## Purpose
Represents a prayer request in the PrayerMap system. Handles prayer data fetching,
creation, and UI display.

## Public API
```typescript
// Types
export type Prayer = { ... }
export type PrayerStatus = 'ACTIVE' | 'ANSWERED' | 'ARCHIVED'

// Components
export { PrayerCard }       // Display prayer in list
export { PrayerMarker }     // Display prayer on map

// Hooks
export { usePrayer }        // Fetch single prayer
export { usePrayers }       // Fetch prayer list

// API
export { createPrayer }
export { updatePrayer }
```

## Dependencies
- `@/shared/api` - Supabase client
- `@/shared/ui` - Button, Modal components
- `@/entities/user` - User avatar, user data

## Usage Examples
```typescript
// Fetch prayers in a component
const { data: prayers } = usePrayers({ radius: 30 })

// Display prayer
<PrayerCard prayer={prayer} onPress={handlePress} />
```

## Internal Structure
- `api/` - Supabase queries
- `model/` - TypeScript types, Zustand store
- `ui/` - React components
```

### 6.4 AI Agent Benefits

1. **Quick orientation** - Agent reads FEATURE.md to understand module
2. **Correct imports** - Agent knows what's exported
3. **Consistent patterns** - Agent follows established conventions
4. **Reduced hallucination** - Agent has factual context

### 6.5 Placement

```
entities/
├── prayer/
│   ├── FEATURE.md      # ← Document this slice
│   ├── api/
│   ├── model/
│   ├── ui/
│   └── index.ts
└── user/
    ├── FEATURE.md      # ← Document this slice
    └── ...
```

**Recommendation for PrayerMap:** Start with FEATURE.md files for core entities (prayer, user, notification).

---

## 7. Real-World Examples

### 7.1 Production Companies Using FSD

| Company/Project | Tech Stack | Notes |
|----------------|------------|-------|
| **Domino's** | FSD + React | Developer mentioned using pizza analogies in their FSD implementation |
| **Cozy Ventures** | FSD + React | Built Level Up Basket (basketball court finder) and Palo Santo (VC fund) projects |
| **RealWorld (Demo)** | FSD + React + TypeScript | Modern Medium clone, includes tests, code splitting |
| **Kinomore** | FSD + React + Effector | Large production app using FSD/Effector stack |

### 7.2 GitHub Examples

| Repository | Description | URL |
|------------|-------------|-----|
| **feature-sliced/examples** | Official examples collection | https://github.com/feature-sliced/examples |
| **yurisldk/realworld-react-fsd** | RealWorld app with FSD | https://github.com/yurisldk/realworld-react-fsd |
| **Nukeapp** | Shopping app (React + Redux Toolkit + TypeScript) | In official examples |
| **Simple Greenhouse** | FSD + MobX + Firebase + TypeScript | In official examples |

### 7.3 Case Study: RealWorld React FSD

**Project:** Social blogging site (Medium clone)

**Stack:**
- Feature-Sliced Design
- React + TypeScript
- Redux Toolkit
- React Query
- Vite

**Key Features:**
- Code splitting & lazy loading
- Comprehensive testing (Jest + Cypress)
- CI/CD integration
- 100% TypeScript

**Results:**
- Clear module boundaries
- Easy onboarding for new developers
- Maintainable at scale

**Lessons:**
- Start with basic layers (app, pages, entities, shared)
- Add features layer only when needed
- Use TypeScript for better type safety
- Implement testing from the start

---

## 8. Common Pitfalls and Solutions

### 8.1 Over-Engineering

**Problem:** Creating too many layers, slices, or abstractions unnecessarily.

**Signs:**
- Slices with only one file
- Layers with only one slice
- Abstractions that provide no benefit

**Solution:**
- Start simple - only add layers when needed
- Colocate code until you have a reason to split
- Use "Rule of Three" - extract only after third usage

### 8.2 Steep Learning Curve

**Problem:** Team struggles to understand FSD concepts.

**Solutions:**
1. **Training session** - Walk through FSD docs together
2. **Start small** - Implement one layer at a time
3. **Use examples** - Reference official examples
4. **Pair programming** - Learn by doing together

### 8.3 Onboarding Difficulties

**Problem:** New team members confused by FSD structure.

**Solutions:**
1. **FEATURE.md files** - Document each module
2. **Architecture diagram** - Visual overview of layers
3. **Contribution guide** - "Where does X go?" FAQ
4. **Code review focus** - Teach during PR reviews

### 8.4 The "Shared Mess"

**Problem:** `shared/` becomes a dumping ground for everything.

**Solutions:**
1. **Strict rule** - Only truly reusable code goes in shared
2. **Regular refactoring** - Move domain-specific code to entities
3. **Code review** - Question every addition to shared
4. **Metrics** - Track shared folder size

### 8.5 Next.js Integration Conflicts

**Problem:** Next.js `app/` and `pages/` clash with FSD layers.

**Solution:** See [Section 5.3](#53-fsd-vs-nextjs-conventions) - move Next.js folders to root.

### 8.6 Barrel Export Performance

**Problem:** Large index.ts files slow development server.

**Solutions:**
1. Separate index files per component in `shared/ui`
2. Avoid index files in segments
3. Use named exports, not wildcard re-exports
4. Enable tree-shaking in bundler

### 8.7 Ambiguous Slice Names

**Problem:** Slice names conflict with segment names (e.g., `shared/ui` vs `entities/ui`).

**Solution:** Use Steiger linter rule `fsd/ambiguous-slice-names` to catch this.

### 8.8 Circular Dependencies

**Problem:** Two modules import from each other.

**FSD Solution:** Layer hierarchy prevents most circular dependencies.

**If it happens:**
1. Check if you're violating layer hierarchy
2. Extract shared logic to lower layer
3. Use dependency inversion (interfaces)

---

## 9. Migration Strategy

### 9.1 When to Migrate

**Migrate if:**
- ✅ New team members struggle to navigate code
- ✅ Changing one part breaks unrelated parts
- ✅ Adding features is difficult due to complexity
- ✅ Project is expected to grow significantly

**Don't migrate if:**
- ❌ Team is against it (culture matters)
- ❌ Project is small and stable
- ❌ No plans for long-term maintenance

### 9.2 Migration Steps (Recommended Order)

**Phase 1: Foundation (Week 1-2)**
1. Set up path alias (`@/` for `src/`)
2. Create `app/` layer
   - Move providers
   - Move router
   - Move global styles
3. Create `shared/` layer
   - Extract UI kit components
   - Extract utilities
   - Extract API client

**Phase 2: Business Logic (Week 3-4)**
4. Create `entities/` layer
   - Move domain types
   - Move API calls
   - Move data stores
5. Create `pages/` layer
   - Extract page components
   - Keep routing in `app/`

**Phase 3: Composition (Week 5-6)**
6. Create `widgets/` layer
   - Extract large UI blocks
   - Refactor pages to use widgets
7. (Optional) Create `features/` layer
   - Extract user interactions
   - Move action handlers

**Phase 4: Enforcement (Week 7)**
8. Install Steiger linter
9. Fix import violations
10. Document with FEATURE.md files

### 9.3 Incremental Migration Pattern

**Key principle:** Migrate module-by-module, don't halt development.

```
Step 1: Pick ONE entity (e.g., Prayer)
  ├── Create entities/prayer/
  ├── Move prayer API calls
  ├── Move prayer types
  └── Update imports

Step 2: Pick NEXT entity (e.g., User)
  └── Repeat

Step 3: Once entities done, move to widgets
  └── Extract large components
```

### 9.4 Testing Strategy During Migration

1. **Unit tests** - Keep existing tests, update imports
2. **Integration tests** - Test public APIs, not internal structure
3. **E2E tests** - Should be unaffected by folder changes
4. **Regression testing** - Test features after each migration step

### 9.5 Rollback Plan

If migration causes issues:

1. **Git branches** - Keep migration on feature branch
2. **Feature flags** - Toggle between old/new structure
3. **Incremental merge** - Merge one layer at a time
4. **Monitoring** - Watch error rates after deployment

---

## 10. FSD Tooling

### 10.1 Steiger (Official Linter)

**What:** Universal file structure and project architecture linter.

**Installation:**
```bash
npm install -D steiger @feature-sliced/steiger-plugin
```

**Configuration (`steiger.config.ts`):**
```typescript
export default {
  extends: ['@feature-sliced/steiger-plugin'],
  rules: {
    'fsd/forbidden-imports': 'error',
    'fsd/no-public-api-sidestep': 'error',
    'fsd/ambiguous-slice-names': 'warn',
    'fsd/excessive-slicing': 'warn',
  },
}
```

**Key Rules:**
- `fsd/forbidden-imports` - Enforces layer hierarchy
- `fsd/no-public-api-sidestep` - Requires imports through index.ts
- `fsd/ambiguous-slice-names` - Prevents naming conflicts
- `fsd/inconsistent-naming` - Enforces naming conventions
- `fsd/insignificant-slice` - Detects unused slices

**Status:** Beta, but production-ready.

**URL:** https://github.com/feature-sliced/steiger

### 10.2 ESLint Plugin

**Alternative:** `@conarti/eslint-plugin-feature-sliced`

**Installation:**
```bash
npm install -D @conarti/eslint-plugin-feature-sliced
```

**Configuration:**
```javascript
module.exports = {
  extends: ['plugin:@conarti/feature-sliced/recommended'],
}
```

**URL:** https://github.com/conarti/eslint-plugin-feature-sliced

### 10.3 FSD CLI

**What:** Utility to quickly generate layers, slices, and segments.

**Installation:**
```bash
npm install -g @feature-sliced/cli
```

**Usage:**
```bash
fsd slice entities prayer
# Creates: entities/prayer/index.ts

fsd segment entities prayer ui
# Creates: entities/prayer/ui/
```

**URL:** https://github.com/feature-sliced/cli

### 10.4 IDE Extensions

**VS Code:**
- File scaffolding snippets
- Quick navigation between slices
- (No official extension yet, but community tools exist)

**WebStorm/IntelliJ:**
- Live templates for FSD structure
- Code generation for slices

---

## 11. PrayerMap-Specific Recommendations

### 11.1 Current State Analysis

**Current structure:**
```
src/
├── components/         # Mixed: UI components + business components
├── services/           # API calls + business logic
├── hooks/              # React hooks
├── types/              # TypeScript types
├── lib/                # Utilities
└── contexts/           # React contexts
```

**Issues:**
- Components folder is flat and mixed (UI kit + domain components)
- Services mix API calls with business logic
- No clear layer hierarchy
- Hard for AI agents to navigate

### 11.2 Recommended Migration Path

**Phase 1: App + Shared (Week 1)**
```
src/
├── app/
│   ├── providers/      # Move contexts here
│   ├── router/         # Route definitions
│   └── styles/         # Global CSS
└── shared/
    ├── ui/             # Move UI kit components
    ├── api/            # Supabase client
    ├── lib/            # Utilities
    └── config/         # Env vars
```

**Phase 2: Entities (Week 2-3)**
```
src/
└── entities/
    ├── prayer/
    │   ├── api/        # prayerApi.ts
    │   ├── model/      # types.ts, store
    │   └── ui/         # PrayerCard
    ├── user/
    │   ├── api/
    │   ├── model/
    │   └── ui/         # UserAvatar
    ├── notification/
    └── message/
```

**Phase 3: Pages + Widgets (Week 4)**
```
src/
├── pages/
│   ├── map-page/
│   ├── prayer-detail/
│   └── inbox/
└── widgets/
    ├── map-view/       # MapBox integration
    ├── prayer-list/
    └── inbox-thread/
```

**Phase 4: Features (Optional, Week 5)**
```
src/
└── features/
    ├── prayer-support/     # "Pray for this" button
    ├── create-prayer/      # Prayer creation flow
    └── media-recorder/     # Audio/video recording
```

### 11.3 Priority Entities for PrayerMap

Based on the codebase analysis:

| Entity | Priority | Reason |
|--------|----------|--------|
| `prayer` | HIGH | Core domain concept |
| `user` | HIGH | Authentication, profiles |
| `notification` | MEDIUM | In-app notifications |
| `message` | MEDIUM | Messaging system (new feature) |
| `location` | LOW | May fit better in shared/lib |

### 11.4 FEATURE.md for Prayer Entity

**Example:**
```markdown
# Prayer Entity

## Purpose
Represents a prayer request in PrayerMap. Handles prayer CRUD operations,
geospatial queries, and real-time updates.

## Public API
```typescript
// Types
export type Prayer = {
  id: string
  user_id: string
  content: string
  location: { lat: number; lng: number }
  status: 'ACTIVE' | 'ANSWERED' | 'ARCHIVED'
}

// Components
export { PrayerCard }       // List view
export { PrayerMarker }     // Map marker
export { PrayerDetail }     // Full prayer view

// Hooks
export { usePrayer }        // Fetch single prayer
export { usePrayers }       // Fetch prayers in radius
export { useCreatePrayer }  // Create prayer mutation

// API
export { fetchPrayers }
export { createPrayer }
```

## Dependencies
- `@/shared/api` - Supabase client
- `@/shared/ui` - Button, Modal
- `@/entities/user` - User avatar

## Internal Structure
- `api/prayerApi.ts` - Supabase queries
- `model/types.ts` - TypeScript types
- `model/store.ts` - Zustand store
- `ui/PrayerCard.tsx` - List item component
- `ui/PrayerMarker.tsx` - Map marker component
```

### 11.5 Path Alias Configuration

**Update `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/app/*": ["src/app/*"],
      "@/pages/*": ["src/pages/*"],
      "@/widgets/*": ["src/widgets/*"],
      "@/features/*": ["src/features/*"],
      "@/entities/*": ["src/entities/*"],
      "@/shared/*": ["src/shared/*"]
    }
  }
}
```

**Update `vite.config.ts`:**
```typescript
import path from 'path'

export default {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/widgets': path.resolve(__dirname, './src/widgets'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/entities': path.resolve(__dirname, './src/entities'),
      '@/shared': path.resolve(__dirname, './src/shared'),
    },
  },
}
```

### 11.6 Integration with Existing Tools

**Capacitor (iOS/Android):**
- No conflicts - FSD is frontend structure only
- Keep `capacitor.config.ts` at root
- Build output goes to `dist/` as usual

**Supabase:**
- API calls go in `entities/*/api/` or `shared/api/`
- Supabase client setup in `shared/api/client.ts`
- Types generated to `shared/api/types.ts`

**MapBox:**
- MapBox integration in `widgets/map-view/`
- Marker components in `entities/*/ui/` (e.g., PrayerMarker)
- Map utilities in `shared/lib/map/`

---

## 12. Testing Strategy with FSD

### 12.1 Test Organization

**Principle:** Tests colocate with the code they test.

```
entities/
├── prayer/
│   ├── api/
│   │   ├── prayerApi.ts
│   │   └── prayerApi.test.ts       # ← Colocated
│   ├── model/
│   │   ├── usePrayer.ts
│   │   └── usePrayer.test.ts
│   └── ui/
│       ├── PrayerCard.tsx
│       └── PrayerCard.test.tsx
```

### 12.2 Test Types by Layer

| Layer | Test Type | Focus |
|-------|-----------|-------|
| **shared** | Unit | Pure functions, utilities |
| **entities** | Unit + Integration | API calls, stores, components |
| **features** | Integration | User interactions, side effects |
| **widgets** | Integration | Component composition |
| **pages** | E2E | Full user flows |

### 12.3 Public API Testing

**Test through public API, not internals:**

```typescript
// ✅ GOOD - Test public API
import { usePrayer } from '@/entities/prayer'

test('usePrayer fetches prayer by ID', async () => {
  const { result } = renderHook(() => usePrayer('123'))
  // ...
})

// ❌ BAD - Test internal implementation
import { usePrayer } from '@/entities/prayer/model/usePrayer'
```

**Benefit:** Refactor internals without breaking tests.

### 12.4 Recommended Test Stack

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",              // Unit testing
    "@testing-library/react": "^14.0.0",  // React testing
    "cypress": "^13.0.0",            // E2E testing
    "msw": "^2.0.0"                  // API mocking
  }
}
```

### 12.5 Testing Checklist

- [ ] Unit tests for `shared/lib/` utilities
- [ ] Integration tests for `entities/*/api/` API calls
- [ ] Component tests for `entities/*/ui/` components
- [ ] Integration tests for `features/` user interactions
- [ ] E2E tests for critical user flows (create prayer, send prayer)

---

## 13. When FSD is Overkill

### 13.1 Don't Use FSD If...

| Scenario | Why Not FSD | Better Alternative |
|----------|-------------|-------------------|
| **Prototype/MVP** | Too much structure for experimentation | Simple flat structure |
| **Small app (<5 pages)** | Over-engineering for small scope | Bulletproof React |
| **Short-lived project** | No long-term maintenance payoff | Next.js conventions |
| **Solo developer, no scaling** | Unnecessary abstraction | Feature folders |
| **Team against it** | Culture matters more than architecture | Align with team |

### 13.2 Gradual Adoption is OK

**You don't need all 7 layers immediately.**

**Minimal FSD (3 layers):**
```
src/
├── app/        # Providers, router
├── pages/      # Page components
└── shared/     # UI kit, utilities
```

**Typical FSD (5 layers):**
```
src/
├── app/
├── pages/
├── widgets/
├── entities/
└── shared/
```

**Full FSD (6 layers, skip processes):**
```
src/
├── app/
├── pages/
├── widgets/
├── features/
├── entities/
└── shared/
```

**Recommendation for PrayerMap:** Start with 5 layers (skip features initially).

---

## 14. Key Takeaways

### 14.1 Core Principles (Memorize These)

1. **Layers enforce dependency direction** - `shared < entities < features < widgets < pages < app`
2. **Public API for every slice** - Export through `index.ts`, never import internal files
3. **Slices on same layer cannot cross-import** - High cohesion, low coupling
4. **Segments organize by technical purpose** - `ui`, `api`, `model`, `lib`, `config`
5. **Only use layers you need** - Start simple, add complexity when needed

### 14.2 Quick Decision Tree

**"Where does this code go?"**

1. **Is it application setup?** → `app/`
2. **Is it a full page?** → `pages/`
3. **Is it a large UI block used on multiple pages?** → `widgets/`
4. **Is it a user interaction with business value?** → `features/`
5. **Is it a business domain concept?** → `entities/`
6. **Is it reusable across unrelated parts of the app?** → `shared/`

### 14.3 Golden Rules

- **App** - Bootstrap, global concerns
- **Pages** - Full pages, mostly composition
- **Widgets** - Large UI blocks, self-sufficient
- **Features** - User actions, business value
- **Entities** - Domain concepts, data representation
- **Shared** - Truly generic, no business logic

### 14.4 Success Metrics

**FSD is working when:**
- ✅ New team members onboard faster
- ✅ Changes don't break unrelated parts
- ✅ AI agents navigate code efficiently
- ✅ Code reviews focus on logic, not "where does this go?"
- ✅ Refactoring is safe (public API shields internals)

**FSD is failing when:**
- ❌ Team spends more time debating structure than coding
- ❌ Layers are empty or have one file
- ❌ Constant import violations
- ❌ "Shared mess" grows uncontrollably

---

## 15. Sources (20 Total)

### Official FSD Documentation
1. [Feature-Sliced Design - Official Website](https://feature-sliced.design/) - Main documentation portal
2. [FSD Overview](https://feature-sliced.github.io/documentation/docs/get-started/overview) - Getting started guide
3. [FSD Layers Reference](https://feature-sliced.design/docs/reference/layers) - Detailed layer breakdown
4. [FSD Public API](https://feature-sliced.design/docs/reference/public-api) - Public API pattern explanation
5. [FSD Slices and Segments](https://feature-sliced.design/docs/reference/slices-segments) - Slices and segments reference
6. [FSD Tutorial](https://feature-sliced.design/docs/get-started/tutorial) - Step-by-step tutorial
7. [FSD GitHub Organization](https://github.com/feature-sliced) - Official GitHub repositories

### Migration & Implementation
8. [FSD Migration from Custom Architecture](https://feature-sliced.design/docs/guides/migration/from-custom) - Migration strategy guide
9. [FSD with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs) - Next.js integration solutions
10. [How to Deal with Next.js App Router and FSD](https://dev.to/m_midas/how-to-deal-with-nextjs-using-feature-sliced-design-4c67) - Practical Next.js solutions

### Tooling
11. [Steiger - Official FSD Linter](https://github.com/feature-sliced/steiger) - Architectural enforcement tool
12. [FSD CLI](https://github.com/feature-sliced/cli) - Code generation utility
13. [ESLint Plugin for FSD](https://github.com/conarti/eslint-plugin-feature-sliced) - Alternative linter

### Case Studies & Examples
14. [FSD Examples Repository](https://github.com/feature-sliced/examples) - Official example projects
15. [RealWorld React FSD](https://github.com/yurisldk/realworld-react-fsd) - Production-quality example
16. [Understanding FSD: Benefits and Real Code Examples](https://hackernoon.com/understanding-feature-sliced-design-benefits-and-real-code-examples) - Practical examples
17. [Cozy Ventures: Slice by Slice FSD](https://cozy.ventures/blog/fsd/) - Production case study

### Comparisons & Analysis
18. [FSD vs Clean Architecture](https://philrich.dev/fsd-vs-clean-architecture/) - Architecture comparison
19. [The Drawbacks of Feature-Sliced Design](https://medium.com/@lightxdesign55/the-drawbacks-of-feature-sliced-design-b19206b96cb7) - Critical analysis
20. [Mastering FSD: Lessons from Real Projects](https://dev.to/arjunsanthosh/mastering-feature-sliced-design-lessons-from-real-projects-2ida) - Production lessons learned

### Additional Resources
21. [FSD: The Best Frontend Architecture](https://dev.to/m_midas/feature-sliced-design-the-best-frontend-architecture-4noj) - Comprehensive overview
22. [Feature-Sliced Design in Frontend Development](https://medium.com/@ignatovich.dm/feature-sliced-design-in-frontend-development-a-basic-exploration-82706d49d97f) - Basic exploration
23. [FSD Architecture in React with TypeScript](https://medium.com/@codewithxohii/feature-sliced-design-architecture-in-react-with-typescript-a-comprehensive-guide-b2652283c6b2) - TypeScript guide
24. [Cursor Rule for Feature-Sliced Design](https://medium.com/@4u72qu6pmt/cursor-rule-for-feature-slice-design-e29b56036b89) - AI coding tool integration

---

## 16. Next Steps for PrayerMap

### 16.1 Immediate Actions (This Week)

1. **Read ARTICLE.md** - Align FSD adoption with project philosophy
2. **Create path aliases** - Set up `@/` imports in tsconfig/vite
3. **Install Steiger** - Get linter ready (don't enforce yet)
4. **Document current structure** - Map existing files to FSD layers

### 16.2 Week 1-2: Foundation

1. **Create `app/` layer**
   - Move `contexts/` to `app/providers/`
   - Move routing to `app/router/`
   - Move global styles to `app/styles/`

2. **Create `shared/` layer**
   - Extract UI components to `shared/ui/`
   - Move utilities to `shared/lib/`
   - Configure Supabase client in `shared/api/`

### 16.3 Week 3-4: Business Logic

3. **Create `entities/` layer**
   - Start with `entities/prayer/`
   - Then `entities/user/`
   - Then `entities/notification/`

4. **Add FEATURE.md files**
   - Document each entity's public API
   - List dependencies
   - Provide usage examples

### 16.4 Week 5-6: Composition

5. **Create `pages/` layer**
   - Extract page components
   - Refactor to use entities/widgets

6. **Create `widgets/` layer**
   - Extract MapBox integration
   - Extract prayer list
   - Extract inbox thread

### 16.5 Week 7: Enforcement

7. **Enable Steiger**
   - Run initial scan
   - Fix import violations
   - Add to CI/CD

8. **Update documentation**
   - Update ARCHITECTURE.md
   - Add FSD section to PROJECT-GUIDE.md
   - Create CONTRIBUTING.md with "where does X go?" guide

### 16.6 Success Criteria

**Migration is successful when:**
- ✅ All files organized in FSD layers
- ✅ Steiger passes with zero violations
- ✅ All entities have FEATURE.md files
- ✅ AI agents can navigate codebase efficiently
- ✅ Team understands layer hierarchy
- ✅ New features follow FSD conventions

---

## Appendix A: PrayerMap FSD Structure (Proposed)

```
src/
├── app/
│   ├── providers/
│   │   ├── index.tsx           # All providers composed
│   │   ├── AuthProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── NotificationProvider.tsx
│   ├── router/
│   │   └── index.tsx           # React Router setup
│   ├── styles/
│   │   └── index.css           # Global CSS
│   └── index.tsx               # App entry
│
├── pages/
│   ├── map-page/
│   │   ├── ui/
│   │   │   └── MapPage.tsx
│   │   └── index.ts
│   ├── prayer-detail-page/
│   │   ├── ui/
│   │   └── index.ts
│   ├── inbox-page/
│   │   ├── ui/
│   │   └── index.ts
│   └── settings-page/
│       ├── ui/
│       └── index.ts
│
├── widgets/
│   ├── map-view/
│   │   ├── FEATURE.md
│   │   ├── ui/
│   │   │   ├── MapView.tsx
│   │   │   └── MapControls.tsx
│   │   ├── model/
│   │   │   └── useMapState.ts
│   │   └── index.ts
│   ├── prayer-list/
│   │   ├── ui/
│   │   │   └── PrayerList.tsx
│   │   ├── model/
│   │   └── index.ts
│   ├── inbox-thread/
│   │   ├── ui/
│   │   └── index.ts
│   └── notification-panel/
│       ├── ui/
│       └── index.ts
│
├── features/                   # OPTIONAL - Add later
│   ├── prayer-support/
│   │   ├── ui/
│   │   │   └── PrayButton.tsx
│   │   ├── model/
│   │   └── index.ts
│   ├── create-prayer/
│   │   ├── ui/
│   │   ├── model/
│   │   └── index.ts
│   └── media-recorder/
│       ├── ui/
│       └── index.ts
│
├── entities/
│   ├── prayer/
│   │   ├── FEATURE.md
│   │   ├── api/
│   │   │   ├── prayerApi.ts
│   │   │   └── prayerApi.test.ts
│   │   ├── model/
│   │   │   ├── types.ts
│   │   │   ├── store.ts
│   │   │   └── usePrayer.ts
│   │   ├── ui/
│   │   │   ├── PrayerCard.tsx
│   │   │   ├── PrayerMarker.tsx
│   │   │   └── PrayerDetail.tsx
│   │   └── index.ts
│   ├── user/
│   │   ├── FEATURE.md
│   │   ├── api/
│   │   │   └── userApi.ts
│   │   ├── model/
│   │   │   ├── types.ts
│   │   │   └── useAuthStore.ts
│   │   ├── ui/
│   │   │   ├── UserAvatar.tsx
│   │   │   └── UserProfile.tsx
│   │   └── index.ts
│   ├── notification/
│   │   ├── api/
│   │   ├── model/
│   │   ├── ui/
│   │   └── index.ts
│   ├── message/
│   │   ├── api/
│   │   ├── model/
│   │   ├── ui/
│   │   └── index.ts
│   └── location/
│       ├── model/
│       ├── lib/
│       └── index.ts
│
└── shared/
    ├── ui/
    │   ├── button/
    │   │   ├── Button.tsx
    │   │   ├── Button.test.tsx
    │   │   └── index.ts
    │   ├── modal/
    │   ├── input/
    │   └── index.ts            # Export all UI components
    ├── api/
    │   ├── client.ts           # Supabase client setup
    │   ├── types.ts            # Generated types
    │   └── index.ts
    ├── lib/
    │   ├── formatDate.ts
    │   ├── formatDistance.ts
    │   ├── validators.ts
    │   ├── map/
    │   │   ├── geospatial.ts
    │   │   └── index.ts
    │   └── index.ts
    ├── config/
    │   ├── env.ts              # Environment variables
    │   ├── constants.ts
    │   └── index.ts
    └── types/
        └── common.ts           # Shared TypeScript types
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Layer** | Top-level organizational level (7 standardized: app, pages, widgets, features, entities, shared) |
| **Slice** | Business domain partition within a layer (e.g., `prayer`, `user`) |
| **Segment** | Technical purpose division within a slice (e.g., `ui`, `api`, `model`) |
| **Public API** | Explicit exports defined in `index.ts` that other modules can import |
| **Barrel Export** | `index.ts` file that re-exports items from other files |
| **Cross-import** | Import from a slice on the same layer (FORBIDDEN in FSD) |
| **Upward import** | Import from a layer above (FORBIDDEN in FSD) |
| **Steiger** | Official FSD linter for architectural enforcement |
| **FSD 2.1** | Latest version with "pages first" approach (keep more code in pages) |

---

## Appendix C: Common Questions

**Q: Can I use FSD with Next.js?**
A: Yes, but move Next.js `app/` and `pages/` folders to project root. Keep FSD layers in `src/`.

**Q: Do I need all 7 layers?**
A: No. Start with `app`, `pages`, `entities`, `shared`. Add `widgets` and `features` as needed.

**Q: Where does state management go?**
A: In `entities/*/model/` for domain state. In `app/` for global app state.

**Q: Can I skip the features layer?**
A: Yes. Many projects don't need it. Use entities for data, widgets for UI composition.

**Q: What if two entities need each other?**
A: They can't cross-import. Extract shared logic to `shared/` or reconsider entity boundaries.

**Q: How do I handle cross-cutting concerns?**
A: Put in `shared/` if truly generic. Use dependency injection or providers if domain-specific.

**Q: Should tests be in a separate folder?**
A: No. Colocate tests with the code they test (e.g., `PrayerCard.test.tsx` next to `PrayerCard.tsx`).

**Q: Can I rename layers?**
A: Technically yes, but strongly discouraged. Standardization is a key FSD benefit.

**Q: What about monorepos?**
A: Apply FSD within each package/app. FSD is a module structure, not a repo structure.

**Q: How do I handle forms?**
A: Forms go in `features/` if they're user actions. Form UI components go in `shared/ui/`.

---

**Document Status:** Complete
**Total Sources:** 24 credible URLs
**File Location:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/docs/FSD-ARCHITECTURE-RESEARCH.md`
**Verification:** ✅ File created successfully

---

*This research document is intended to guide PrayerMap's adoption of Feature-Sliced Design. It should be read alongside ARTICLE.md (project philosophy) and PROJECT-GUIDE.md (practical implementation).*
