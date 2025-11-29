# Contributing to PrayerMap

> **Sacred Code Stewardship**: Thank you for considering contributing to PrayerMap. This project serves a spiritual mission—connecting people through prayer in their moments of need.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Pull Request Process](#pull-request-process)
5. [Testing Requirements](#testing-requirements)
6. [Mobile Development](#mobile-development)
7. [Community Guidelines](#community-guidelines)

---

## Getting Started

### Required Reading

**BEFORE contributing, you MUST read these documents:**

1. **[ARTICLE.md](./ARTICLE.md)** - The Autonomous Excellence Manifesto (MANDATORY)
   - Defines our operational philosophy
   - Quality gates (85%+ quality, 90%+ accuracy)
   - Research standards and execution methodology

2. **[CLAUDE.md](./CLAUDE.md)** - Core project instructions
   - 5 Critical Principles that govern ALL work
   - Technology stack and architecture
   - Project conventions

3. **[docs/technical/BRANCH_PROTECTION.md](./docs/technical/BRANCH_PROTECTION.md)** - Git workflow
   - Branch naming conventions
   - PR requirements
   - Code review standards

### Prerequisites

- **Node.js**: 20.x or later
- **npm**: 10.x or later
- **Git**: Latest version
- **IDE**: VS Code (recommended) or Cursor
- **Mobile**: Xcode (iOS) and Android Studio (Android) for mobile work

### Initial Setup

```bash
# Clone repository
git clone https://github.com/jeffmichaeljohnson-tech/prayermap.git
cd prayermap

# Install dependencies
npm install
cd admin && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

For detailed setup, see [README.md](./README.md).

---

## Development Workflow

### 1. Find or Create an Issue

Before starting work:

- **Check existing issues**: Avoid duplicate work
- **Create new issue**: If your work isn't tracked
- **Get approval**: For significant changes, discuss first

### 2. Create Feature Branch

Follow our [branch naming conventions](./docs/technical/BRANCH_PROTECTION.md#branch-naming-conventions):

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b <type>/<description>

# Examples:
git checkout -b feat/prayer-response-system
git checkout -b fix/map-marker-clustering
git checkout -b mobile/ios-permissions
```

### 3. Develop Following Critical Principles

**EVERY change must honor the 5 Critical Principles (from CLAUDE.md):**

#### ✅ 1. Research-Driven Development
- **ALWAYS check official documentation first**
- Verify source credibility (official docs, industry leaders only)
- Never rely on outdated tutorials or unverified sources

#### ✅ 2. iOS & Android Deployment
- **Every feature must work on iOS and Android**
- Test on actual devices when possible
- Use Capacitor plugins for native features
- Implement web fallbacks

#### ✅ 3. Living, Breathing App
- **All animations at 60fps**
- Fast, responsive interactions
- Tasteful motion throughout
- Performance benchmarks met

#### ✅ 4. Minimal Steps UX
- **Count and minimize user steps**
- Challenge every form field
- Reduce friction relentlessly
- Auto-fill and smart defaults

#### ✅ 5. Query Memory Before Decisions
- **Check past decisions**
- Learn from previous solutions
- Document new decisions for future

### 4. Write Quality Code

#### TypeScript Standards
```typescript
// ✅ GOOD: Strict types, no 'any'
interface PrayerCardProps {
  prayer: Prayer;
  onPray: (id: string) => Promise<void>;
}

// ❌ BAD: Using 'any'
function handlePrayer(data: any) { }
```

#### Error Handling
```typescript
// ✅ GOOD: Comprehensive error handling
try {
  const result = await prayerService.create(data);
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
  } else if (error instanceof NetworkError) {
    // Handle network errors
  } else {
    // Log unexpected errors
    logger.error('Unexpected error creating prayer', { error });
  }
  throw error;
}

// ❌ BAD: Swallowing errors
try {
  await prayerService.create(data);
} catch (error) {
  console.log('Error');
}
```

#### Component Structure
```typescript
// 1. Imports (React, external, internal, relative)
import { useState, useEffect } from 'react';
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Component JSX */}
    </motion.div>
  );
}

// 4. Helper functions (if needed)
function formatPrayerDate(date: Date): string {
  // ...
}
```

### 5. Test Thoroughly

See [Testing Requirements](#testing-requirements) below.

### 6. Commit with Descriptive Messages

Follow commit message conventions (from CLAUDE.md):

```bash
# Format: <type>: <description>

# Good examples:
git commit -m "feat: Add prayer response system with video support"
git commit -m "fix: Resolve map marker clustering on iOS"
git commit -m "mobile: Add haptic feedback to prayer submission"
git commit -m "refactor: Extract prayer validation logic to service"
git commit -m "docs: Update API documentation for responses endpoint"

# Bad examples (don't do this):
git commit -m "updates"
git commit -m "fixed bug"
git commit -m "changes"
```

**Types**: `feat`, `fix`, `mobile`, `refactor`, `docs`, `style`, `test`, `chore`

---

## Code Standards

### TypeScript
- **Strict mode**: Always enabled (no `any`)
- **Interfaces**: For object shapes
- **Types**: For unions and intersections
- **Descriptive names**: Use auxiliary verbs (`isLoading`, `hasError`, `canSubmit`)

### React
- **Functional components only**: No class components
- **Custom hooks**: For reusable logic
- **Props interfaces**: Named `[Component]Props`
- **State management**: React Query (server), Zustand (global client), useState (local)

### Styling
- **TailwindCSS**: Primary styling method
- **Framer Motion**: For animations
- **Mobile-first**: Responsive design
- **Design System**: Follow "Ethereal Glass" aesthetic (see CLAUDE.md)

### Naming Conventions
- **Files**: PascalCase for components (`PrayerCard.tsx`), camelCase for utilities (`prayerService.ts`)
- **Variables**: camelCase (`userName`, `isAuthenticated`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_AUDIO_DURATION`)
- **Types**: PascalCase (`Prayer`, `UserProfile`)

### File Organization
```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   └── [Feature].tsx # Feature components
├── hooks/            # Custom React hooks
├── services/         # API/data services
├── lib/              # Utilities
├── types/            # TypeScript definitions
└── contexts/         # React contexts
```

---

## Pull Request Process

### 1. Complete PR Template

When creating a PR, the template (`.github/PULL_REQUEST_TEMPLATE.md`) will auto-populate. **ALL sections must be completed:**

#### Critical Sections:
- **Summary**: Brief overview
- **Type of Change**: Mark relevant type
- **Critical Principles Checklist**: ALL items must be checked
- **Quality Gates**: ALL gates must be met
- **Testing**: Describe how tested
- **Mobile Considerations**: Required if mobile-related
- **Security Considerations**: Required if security-related

### 2. Pass All Status Checks

Required checks (must pass):
- ✅ **Build**: Vercel build succeeds
- ✅ **Type Check**: TypeScript strict mode
- ✅ **Lint**: ESLint passes
- ✅ **Tests**: All tests pass

### 3. Request Review

- Assign at least **1 reviewer**
- Add relevant **labels** (`feature`, `mobile`, `bug-fix`, etc.)
- Link **related issues**

### 4. Address Review Comments

- Respond to all comments
- Make requested changes
- Mark conversations as resolved
- Push updates and notify reviewers

### 5. Merge

Once approved and checks pass:

1. **Update branch** if behind main
2. **Choose merge method**:
   - **Squash and merge** (RECOMMENDED for most PRs)
   - **Rebase and merge** (for clean commit history)
3. **Delete branch** after merge

For detailed PR workflow, see [Branch Protection Guide](./docs/technical/BRANCH_PROTECTION.md#pull-request-workflow).

---

## Testing Requirements

### Manual Testing Checklist

Before submitting PR, test:

- [ ] **Desktop browser** (Chrome, Firefox, Safari)
- [ ] **Mobile browser** (iOS Safari, Android Chrome)
- [ ] **iOS device/simulator** (if mobile-related)
- [ ] **Android device/emulator** (if mobile-related)

### Automated Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run Playwright E2E tests
npx playwright test

# Run Playwright with UI
npx playwright test --ui
```

### Test Coverage Requirements

- **Critical user flows**: 100% coverage
- **Component interactions**: 80% coverage
- **Edge cases**: Known issues covered

### Writing Tests

```typescript
// Unit test example (Vitest)
import { describe, it, expect } from 'vitest';
import { formatPrayerDate } from './utils';

describe('formatPrayerDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2025-01-01');
    expect(formatPrayerDate(date)).toBe('Jan 1, 2025');
  });
});

// E2E test example (Playwright)
import { test, expect } from '@playwright/test';

test('user can post a prayer', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('[data-testid="post-prayer-button"]');
  await page.fill('[data-testid="prayer-input"]', 'Test prayer');
  await page.click('[data-testid="submit-button"]');
  await expect(page.locator('text=Test prayer')).toBeVisible();
});
```

---

## Mobile Development

### Before Starting Mobile Work

1. **Read Official Docs**:
   - [Capacitor Documentation](https://capacitorjs.com/docs)
   - [iOS Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
   - [Android Guidelines](https://developer.android.com/design)

2. **Set Up Native Tools**:
   - Install Xcode (macOS only)
   - Install Android Studio
   - Configure simulators/emulators

### Mobile Development Workflow

```bash
# 1. Build web assets
npm run build

# 2. Sync to native projects
npx cap sync

# 3. Open in native IDE
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio

# 4. Run on device with live reload
npx cap run ios --livereload
npx cap run android --livereload
```

### Mobile Testing Checklist

- [ ] Works on iOS 14+ (test on simulator)
- [ ] Works on Android 10+ (test on emulator)
- [ ] Native permissions requested properly
- [ ] Touch targets minimum 44x44 points
- [ ] Safe areas respected (notch, home indicator)
- [ ] Haptic feedback implemented
- [ ] Gestures feel natural (swipe, pinch, drag)
- [ ] Web fallback implemented for native features

### Common Mobile Gotchas

**DON'T:**
- ❌ Assume web APIs work the same on mobile
- ❌ Use file system APIs without Capacitor filesystem plugin
- ❌ Ignore safe area insets
- ❌ Use CSS that only works in desktop browsers
- ❌ Forget about touch gestures vs mouse events

**DO:**
- ✅ Check `Capacitor.isNativePlatform()` before using native features
- ✅ Request permissions properly using Capacitor plugins
- ✅ Use Capacitor plugins for camera, geolocation, storage
- ✅ Consider touch target sizes
- ✅ Test with poor network connections
- ✅ Handle app backgrounding/foregrounding

---

## Community Guidelines

### Code of Conduct

PrayerMap is a sacred space. All contributors must:

- **Be respectful**: Kind and constructive feedback
- **Be inclusive**: Welcome all backgrounds and perspectives
- **Be collaborative**: Share knowledge and help others
- **Be professional**: Maintain high standards
- **Honor the mission**: Remember we're serving people in spiritual need

### Communication

- **Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions
- **Discussions**: For questions and ideas
- **Email**: For sensitive matters

### Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes
- Project documentation

---

## Questions?

- **General questions**: Open a GitHub Discussion
- **Bug reports**: Create an issue with `bug` label
- **Feature requests**: Create an issue with `enhancement` label
- **Security issues**: Email security@prayermap.net (DO NOT open public issue)

---

## Additional Resources

### Documentation
- **[ARTICLE.md](./ARTICLE.md)** - Autonomous Excellence Manifesto
- **[CLAUDE.md](./CLAUDE.md)** - Core project instructions
- **[AGENTS.md](./AGENTS.md)** - Agent guidelines
- **[PRD.md](./PRD.md)** - Product requirements
- **[docs/technical/BRANCH_PROTECTION.md](./docs/technical/BRANCH_PROTECTION.md)** - Branch protection rules

### External Resources
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

---

## License

By contributing to PrayerMap, you agree that your contributions will be licensed under the project's license.

---

## Thank You

Every contribution—no matter how small—helps us connect people through prayer. Thank you for being part of this sacred mission.

---

*This is a sacred project. Code accordingly.*

**Last Updated**: 2025-11-29
**Version**: 1.0
