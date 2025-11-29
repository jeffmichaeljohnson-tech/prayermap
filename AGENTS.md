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

## Core Principles (MANDATORY)

These principles guide every decision in PrayerMap development. They are non-negotiable.

### 1. Research-Driven Development

**ALWAYS consult the most recent official documentation before making decisions.**

- Read thoroughly, understand deeply, never use outdated information
- Verify source credibility before implementing any solution
- When uncertain, research first, implement second

**Source Credibility Tiers:**

- **TIER 1 (Required)**: Official vendor documentation
  - React docs, Supabase docs, Capacitor docs, TailwindCSS docs
  - Always the first place to look
  - Always the final authority

- **TIER 2 (Trusted)**: Industry leaders
  - Apple Developer Documentation
  - Google Developer Documentation
  - Meta/React Team
  - Anthropic Documentation
  - Stripe Documentation
  - Organizations with proven track records

- **TIER 3 (Verified)**: World-class experts
  - Recognized experts with proven track records
  - Maintainers of major open-source projects
  - Published authors in technical fields
  - Must verify credentials and recency

- **REJECTED**:
  - Random blog posts
  - Unverified Stack Overflow answers
  - Outdated tutorials (>2 years old)
  - AI-generated content without verification
  - "Quick fix" solutions without understanding

### 2. iOS & Android Deployment

**Capacitor deployment to native mobile platforms is our target.**

- Every technical decision must work on mobile (iOS and Android)
- Web-only solutions that break mobile functionality are REJECTED
- Test on actual devices or simulators, not just browser
- Use Capacitor plugins for native features (Camera, Geolocation, Haptics)
- Platform-specific code is acceptable when necessary
- Progressive enhancement: web works, mobile excels

### 3. Living, Breathing App

**The app must feel alive, responsive, and delightful.**

- **FAST Performance** (non-negotiable)
  - <100ms response to user interaction
  - <2s initial load time
  - Optimize bundle size aggressively
  - Lazy load everything possible

- **HIGHLY ANIMATED** (Framer Motion everywhere appropriate)
  - Page transitions
  - Component enter/exit animations
  - Micro-interactions on buttons, cards, inputs
  - Map marker animations
  - Loading states with purpose

- **INTERACTIVE** (responds to every touch)
  - Haptic feedback on mobile
  - Visual feedback on all interactions
  - Optimistic UI updates
  - No dead taps or clicks

- **Tasteful Motion**
  - Animations differentiate us from competitors
  - Motion with purpose, not decoration
  - Respect reduced motion preferences
  - Spring physics over linear easing

### 4. Minimal Steps UX

**Friction is the enemy. Every extra step loses users.**

- Count user taps/clicks for every flow
- Fewer steps = better conversion and engagement
- Question every modal, every confirmation, every extra screen
- Inline editing over modal dialogs
- Smart defaults over configuration
- One-tap actions wherever possible

**Examples:**
- ❌ Bad: Tap "Add Prayer" → Modal → Fill form → Tap "Next" → Confirm → Success screen (5 steps)
- ✅ Good: Tap map → Inline form appears → Tap "Post" (2 steps)

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

#### 1. Planner Agent
**Role**: `planner`

**Responsibilities:**
- Break down complex tasks into actionable steps
- Create implementation plans with dependencies
- Identify potential blockers early
- Coordinate between multiple agents
- Estimate effort and complexity

**Triggers:**
- New feature request
- Large refactoring task
- Multi-agent coordination needed
- Complex architectural decision

---

#### 2. Frontend Agent
**Role**: `frontend`

**Responsibilities:**
- React components, hooks, contexts
- UI/UX implementation
- TailwindCSS styling and animations
- Framer Motion integration
- Client-side state management
- Accessibility compliance

**Key Focus:**
- Follow Core Principle #3 (Living, Breathing App)
- Every component should be animated appropriately
- Responsive design (mobile-first)

---

#### 3. Backend Agent
**Role**: `backend`

**Responsibilities:**
- Supabase queries and RPC functions
- Database schema modifications
- Row Level Security policies
- Data validation and transformations
- API service layer

**Key Focus:**
- Performance optimization (query efficiency)
- Security first (RLS, input validation)
- Mobile compatibility (efficient payloads)

---

#### 4. Mobile Agent
**Role**: `mobile`

**Responsibilities:**
- Capacitor plugin integration
- iOS and Android platform-specific code
- Native feature implementation (Camera, Geolocation, Haptics)
- Mobile build and sync processes
- Platform testing

**Key Focus:**
- Follow Core Principle #2 (iOS & Android Deployment)
- Test on real devices or simulators
- Handle platform differences gracefully

---

#### 5. Testing Agent
**Role**: `testing`

**Responsibilities:**
- Playwright end-to-end tests
- Component testing
- Integration testing
- Quality assurance
- Performance testing

**Triggers:**
- New feature completed
- Bug fix implemented
- Before PR creation
- Regression concerns

---

#### 6. Reviewer Agent
**Role**: `reviewer`

**Responsibilities:**
- Code review for quality and standards
- Security audit (follow Security Checklist)
- Performance review
- Architecture validation
- Documentation review

**Triggers:**
- Before PR submission
- After major implementation
- Security-sensitive changes

---

#### 7. Research Agent
**Role**: `researcher`

**Responsibilities:**
- Gather information from credible sources ONLY (follow Core Principle #1)
- Verify source credibility tier before using any information
- Store research findings in memory system
- Provide recommendations with confidence levels
- Stay current with latest official documentation
- Investigate errors and blockers thoroughly

**Triggers:**
- Unknown technology or library encountered
- Blocker detected that needs investigation
- Decision needed between multiple approaches
- Unfamiliar error or warning
- Explicit research request from user or another agent
- Outdated information suspected

**Output Format:**
```markdown
## Research Report

**Topic**: [What was researched]
**Query**: [Specific question or problem]
**Date**: [Current date]

### Sources
- [Source 1 Name](URL) - TIER [1/2/3]
- [Source 2 Name](URL) - TIER [1/2/3]

### Key Findings
1. [Finding with evidence/quote from source]
2. [Finding with evidence/quote from source]

### Recommendations
- **Recommended Approach**: [Specific recommendation]
- **Rationale**: [Why this is best based on research]
- **Alternatives Considered**: [Other options and why rejected]

### Confidence Level
- [High/Medium/Low] confidence in recommendation
- **Reasoning**: [Why this confidence level]

### Expiration
- [If time-sensitive, when to re-research]
- [If stable, mark as "Long-term valid"]
```

**Example:**
```markdown
## Research Report

**Topic**: Framer Motion scroll animations
**Query**: Best practice for scroll-triggered animations in React

### Sources
- [Framer Motion Scroll Animations](https://www.framer.com/motion/scroll-animations/) - TIER 1
- [React Spring vs Framer Motion](https://beta.react.dev/learn/animation) - TIER 1

### Key Findings
1. `useScroll()` hook is the recommended approach for scroll-triggered animations
2. Performance is optimized when using `transform` and `opacity` only
3. Mobile Safari requires passive scroll listeners for 60fps

### Recommendations
- **Recommended Approach**: Use Framer Motion's `useScroll()` with `useTransform()`
- **Rationale**: Official docs confirm this is most performant, works on mobile
- **Alternatives Considered**: Intersection Observer (less smooth), AOS library (outdated)

### Confidence Level
- High confidence
- **Reasoning**: Official documentation from Framer Motion (TIER 1 source)

### Expiration
- Long-term valid (as of Framer Motion v11)
```

---

#### 8. Archivist Agent
**Role**: `archivist`

**Responsibilities:**
- Curate and organize memory system entries
- Add tags and link related entries
- Generate periodic insight reports
- Clean up redundant or outdated entries
- Ensure information retrievability
- Create pattern documentation
- Maintain decision graph (what was decided and why)

**Triggers:**
- End of work session
- Memory system threshold reached (>50 entries)
- Weekly summary needed
- Pattern detection in repeated work
- Explicit archival request

**Outputs:**

1. **Enriched Memory Entries**
```json
{
  "id": "mem_123",
  "original_content": "...",
  "tags": ["authentication", "supabase", "RLS"],
  "related_entries": ["mem_098", "mem_104"],
  "confidence": "high",
  "source_tier": 1,
  "last_verified": "2024-11-29"
}
```

2. **Insight Reports**
```markdown
## Weekly Insight Report

**Period**: Nov 22-29, 2024
**Total Entries**: 47 new entries

### Patterns Detected
1. **Authentication Issues**: 8 entries related to Supabase RLS
   - Common theme: Forgotten `auth.users` join
   - Solution documented: [Link to memory entry]

2. **Mobile Performance**: 5 entries on iOS rendering
   - Pattern: Heavy animations causing jank
   - Recommendation: Use `will-change` CSS property

### Top Decisions
1. **Zustand over Redux**: Confirmed in 3 separate research sessions
2. **Capacitor 6.x**: Upgraded, documented breaking changes

### Outdated Entries
- Removed 3 entries about Vite 3.x (now on Vite 5.x)
- Updated 2 entries with new Supabase v2 syntax
```

3. **Decision Graph Updates**
```markdown
## Decision: State Management

**Date**: 2024-11-15
**Decided**: Use Zustand for global state
**Rationale**: Lightweight, TypeScript-friendly, no boilerplate
**Alternatives Rejected**: Redux (too complex), Context API (performance issues)
**Confidence**: High
**Source**: [Official Zustand docs](https://zustand-demo.pmnd.rs/) - TIER 1

**Related Decisions**:
- [React Query for server state](#decision-server-state)
- [Local storage persistence](#decision-persistence)
```

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

## Memory System

**All agents MUST use the memory system** to maintain continuity, avoid repeated work, and build institutional knowledge.

### Core Requirements

1. **Query Before Starting Work**
   - ALWAYS search memory before beginning any task
   - Look for previous decisions, research, or solutions
   - Check if problem has been solved before
   - Review related entries for context

2. **Log After Completing Work**
   - Store significant decisions
   - Document research findings
   - Record solutions to blockers
   - Note patterns and insights

### Memory System Architecture

**Technology**: Pinecone vector database for semantic search

**Entry Types:**
- `decision` - Technical decision with rationale
- `research` - Research findings from credible sources
- `solution` - Problem/solution pair
- `pattern` - Recurring pattern or best practice
- `blocker` - Obstacle encountered and how resolved

### Required Fields

Every memory entry must include:

```typescript
interface MemoryEntry {
  id: string;                          // Unique identifier
  type: 'decision' | 'research' | 'solution' | 'pattern' | 'blocker';
  content: string;                     // Main content (what was learned)
  context: string;                     // Where/when this applies
  tags: string[];                      // Searchable tags
  confidence: 'high' | 'medium' | 'low'; // Confidence in information
  source_tier?: 1 | 2 | 3;            // If from research, credibility tier
  source_url?: string;                 // Link to documentation/source
  related_files?: string[];            // Files this affects
  created_at: string;                  // ISO timestamp
  expires_at?: string;                 // When to re-verify (optional)
  agent_role: string;                  // Which agent created this
}
```

### Example Memory Entries

#### Decision Entry
```json
{
  "id": "dec_zustand_state",
  "type": "decision",
  "content": "Use Zustand for global client state management in PrayerMap",
  "context": "Choosing state management library for user preferences, UI state, and non-server data",
  "tags": ["state-management", "zustand", "architecture", "frontend"],
  "confidence": "high",
  "source_tier": 1,
  "source_url": "https://zustand-demo.pmnd.rs/",
  "related_files": ["src/stores/userStore.ts", "src/stores/mapStore.ts"],
  "created_at": "2024-11-15T10:30:00Z",
  "agent_role": "planner"
}
```

#### Research Entry
```json
{
  "id": "res_framer_motion_mobile",
  "type": "research",
  "content": "Framer Motion animations work on iOS/Android via Capacitor. Use transform and opacity for 60fps. Avoid animating layout properties.",
  "context": "Implementing smooth animations that work on native mobile platforms",
  "tags": ["framer-motion", "animation", "mobile", "performance", "ios", "android"],
  "confidence": "high",
  "source_tier": 1,
  "source_url": "https://www.framer.com/motion/animation/#performance",
  "related_files": ["src/components/PrayerCard.tsx"],
  "created_at": "2024-11-20T14:22:00Z",
  "expires_at": "2025-05-20T14:22:00Z",
  "agent_role": "researcher"
}
```

#### Solution Entry
```json
{
  "id": "sol_rls_auth_users",
  "type": "solution",
  "content": "When RLS policy returns empty results, check if query joins auth.users properly. Common mistake: missing 'LEFT JOIN auth.users' in RPC functions.",
  "context": "Debugging Supabase RLS policies that seem to block legitimate queries",
  "tags": ["supabase", "rls", "authentication", "debugging", "sql"],
  "confidence": "high",
  "related_files": ["supabase/functions/get_nearby_prayers.sql"],
  "created_at": "2024-11-18T09:15:00Z",
  "agent_role": "backend"
}
```

### Using Pinecone Queries

#### Search by Semantic Similarity
```typescript
// Before starting work on authentication
const results = await pinecone.query({
  vector: await embedQuery("authentication supabase RLS policies"),
  topK: 5,
  filter: { tags: { $in: ["authentication", "supabase"] } }
});
```

#### Search by Tags
```typescript
// Find all mobile-related decisions
const results = await pinecone.query({
  vector: await embedQuery("mobile development capacitor"),
  topK: 10,
  filter: {
    type: "decision",
    tags: { $in: ["mobile", "capacitor", "ios", "android"] }
  }
});
```

#### Time-based Queries
```typescript
// Find recent research (last 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const results = await pinecone.query({
  vector: await embedQuery("performance optimization"),
  topK: 5,
  filter: {
    type: "research",
    created_at: { $gte: thirtyDaysAgo.toISOString() }
  }
});
```

### Agent-Specific Memory Practices

**Research Agent:**
- MUST log all research findings with source_tier
- Include source_url for all TIER 1-3 sources
- Set expires_at for time-sensitive information (e.g., "latest" library versions)

**Planner Agent:**
- Log major decisions with full rationale
- Link related memory entries in decision graphs
- Tag with affected areas (frontend, backend, mobile)

**Backend/Frontend/Mobile Agents:**
- Log solutions to tricky bugs
- Document patterns that emerge
- Reference memory when making similar changes

**Archivist Agent:**
- Perform weekly cleanup of outdated entries
- Add tags to untagged entries
- Generate insight reports
- Link related entries together

### Best Practices

1. **Be Specific**: "Framer Motion scroll animations on iOS" not "animations"
2. **Include Context**: When/where this applies, what problem it solves
3. **Tag Generously**: Better too many tags than too few
4. **Link Sources**: Always include URLs for research
5. **Update Confidence**: Lower confidence if information becomes questionable
6. **Set Expiration**: For version-specific or time-sensitive info
7. **Cross-Reference**: Link related entries together

### Memory Hygiene

**Weekly (by Archivist Agent):**
- Review entries older than 90 days
- Check if any have expired
- Remove duplicates
- Add missing tags
- Link related entries

**After Major Updates:**
- Update entries affected by library upgrades
- Deprecate outdated patterns
- Add migration notes

**Before Decisions:**
- Search for existing decisions
- Review related research
- Check for conflicting information

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
