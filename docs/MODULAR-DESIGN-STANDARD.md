# Modular Design Standard - PrayerMap

> **PURPOSE:** This document defines the OFFICIAL folder structure and code organization rules for PrayerMap. All AI agents and developers MUST follow these standards.

> **RESEARCH BACKING:** Synthesized from 71 sources across 2 research documents (FSD-ARCHITECTURE-RESEARCH.md, CODE-ORGANIZATION-STANDARDS.md)

---

## Executive Summary

PrayerMap uses a **Feature-Sliced Design (FSD)** architecture adapted for our React + Supabase stack. This provides:

1. **Clear boundaries** - Each module has explicit public APIs
2. **AI-navigable structure** - FEATURE.md files guide agents
3. **Dependency direction** - Imports flow DOWN only
4. **Business domain focus** - Code organized by what it does, not what it is

---

## The Golden Rules

### Rule 1: Dependency Direction (NEVER VIOLATE)

```
app → pages → widgets → features → entities → shared
 ↓      ↓        ↓         ↓          ↓         ↓
CAN IMPORT FROM ANY LAYER TO THE RIGHT →→→→→→→→→
```

**A module can ONLY import from layers BELOW it.**

```typescript
// entities/prayer can import from:
import { Button } from '@/shared/ui'       // ALLOWED

// entities/prayer CANNOT import from:
import { MapView } from '@/widgets/map'     // FORBIDDEN
import { User } from '@/entities/user'      // FORBIDDEN (same layer)
```

### Rule 2: Public API Through Index Files

Every slice exports through `index.ts`. Import from the slice root, NEVER internal files.

```typescript
// CORRECT
import { PrayerCard, usePrayer } from '@/entities/prayer'

// WRONG - bypasses public API
import { PrayerCard } from '@/entities/prayer/ui/PrayerCard'
```

### Rule 3: File Naming

| File Type | Convention | Example |
|-----------|------------|---------|
| React Components | PascalCase.tsx | `PrayerCard.tsx` |
| Hooks | camelCase.ts | `usePrayer.ts` |
| Services/Utils | camelCase.ts | `prayerService.ts` |
| Types | camelCase.ts | `types.ts` |
| Tests | *.test.tsx | `PrayerCard.test.tsx` |

### Rule 4: FEATURE.md in Every Slice

Every slice MUST have a `FEATURE.md` file that AI agents read FIRST:

```markdown
# Prayer Entity

## Purpose
Represents prayer requests in the system.

## Public API
- `PrayerCard` - Display component for prayers
- `usePrayer` - Hook for prayer state
- `Prayer` - TypeScript type

## Dependencies
- shared/ui (Button, Modal)
- shared/api (apiClient)

## Internal Structure
- ui/ - Visual components
- model/ - Types and stores
- api/ - Backend calls
```

---

## Folder Structure

```
src/
├── app/                          # Layer 1: Application bootstrap
│   ├── providers/                # Context providers
│   │   └── index.tsx
│   ├── router/                   # Route configuration
│   │   └── index.tsx
│   ├── styles/                   # Global CSS
│   │   └── globals.css
│   └── index.tsx                 # Entry point
│
├── pages/                        # Layer 2: Page compositions
│   ├── map-page/
│   │   ├── FEATURE.md
│   │   ├── ui/
│   │   │   └── MapPage.tsx
│   │   └── index.ts
│   ├── prayer-detail/
│   ├── inbox/
│   └── settings/
│
├── widgets/                      # Layer 3: Large UI blocks
│   ├── map-view/
│   │   ├── FEATURE.md
│   │   ├── ui/
│   │   │   └── MapView.tsx
│   │   ├── model/
│   │   │   └── useMapState.ts
│   │   └── index.ts
│   ├── prayer-list/
│   ├── inbox-thread/
│   └── header/
│
├── features/                     # Layer 4: User interactions
│   ├── prayer-support/           # "Pray for this" action
│   │   ├── FEATURE.md
│   │   ├── ui/
│   │   ├── model/
│   │   └── index.ts
│   ├── create-prayer/
│   ├── location-picker/
│   └── media-recorder/
│
├── entities/                     # Layer 5: Business concepts
│   ├── prayer/
│   │   ├── FEATURE.md
│   │   ├── api/
│   │   │   └── prayerApi.ts
│   │   ├── model/
│   │   │   ├── types.ts
│   │   │   └── usePrayerStore.ts
│   │   ├── ui/
│   │   │   ├── PrayerCard.tsx
│   │   │   └── PrayerMarker.tsx
│   │   └── index.ts
│   ├── user/
│   ├── notification/
│   ├── message/
│   └── location/
│
├── shared/                       # Layer 6: Reusable utilities
│   ├── ui/                       # UI Kit
│   │   ├── button/
│   │   │   ├── Button.tsx
│   │   │   └── index.ts
│   │   ├── modal/
│   │   ├── input/
│   │   └── index.ts
│   ├── api/                      # API client
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── lib/                      # Utilities
│   │   ├── formatDate.ts
│   │   ├── geolocation.ts
│   │   └── index.ts
│   ├── config/                   # Configuration
│   │   ├── env.ts
│   │   └── index.ts
│   └── types/                    # Common types
│       └── common.ts
│
└── supabase/                     # Backend (outside FSD)
    ├── functions/
    └── migrations/
```

---

## Layer Definitions

### Layer 1: App
**Purpose:** Application initialization - providers, routing, global styles.
**Has slices:** No
**PrayerMap examples:** AuthProvider, QueryProvider, MapboxProvider

### Layer 2: Pages
**Purpose:** Full page components, one per route.
**Has slices:** Yes (one per page)
**PrayerMap examples:** MapPage, InboxPage, SettingsPage

### Layer 3: Widgets
**Purpose:** Large, self-sufficient UI blocks used across pages.
**Has slices:** Yes
**PrayerMap examples:** MapView (with markers), PrayerList, InboxThread

### Layer 4: Features
**Purpose:** User interactions with business value.
**Has slices:** Yes
**PrayerMap examples:** PrayerSupport (the pray action), CreatePrayer, MediaRecorder

### Layer 5: Entities
**Purpose:** Business domain concepts - data + display.
**Has slices:** Yes
**PrayerMap examples:** Prayer, User, Notification, Message

### Layer 6: Shared
**Purpose:** Reusable code with no business logic.
**Has slices:** No
**PrayerMap examples:** Button, Modal, apiClient, formatDate

---

## Segment Structure Within Slices

Each slice uses these standard segments:

```
entities/prayer/
├── FEATURE.md          # AI reads this FIRST
├── api/                # Backend interactions
│   └── prayerApi.ts
├── model/              # Data model, stores, types
│   ├── types.ts
│   └── usePrayerStore.ts
├── ui/                 # Visual components
│   ├── PrayerCard.tsx
│   └── PrayerMarker.tsx
├── lib/                # Slice-specific helpers (optional)
│   └── formatPrayer.ts
└── index.ts            # PUBLIC API (required)
```

### Segment Naming Rules

Name segments by PURPOSE, not by what they contain:

```
GOOD: api/, model/, ui/, lib/, config/
BAD: hooks/, components/, types/, utils/
```

---

## Public API Pattern

### index.ts Template

```typescript
// entities/prayer/index.ts

// Components
export { PrayerCard } from './ui/PrayerCard'
export { PrayerMarker } from './ui/PrayerMarker'

// Hooks
export { usePrayerStore } from './model/usePrayerStore'

// API functions
export { fetchPrayers, createPrayer } from './api/prayerApi'

// Types
export type { Prayer, PrayerStatus, CreatePrayerDto } from './model/types'

// DO NOT export internal helpers
// formatPrayerForDisplay is internal - not in index.ts
```

### What to Export vs Keep Internal

| Export (Public API) | Keep Internal |
|---------------------|---------------|
| Main components | Helper sub-components |
| Primary hooks | Internal state logic |
| Type definitions | Implementation details |
| API functions | Utility functions |

---

## Component Organization

### Atomic Design Within shared/ui

```
shared/ui/
├── atoms/              # Primitives
│   ├── Button/
│   ├── Input/
│   └── Icon/
├── molecules/          # Atom combinations
│   ├── FormField/
│   ├── SearchBar/
│   └── GlassCard/
└── index.ts
```

### Component Folder Structure

For components with multiple files:

```
Button/
├── Button.tsx          # Main component
├── Button.test.tsx     # Tests (colocated)
├── Button.module.css   # Styles (if needed)
├── types.ts            # Component types
└── index.ts            # Export
```

For simple components (< 50 lines):

```
shared/ui/
├── Badge.tsx           # Single file is fine
├── Divider.tsx
└── Spinner.tsx
```

---

## Import Order

Enforce consistent import ordering:

```typescript
// 1. React/framework
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// 2. Layers (top to bottom)
import { MapView } from '@/widgets/map-view'
import { PrayerCard } from '@/entities/prayer'
import { Button } from '@/shared/ui'
import { formatDate } from '@/shared/lib'

// 3. Relative imports (same slice)
import { usePrayerFilters } from './model/usePrayerFilters'
import type { PrayerListProps } from './types'
```

---

## Migration Strategy

### Current → FSD Migration (7 Weeks)

**Weeks 1-2: Foundation**
- Create `app/` and `shared/` layers
- Move global providers to `app/providers/`
- Move UI kit to `shared/ui/`

**Weeks 3-4: Entities**
- Create `entities/` layer
- Migrate prayer, user, notification types and stores
- Add FEATURE.md files

**Weeks 5-6: Composition**
- Create `pages/` and `widgets/` layers
- Refactor page components
- Extract reusable widgets

**Week 7: Enforcement**
- Install Steiger linter
- Add ESLint rules for import order
- Update CI to enforce rules

---

## Enforcement

### Steiger Linter

```bash
npm install -D steiger @feature-sliced/steiger-plugin
```

### ESLint Import Rules

```javascript
// .eslintrc.js
rules: {
  'import/order': ['error', {
    groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
    pathGroups: [
      { pattern: '@/app/**', group: 'internal', position: 'before' },
      { pattern: '@/pages/**', group: 'internal', position: 'before' },
      { pattern: '@/widgets/**', group: 'internal', position: 'before' },
      { pattern: '@/features/**', group: 'internal', position: 'before' },
      { pattern: '@/entities/**', group: 'internal', position: 'before' },
      { pattern: '@/shared/**', group: 'internal', position: 'before' },
    ],
    'newlines-between': 'always',
  }]
}
```

---

## Quick Reference

### Decision Trees

**Where does this component go?**
```
Is it used across the entire app (header, footer)?
  → widgets/

Does it represent a business concept (Prayer, User)?
  → entities/

Is it a user action with business value (like, share)?
  → features/

Is it a generic UI element (Button, Modal)?
  → shared/ui/

Is it a full page?
  → pages/
```

**Should I export this?**
```
Will other slices need to use it?
  → Yes: Export in index.ts
  → No: Keep internal
```

### Common Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Importing from internal files | Import from slice index.ts |
| Cross-importing same layer | Move shared code to lower layer |
| Putting business logic in shared | Move to entities or features |
| Huge shared/ui folder | Split into atoms/molecules |
| No FEATURE.md files | Add to every slice |

---

## Sources

This standard synthesizes findings from:

- **FSD Official Documentation:** https://feature-sliced.design/
- **Bulletproof React:** https://github.com/alan2207/bulletproof-react
- **71 research sources** documented in:
  - `docs/FSD-ARCHITECTURE-RESEARCH.md` (24 sources)
  - `docs/CODE-ORGANIZATION-STANDARDS.md` (47 sources)

---

**Last Updated:** 2025-12-04
**Version:** 1.0
**Status:** Active Standard
