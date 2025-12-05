# Modular Structure Policy

> **STATUS: LAW** - This document defines the mandatory folder structure for PrayerMap. All new code MUST follow this structure. Violations will be caught by ESLint and rejected in code review.

**Effective Date:** December 4, 2025
**Policy Version:** 1.0
**Authority:** CODE-ORGANIZATION-STANDARDS.md (47 sources)

---

## Executive Summary

PrayerMap uses a **feature-based modular architecture**. Code is organized by business domain (prayers, messaging, authentication) rather than by technical type (components, hooks, services).

### The Golden Rules

1. **Features own their code** - Each feature contains its own components, hooks, services, and types
2. **Shared means shared** - Only code used by 3+ features belongs in `shared/`
3. **Public APIs only** - Features export through `index.ts`; no deep imports allowed
4. **Maximum 4 levels** - Never nest folders deeper than 4 levels

---

## Canonical Folder Structure

```
src/
├── app/                           # App-level configuration
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── providers/
│       └── AppProviders.tsx       # Context provider composition
│
├── features/                      # FEATURE MODULES
│   ├── authentication/
│   │   ├── components/
│   │   │   └── AuthModal.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── types/
│   │   │   └── auth.ts
│   │   └── index.ts               # PUBLIC API
│   │
│   ├── prayers/
│   │   ├── components/
│   │   │   ├── PrayerMap.tsx
│   │   │   ├── PrayerMarker.tsx
│   │   │   ├── PrayerDetailModal.tsx
│   │   │   ├── RequestPrayerModal.tsx
│   │   │   ├── PrayerConnection.tsx
│   │   │   ├── PrayerAnimationLayer.tsx
│   │   │   └── PrayerCreationAnimation.tsx
│   │   ├── hooks/
│   │   │   ├── usePrayers.ts
│   │   │   └── usePrayerConnections.ts
│   │   ├── services/
│   │   │   └── prayerService.ts
│   │   ├── types/
│   │   │   └── prayer.ts
│   │   └── index.ts
│   │
│   ├── messaging/
│   │   ├── components/
│   │   │   ├── ConversationThread.tsx
│   │   │   └── InboxModal.tsx
│   │   ├── hooks/
│   │   │   ├── useConversation.ts
│   │   │   └── useInbox.ts
│   │   ├── services/
│   │   │   └── messageService.ts
│   │   ├── types/
│   │   │   └── messaging.ts
│   │   └── index.ts
│   │
│   ├── media/
│   │   ├── components/
│   │   │   ├── AudioPlayer.tsx
│   │   │   ├── AudioRecorder.tsx
│   │   │   ├── AudioMessagePlayer.tsx
│   │   │   ├── VideoRecorder.tsx
│   │   │   └── VideoMessagePlayer.tsx
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.ts
│   │   │   └── useVideoRecorder.ts
│   │   ├── services/
│   │   │   └── storageService.ts
│   │   └── index.ts
│   │
│   ├── map/
│   │   ├── components/
│   │   │   ├── EtherealMap.tsx
│   │   │   ├── MapDebug.tsx
│   │   │   └── SunMoonIndicator.tsx
│   │   └── index.ts
│   │
│   └── settings/
│       ├── components/
│       │   └── SettingsScreen.tsx
│       └── index.ts
│
├── shared/                        # SHARED CODE (3+ feature usage)
│   ├── components/
│   │   ├── ui/                    # Primitive UI atoms
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── Textarea.tsx
│   │   │   └── index.ts
│   │   ├── LoadingScreen.tsx
│   │   ├── InfoModal.tsx
│   │   └── figma/
│   │       └── ImageWithFallback.tsx
│   │
│   ├── hooks/                     # Utility hooks (useDebounce, etc.)
│   │   └── index.ts
│   │
│   ├── lib/                       # Third-party integrations
│   │   ├── supabase.ts
│   │   ├── datadog.ts
│   │   └── prayerAdapters.ts
│   │
│   ├── services/
│   │   └── userService.ts         # Cross-feature user operations
│   │
│   └── types/
│       ├── database.ts            # Supabase generated types
│       └── common.ts              # Shared type utilities
│
└── styles/
    ├── index.css
    └── globals.css
```

---

## Feature Module Structure

Every feature module MUST follow this structure:

```
features/{feature-name}/
├── components/          # Feature-specific UI components
│   ├── ComponentName.tsx
│   └── ComponentName.test.tsx (colocated)
│
├── hooks/              # Feature-specific hooks
│   └── useFeatureHook.ts
│
├── services/           # Feature-specific API/business logic
│   └── featureService.ts
│
├── contexts/           # Feature-specific React contexts (if needed)
│   └── FeatureContext.tsx
│
├── types/              # Feature-specific TypeScript types
│   └── feature.ts
│
├── utils/              # Feature-specific utilities (if needed)
│   └── featureHelpers.ts
│
└── index.ts            # PUBLIC API - ONLY EXPORT POINT
```

### The index.ts Public API

Every feature MUST have an `index.ts` that explicitly exports its public API:

```typescript
// features/authentication/index.ts

// Components
export { AuthModal } from './components/AuthModal';

// Hooks
export { useAuth } from './hooks/useAuth';

// Contexts
export { AuthProvider, useAuthContext } from './contexts/AuthContext';

// Types
export type { User, AuthState, LoginCredentials } from './types/auth';

// DO NOT export internal implementation details:
// - Private helper functions
// - Internal sub-components
// - Implementation-specific types
```

---

## Import Rules

### Allowed Imports

```typescript
// ✅ ALLOWED: Import from feature public API
import { useAuth, AuthModal } from '@features/authentication';

// ✅ ALLOWED: Import from shared
import { Button, Input } from '@shared/components/ui';
import { supabase } from '@shared/lib/supabase';

// ✅ ALLOWED: Import within same feature (relative)
import { formatPrayer } from '../utils/formatters';
import { PrayerCard } from './PrayerCard';

// ✅ ALLOWED: External packages
import { motion } from 'framer-motion';
import { useState } from 'react';
```

### Forbidden Imports

```typescript
// ❌ FORBIDDEN: Deep import into feature
import { useAuth } from '@features/authentication/hooks/useAuth';

// ❌ FORBIDDEN: Cross-feature import bypassing public API
import { PrayerCard } from '@features/prayers/components/PrayerCard';

// ❌ FORBIDDEN: Feature importing from another feature's internals
import { formatPrayer } from '@features/prayers/utils/formatters';

// ❌ FORBIDDEN: Shared importing from features
// (shared/ must never depend on features/)
```

### Import Order

Imports MUST be ordered as follows:

```typescript
// 1. External packages
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// 2. Shared modules
import { Button } from '@shared/components/ui';
import { supabase } from '@shared/lib/supabase';

// 3. Feature modules (through public API)
import { useAuth } from '@features/authentication';

// 4. Relative imports (same feature)
import { PrayerCard } from './PrayerCard';
import type { Prayer } from '../types/prayer';
```

---

## Decision Trees

### Where Should This Code Live?

```
Is this a React component?
│
├─ Yes → Does it have business logic specific to one feature?
│   │
│   ├─ Yes → features/{feature}/components/
│   │
│   └─ No → Is it a primitive UI element (Button, Input, etc.)?
│       │
│       ├─ Yes → shared/components/ui/
│       │
│       └─ No → Is it used by 3+ features?
│           │
│           ├─ Yes → shared/components/
│           │
│           └─ No → Keep in the primary feature that uses it
│
└─ No → Is it a custom hook?
    │
    ├─ Yes → Does it contain feature-specific logic?
    │   │
    │   ├─ Yes → features/{feature}/hooks/
    │   │
    │   └─ No → shared/hooks/
    │
    └─ No → Is it a service/API layer?
        │
        ├─ Yes → Does it serve one feature?
        │   │
        │   ├─ Yes → features/{feature}/services/
        │   │
        │   └─ No → shared/services/
        │
        └─ No → Is it a type definition?
            │
            ├─ Yes → Is it feature-specific?
            │   │
            │   ├─ Yes → features/{feature}/types/
            │   │
            │   └─ No → shared/types/
            │
            └─ No → Probably shared/lib/ or shared/utils/
```

### When to Create a New Feature Module?

```
Do you have 5+ related files (components, hooks, services)?
│
├─ Yes → Create a feature module
│
└─ No → Is it a distinct business domain?
    │
    ├─ Yes → Create a feature module (even if small, it will grow)
    │
    └─ No → Add to existing feature or shared/
```

### When to Promote Code to Shared?

```
Is this code currently in a feature?
│
├─ Yes → Is it now used by 3+ features?
│   │
│   ├─ Yes → Move to shared/
│   │   └─ But first, remove any feature-specific business logic
│   │
│   └─ No → Keep in feature (duplication is OK for 2 features)
│
└─ No → Is it a utility with no business logic?
    │
    ├─ Yes → shared/ is appropriate
    │
    └─ No → Should probably be in a feature
```

---

## File Naming Conventions

### Components (PascalCase.tsx)

```
✅ CORRECT                    ❌ WRONG
AuthModal.tsx                 authModal.tsx
PrayerDetailModal.tsx         prayer-detail-modal.tsx
ConversationThread.tsx        conversationThread.tsx
```

### Hooks (camelCase.ts, prefix with 'use')

```
✅ CORRECT                    ❌ WRONG
useAuth.ts                    UseAuth.ts
usePrayers.ts                 use-prayers.ts
useConversation.ts            useConversationHook.ts
```

### Services (camelCase.ts, suffix with 'Service')

```
✅ CORRECT                    ❌ WRONG
prayerService.ts              PrayerService.ts
messageService.ts             message-service.ts
storageService.ts             storage.service.ts
```

### Types (camelCase.ts, domain-named)

```
✅ CORRECT                    ❌ WRONG
prayer.ts                     Prayer.ts
messaging.ts                  types.ts (too generic)
auth.ts                       AuthTypes.ts
```

### Folders (kebab-case for features, PascalCase for component folders)

```
✅ CORRECT                    ❌ WRONG
features/authentication/      features/Authentication/
features/prayers/             features/Prayers/
components/PrayerCard/        components/prayer-card/
```

---

## Supabase Functions Structure

```
supabase/functions/
├── _shared/                       # Shared utilities
│   ├── core/                      # Core infrastructure
│   │   ├── cors.ts
│   │   ├── config.ts
│   │   └── health-check.ts
│   │
│   ├── observability/             # Monitoring & metrics
│   │   ├── datadog-metrics.ts
│   │   ├── datadog-monitors.ts
│   │   ├── datadog-dashboard.ts
│   │   └── ingestion-metrics.ts
│   │
│   ├── rag/                       # RAG pipeline components
│   │   ├── chunking.ts
│   │   ├── cohere.ts
│   │   ├── hybrid-search.ts
│   │   ├── pinecone-inference.ts
│   │   ├── query-decomposition.ts
│   │   ├── query-expansion.ts
│   │   ├── query-pipeline.ts
│   │   ├── rerank.ts
│   │   ├── sparse-embedding.ts
│   │   └── tokenizer.ts
│   │
│   ├── ingestion/                 # Data ingestion
│   │   ├── batch-processor.ts
│   │   ├── deduplication.ts
│   │   ├── ingestion-pipeline.ts
│   │   └── rate-limiter.ts
│   │
│   └── ai/                        # AI/ML utilities
│       ├── intent-detection.ts
│       ├── recency.ts
│       └── feature-flags.ts
│
├── alpha-calibration/
│   └── index.ts
├── collect-data/
│   └── index.ts
├── process-ingestion/
│   └── index.ts
└── query-memory/
    └── index.ts
```

---

## Migration Guide

### Phase 1: Preparation

1. **Create folder structure** (no file moves yet)
```bash
mkdir -p src/app/providers
mkdir -p src/features/{authentication,prayers,messaging,media,map,settings}/{components,hooks,services,types}
mkdir -p src/shared/{components/ui,hooks,lib,services,types}
```

2. **Add path aliases to tsconfig.json**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"],
      "@app/*": ["src/app/*"]
    }
  }
}
```

3. **Update vite.config.ts**
```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@app': path.resolve(__dirname, './src/app'),
    },
  },
});
```

### Phase 2: Feature-by-Feature Migration

**Order of migration** (least to most dependent):

1. **settings/** - 1 component, no dependencies
2. **map/** - 3 components, minimal coupling
3. **media/** - 5 components + 2 hooks, isolated domain
4. **authentication/** - 1 component + 1 context + 1 hook
5. **messaging/** - 2 components + 2 hooks + 1 service
6. **prayers/** - 7 components + 2 hooks + 1 service

**For each feature:**

```bash
# 1. Move files (preserves git history)
git mv src/components/SettingsScreen.tsx src/features/settings/components/

# 2. Create index.ts
echo "export { SettingsScreen } from './components/SettingsScreen';" > src/features/settings/index.ts

# 3. Update imports in the moved file

# 4. Update all consuming files to use public API

# 5. Build and test
npm run build

# 6. Commit
git add -A && git commit -m "feat: migrate settings to feature module"
```

### Phase 3: Shared Consolidation

```bash
# Move UI components
git mv src/components/ui/* src/shared/components/ui/

# Move shared components
git mv src/components/LoadingScreen.tsx src/shared/components/
git mv src/components/InfoModal.tsx src/shared/components/

# Move lib
git mv src/lib/* src/shared/lib/

# Move shared types
git mv src/types/database.ts src/shared/types/

# Move shared services
git mv src/services/userService.ts src/shared/services/
```

### Phase 4: Cleanup

```bash
# Remove empty folders
rm -rf src/components
rm -rf src/hooks
rm -rf src/services
rm -rf src/types
rm -rf src/lib
rm -rf src/contexts

# Update App.tsx location
git mv src/App.tsx src/app/App.tsx
git mv src/main.tsx src/app/main.tsx
```

---

## ESLint Enforcement

Add to `eslint.config.js`:

```javascript
import checkFile from 'eslint-plugin-check-file';

export default [
  {
    plugins: {
      'check-file': checkFile,
    },
    rules: {
      // Enforce file naming
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.tsx': 'PASCAL_CASE',
          '**/*.ts': 'CAMEL_CASE',
        },
        { ignoreMiddleExtensions: true }
      ],

      // Enforce folder naming
      'check-file/folder-naming-convention': [
        'error',
        {
          'src/features/**/': 'KEBAB_CASE',
          'src/shared/components/**/': 'PASCAL_CASE',
        }
      ],
    },
  },
  {
    // Restrict imports
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@features/*/components/*', '@features/*/hooks/*', '@features/*/services/*'],
              message: 'Import from feature public API (@features/featureName) instead of deep imports.',
            },
          ],
        },
      ],
    },
  },
];
```

---

## Verification Checklist

Before merging any PR, verify:

- [ ] New components are in correct feature or shared folder
- [ ] Feature has index.ts with explicit exports
- [ ] No deep imports into features
- [ ] Import order is correct (external → shared → features → relative)
- [ ] File naming follows conventions
- [ ] Tests are colocated with components
- [ ] No circular dependencies between features

---

## Violations and Corrections

### Violation: Deep Import

```typescript
// ❌ VIOLATION
import { useAuth } from '@features/authentication/hooks/useAuth';

// ✅ CORRECTION
import { useAuth } from '@features/authentication';
```

### Violation: Feature-Specific Code in Shared

```typescript
// ❌ VIOLATION: Prayer-specific logic in shared
// shared/utils/prayerFormatter.ts

// ✅ CORRECTION: Move to feature
// features/prayers/utils/prayerFormatter.ts
```

### Violation: Wrong File Location

```typescript
// ❌ VIOLATION: Hook in components folder
// features/prayers/components/usePrayers.ts

// ✅ CORRECTION: Move to hooks folder
// features/prayers/hooks/usePrayers.ts
```

### Violation: Missing Public API

```typescript
// ❌ VIOLATION: No index.ts, direct imports happening
// import { PrayerCard } from '@features/prayers/components/PrayerCard';

// ✅ CORRECTION: Create index.ts and export
// features/prayers/index.ts
export { PrayerCard } from './components/PrayerCard';

// Then import via public API
import { PrayerCard } from '@features/prayers';
```

---

## Related Documents

- **[CODE-ORGANIZATION-STANDARDS.md](./CODE-ORGANIZATION-STANDARDS.md)** - Research foundation (47 sources)
- **[CLAUDE.md](./CLAUDE.md)** - Project overview and principles
- **[ARTICLE.md](./ARTICLE.md)** - Operational philosophy

---

**This policy is LAW. All code must comply.**

*Last Updated: December 4, 2025*
