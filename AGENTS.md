# AGENTS.md - PrayerMap AI Coding Agent Guidelines

> A structured guide for AI coding agents working on the PrayerMap codebase.
> This file follows the [AGENTS.md specification](https://agents.md/) for AI-assisted development.

---

## Project Overview

**PrayerMap** is a location-based spiritual platform enabling users to share prayer requests and support one another through a map interface. The project consists of:

- **Main App** (`/src`): React + TypeScript + Vite web application
- **Admin Dashboard** (`/admin`): Separate React admin application
- **Backend**: Supabase (PostgreSQL + PostGIS + Auth + Storage)
- **Mobile**: Capacitor wrapper for iOS/Android deployment

**Live URL**: https://prayermap.net

---

## Quick Start Commands

```bash
# Install dependencies
npm install
cd admin && npm install

# Development
npm run dev           # Main app on localhost:5173
cd admin && npm run dev  # Admin on localhost:5174

# Build
npm run build         # Production build to dist/
cd admin && npm run build

# Type checking
npm run typecheck     # TypeScript validation

# Linting
npm run lint          # ESLint check

# Mobile (after Capacitor setup)
npx cap sync          # Sync web assets to native
npx cap open ios      # Open in Xcode
npx cap open android  # Open in Android Studio
```

---

## Testing

```bash
# Run Playwright tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test tests/prayers.spec.ts
```

**Test file location**: `tests/` directory
**Test naming convention**: `*.spec.ts`

---

## Project Structure

```
prayermap/
├── src/                    # Main React application
│   ├── components/         # React components
│   │   ├── ui/            # Shadcn-style base components
│   │   └── *.tsx          # Feature components
│   ├── contexts/          # React contexts (AuthContext)
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API/data services
│   ├── lib/               # Utilities (supabase client)
│   ├── types/             # TypeScript type definitions
│   └── App.tsx            # Root component
├── admin/                  # Admin dashboard (separate app)
│   └── src/               # Same structure as main
├── supabase/              # Database migrations & seeds
├── .cursor/               # Cursor IDE configuration
│   └── rules/             # Modular .mdc rule files
├── ios/                   # iOS native project (Capacitor)
├── android/               # Android native project (Capacitor)
└── docs/                  # Additional documentation
```

---

## Code Style Guidelines

### TypeScript
- Use `interface` over `type` for object shapes
- Avoid `enum`, use const objects or union types
- Enable strict mode (already configured)
- Use descriptive names with auxiliary verbs: `isLoading`, `hasError`, `canSubmit`

### React Components
- Use functional components with TypeScript interfaces
- File structure: exported component, subcomponents, helpers, types
- Use named exports for components
- Collocate types at bottom of file or in `types/` folder

### Naming Conventions
- **Files**: PascalCase for components (`PrayerCard.tsx`), camelCase for utilities (`prayerService.ts`)
- **Variables/Functions**: camelCase (`getUserPrayers`, `isAuthenticated`)
- **Types/Interfaces**: PascalCase (`Prayer`, `UserProfile`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_AUDIO_DURATION`)

### Imports
```typescript
// Order: React, external libs, internal absolute, relative
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Prayer } from '@/types/prayer';
import { PrayerCard } from './PrayerCard';
```

---

## Git Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code improvements
- `mobile/description` - Mobile-specific work
- `claude/*` - AI agent branches (auto-generated)

### Commit Messages
```
<type>: <description>

Types: feat, fix, refactor, docs, style, test, chore
Examples:
- feat: Add audio prayer recording
- fix: Resolve map marker clustering
- refactor: Extract prayer validation logic
```

### Pull Request Guidelines
- Clear title describing the change
- Summary of what and why
- Test plan with verification steps
- Link related issues

---

## Boundaries - What NOT to Touch

### Never Modify
- `.env` files (contains secrets)
- `supabase/` migrations without explicit approval
- Production database directly
- Authentication/RLS policies without security review
- Third-party API keys or credentials

### Ask First
- Database schema changes
- Authentication flow modifications
- Payment/billing related code
- User data deletion logic
- Major architectural changes

### Safe to Modify
- UI components and styling
- New feature implementations
- Bug fixes in existing code
- Test files
- Documentation

---

## Architecture Decisions

### State Management
- **Zustand** for global state (lightweight, simple)
- **React Query** for server state (caching, refetching)
- **React Context** for auth state only
- Avoid Redux unless absolutely necessary

### Data Fetching
```typescript
// Use React Query for all API calls
const { data, isLoading, error } = useQuery({
  queryKey: ['prayers', location],
  queryFn: () => prayerService.getNearbyPrayers(location),
});
```

### Forms
- **React Hook Form** for form state
- **Zod** for validation schemas
- Validate on blur, not on change

### Styling
- **TailwindCSS** for all styling
- Use existing design tokens from `tailwind.config.js`
- Glassmorphic effects: `.glass`, `.glass-strong`, `.glass-subtle`
- Custom colors: `heavenly-blue`, `dawn-gold`, `prayer-purple`

---

## Supabase Patterns

### Client Usage
```typescript
import { supabase } from '@/lib/supabase';

// Queries
const { data, error } = await supabase
  .from('prayers')
  .select('*')
  .eq('status', 'ACTIVE');

// RPC functions (preferred for complex queries)
const { data, error } = await supabase
  .rpc('get_nearby_prayers', {
    lat: 37.7749,
    lng: -122.4194,
    radius_km: 48
  });
```

### Row Level Security
- All tables have RLS enabled
- Never bypass RLS in client code
- Test queries as authenticated and anonymous users

### Storage
```typescript
// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('prayers')
  .upload(`audio/${filename}`, file);
```

---

## Mobile Development (Capacitor)

### Setup Commands
```bash
npm install @capacitor/core @capacitor/cli
npx cap init PrayerMap net.prayermap.app --web-dir dist

# Add platforms
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

### Sync After Build
```bash
npm run build && npx cap sync
```

### Native Plugins
```bash
# Camera for video prayers
npm install @capacitor/camera

# Geolocation for prayer posting
npm install @capacitor/geolocation

# Push notifications
npm install @capacitor/push-notifications

# Haptics for feedback
npm install @capacitor/haptics
```

### Platform-Specific Code
```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // Native-specific code
} else {
  // Web fallback
}
```

---

## Multi-Agent Orchestration

When working with multiple AI agents, follow these patterns:

### Agent Roles
1. **Planner**: Breaks down tasks, creates implementation plans
2. **Frontend**: React components, UI/UX, styling
3. **Backend**: Supabase queries, RPC functions, data layer
4. **Mobile**: Capacitor integration, native features
5. **Testing**: Playwright tests, quality assurance
6. **Reviewer**: Code review, security audit

### Handoff Protocol
```markdown
## Agent Handoff

**From**: [Agent Role]
**To**: [Next Agent Role]

### Completed
- [x] Task 1
- [x] Task 2

### Changes Made
- file1.tsx: Added component
- file2.ts: Fixed bug

### Open Questions
1. Question needing clarification

### Next Steps
1. What the next agent should do
2. Dependencies or blockers
```

### Coordination Files
- Use `.cursor/rules/agent-orchestration.mdc` for coordination
- Document decisions in code comments with `// AGENT:` prefix
- Mark incomplete work with `// TODO(agent):` comments

---

## Error Handling

```typescript
// Use early returns for error conditions
async function getPrayer(id: string): Promise<Prayer | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from('prayers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch prayer:', error);
    return null;
  }

  return data;
}
```

### Error Boundaries
- Wrap routes with error boundaries
- Use Sonner for toast notifications
- Log errors to console in development

---

## Performance Guidelines

### React Optimization
- Use `React.memo()` for expensive components
- Use `useMemo()` and `useCallback()` appropriately
- Avoid inline object/array creation in render
- Lazy load routes with `React.lazy()`

### Bundle Size
- Tree-shake unused imports
- Use dynamic imports for large libraries
- Monitor bundle with `npm run build -- --analyze`

### Map Performance
- Cluster markers when zoomed out
- Limit prayers fetched to viewport + buffer
- Debounce map move events (300ms)

---

## Security Checklist

Before any PR:
- [ ] No secrets in code or commits
- [ ] User input is validated (Zod schemas)
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (React auto-escapes, no dangerouslySetInnerHTML)
- [ ] Auth checks in place for protected routes
- [ ] RLS policies verified for data access

---

## Helpful Resources

- **PRD**: `PrayerMap_PRD_v2.md` - Full product requirements
- **API Spec**: `prayermap_api_spec_v2.md` - API documentation
- **Schema**: `prayermap_schema_v2.sql` - Database structure
- **Deployment**: `DEPLOYMENT_INSTRUCTIONS.md` - Deploy guide
- **Cursor Rules**: `.cursor/rules/` - AI coding rules

---

## Contact & Support

For questions about the codebase, review existing documentation first:
1. This file (AGENTS.md)
2. README.md
3. PRD and technical specs in root directory
4. Inline code comments

---

*Last updated: November 2024*
*Maintained for AI coding agent compatibility*
