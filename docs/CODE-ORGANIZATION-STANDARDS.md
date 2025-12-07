# Code Organization Standards and File Conventions
## Research Report for PrayerMap - TypeScript + React Full-Stack Applications

**Research Date:** December 4, 2025
**Focus:** Scalable full-stack applications using TypeScript + React
**Sources:** 25+ industry-standard references

---

## Executive Summary

This document provides opinionated, enforceable code organization standards for TypeScript + React applications. After analyzing 25+ authoritative sources including official documentation from Google, Airbnb, React, Next.js, and prominent open-source projects, the following key recommendations emerge:

### Core Principles
1. **Feature-based organization over type-based** for applications beyond trivial size
2. **PascalCase for component files** that export React components
3. **Colocate related code** (tests, styles, types with their components)
4. **Barrel files should be minimized** due to tree-shaking and performance issues
5. **Maximum 3-4 folder nesting levels** to prevent complexity

### Quick Reference Table

| Concern | Recommendation | Alternative |
|---------|---------------|-------------|
| Component files | `PascalCase.tsx` | `kebab-case.tsx` (for Next.js routing) |
| Utility/service files | `camelCase.ts` | `kebab-case.ts` |
| Hooks | `camelCase.ts` (useHookName) | N/A |
| Folder structure | Feature-based | Type-based (small apps only) |
| Test files | Colocated (`Component.test.tsx`) | Separate `__tests__/` folder |
| Barrel exports | Avoid except for public APIs | Use direct imports |
| Store organization | Feature-specific stores or slices | Single monolithic store |
| Component architecture | Atomic Design (atoms → organisms) | Flat structure |

---

## 1. File Naming Conventions

### 1.1 Component Files

**Rule:** Use **PascalCase** for files that export React components.

```
✅ Good
UserProfile.tsx
MessageList.tsx
InboxModal.tsx

❌ Bad
userProfile.tsx
user-profile.tsx
USER_PROFILE.tsx
```

**Rationale:**
- Matches the component name inside the file ([Airbnb React Style Guide](https://airbnb.io/javascript/react/))
- Makes components immediately recognizable in file listings
- Standard adopted by majority of React community ([Stack Overflow: React Naming Conventions](https://stackoverflow.com/questions/55221433/is-there-an-official-style-guide-or-naming-convention-for-react-based-projects))

**Exception for Next.js:**
When using Next.js App Router with file-based routing, use kebab-case for route segments since filenames become URLs:

```
app/
├── user-profile/
│   └── page.tsx          # kebab-case for URL
└── message-list/
    └── page.tsx
```

The component inside should still be PascalCase:
```typescript
// page.tsx
export default function UserProfile() { ... }
```

**Source:** [Next.js File Naming Best Practices](https://shipixen.com/blog/nextjs-file-naming-best-practices), [Sam Meech-Ward: Naming .tsx files](https://www.sammeechward.com/naming-tsx)

### 1.2 Non-Component Files

**Rule:** Use **camelCase** for utility files, services, helpers, and hooks.

```
✅ Good
userService.ts
dateFormatter.ts
useAuth.ts
apiClient.ts

❌ Bad
UserService.ts
user_service.ts
user-service.ts
```

**Rationale:**
- Distinguishes utilities from components at a glance
- Matches JavaScript/TypeScript function naming conventions
- Standard in Google TypeScript Style Guide ([Google TS Guide](https://google.github.io/styleguide/tsguide.html))

### 1.3 Constants and Enums

**Rule:** Use **UPPER_SNAKE_CASE** for constant files containing immutable values.

```
✅ Good
API_ENDPOINTS.ts
ROUTES.ts
CONFIG.ts

❌ Bad
apiEndpoints.ts
api-endpoints.ts
```

**Modern Alternative:** Prefer `as const` objects over enums in new code:

```typescript
// ✅ Preferred (as const)
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// ⚠️ Legacy (enum - emits runtime code)
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}
```

**Source:** [Modern TypeScript Best Practices: Ditching Enums](https://smali-kazmi.medium.com/modern-typescript-best-practices-ditching-enums-for-literal-unions-18fd8c2d95fd), [AWS TypeScript Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/best-practices-cdk-typescript-iac/typescript-best-practices.html)

### 1.4 Type Definition Files

**Rule:** Use **camelCase.ts** or colocate with the component/module they describe.

```
✅ Good (Colocated)
UserProfile/
├── UserProfile.tsx
├── UserProfile.test.tsx
├── types.ts              # Local types
└── index.ts

✅ Good (Centralized)
types/
├── user.ts
├── message.ts
└── database.ts

❌ Bad
types/
├── User.ts               # PascalCase for type files
├── MESSAGE.ts
└── database_types.ts
```

**Source:** [TypeScript for Domain-Driven Design](https://dev.to/shafayeat/typescript-for-domain-driven-design-ddd-6kk)

---

## 2. Module Boundaries and Single Responsibility

### 2.1 The Feature-First Principle

**Rule:** Organize code by **feature/domain**, not by technical type.

```
✅ Good (Feature-based)
src/
├── features/
│   ├── authentication/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types/
│   ├── messaging/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── prayers/
├── shared/
│   ├── components/
│   ├── hooks/
│   └── utils/
└── types/

❌ Bad (Type-based - only for small apps)
src/
├── components/          # 100+ components mixed together
├── hooks/              # All hooks from all features
├── services/           # All services mixed
└── utils/
```

**Rationale:**
- Features become self-contained and independently testable
- New developers immediately understand business domains
- Easier to delete/refactor entire features
- Reduces coupling between unrelated code
- Scales better as team and codebase grow

**Sources:**
- [Why Feature-Based Is My Favorite](https://asrulkadir.medium.com/3-folder-structures-in-react-ive-used-and-why-feature-based-is-my-favorite-e1af7c8e91ec)
- [React Project Structure for Scale](https://www.developerway.com/posts/react-project-structure)
- [Bulletproof React: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)

### 2.2 What Belongs in a Feature Module?

**Rule:** A feature module should contain **all code specific to that feature**.

**Checklist for feature boundaries:**
- [ ] Does this code only serve one feature?
- [ ] Would deleting the feature mean deleting this code?
- [ ] Does it contain feature-specific business logic?

If yes to all three → Keep it in the feature module.

**Feature Module Template:**
```
features/authentication/
├── components/          # Auth-specific UI (LoginForm, SignUpModal)
├── hooks/              # useAuth, useSession
├── services/           # authService, tokenManager
├── stores/             # authStore (Zustand)
├── types/              # User, AuthState, LoginCredentials
├── utils/              # passwordValidator, tokenDecoder
├── index.ts            # Public API (what feature exports)
└── README.md           # Feature documentation
```

**Source:** [Building Scalable React with Feature-Based Architecture](https://medium.com/@harutyunabgaryann/building-scalable-react-applications-with-feature-based-architecture-41219d5549df)

### 2.3 Shared vs Feature-Specific Components

**Rule:** Only promote code to `shared/` when used by **3+ features**.

```
✅ Good Decision Making
Button → shared/components/        # Used everywhere
LoginForm → features/auth/         # Only used in auth
PaymentCard → features/payments/   # Only used in payments
Modal → shared/components/         # Used in 5 features

❌ Bad (Premature Abstraction)
LoginInput → shared/components/    # Only used in LoginForm
```

**Three-Tier Component Hierarchy:**

1. **Core/Atoms** (`shared/components/atoms/`)
   - Primitive, reusable building blocks
   - No business logic
   - Examples: Button, Input, Icon, Badge

2. **Molecules** (`shared/components/molecules/`)
   - Combinations of atoms
   - Encapsulate common patterns
   - Examples: FormField (Label + Input + Error), SearchBar

3. **Organisms** (`features/*/components/`)
   - Feature-specific complex components
   - Contain business logic
   - Examples: LoginForm, PrayerCard, MessageThread

**Source:** [Atomic Design for React](https://medium.com/@janelle.wg/atomic-design-pattern-how-to-structure-your-react-application-2bb4d9ca5f97), [Feature-Driven Architecture](https://ryanlanciaux.com/blog/2017/08/20/a-feature-based-approach-to-react-development/)

### 2.4 Enforcing Module Boundaries

**Rule:** Use barrel files (`index.ts`) as **public APIs** for feature modules.

```typescript
// features/authentication/index.ts
// This is the ONLY way other features can access authentication

export { LoginForm, SignUpModal } from './components';
export { useAuth, useSession } from './hooks';
export { authService } from './services';
export type { User, AuthState } from './types';

// Internal implementation details NOT exported:
// - tokenManager (private utility)
// - passwordValidator (internal helper)
// - LoginButton (private sub-component)
```

**Usage in other features:**
```typescript
// ✅ Good - Use public API
import { useAuth, LoginForm } from '@/features/authentication';

// ❌ Bad - Bypass public API
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { LoginButton } from '@/features/authentication/components/LoginButton';
```

**Source:** [React Folder Structure in 5 Steps](https://www.robinwieruch.de/react-folder-structure/)

---

## 3. Index Files and Barrel Exports

### 3.1 The Barrel File Problem

**Rule:** **Minimize barrel exports** due to performance and tree-shaking issues.

**Performance Impact:**
- Loading 11,000+ modules reduced to 3,500 by removing barrels (68% reduction)
- Barrel files force bundlers to load entire modules even for single imports
- Breaks tree-shaking in many scenarios

**Sources:**
- [Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files)
- [Barrel Files and Why You Should Stop Using Them](https://dev.to/tassiofront/barrel-files-and-why-you-should-stop-using-them-now-bc4)
- [Next.js Tree Shaking Issue with Barrel Files](https://github.com/vercel/next.js/issues/12557)

### 3.2 When Barrel Files ARE Acceptable

**Use barrel files ONLY for:**

1. **Feature module public APIs** (as shown in 2.4)
2. **Library package entry points** (the `main` field in package.json)
3. **Type-only exports** (types don't affect bundle size)

```typescript
// ✅ Good - Type-only barrel
// types/index.ts
export type { User, Message, Prayer } from './entities';
export type { ApiResponse, ApiError } from './api';

// ✅ Good - Feature public API
// features/messaging/index.ts
export { MessageList, MessageInput } from './components';
export { useMessages } from './hooks';

// ❌ Bad - Barrel for every folder
// components/index.ts (exporting 50+ components)
export * from './Button';
export * from './Input';
export * from './Modal';
// ... (45 more exports)
```

**Source:** [A Practical Guide Against Barrel Files](https://dev.to/thepassle/a-practical-guide-against-barrel-files-for-library-authors-118c)

### 3.3 Solutions and Workarounds

**Next.js 15+ Solution:**
Use `optimizePackageImports` in `next.config.js`:

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['@/features', '@/shared']
  }
}
```

**Source:** [Next.js Bundle Size Improvements](https://www.catchmetrics.io/blog/nextjs-bundle-size-improvements-optimize-your-performance)

**General Solution:**
```typescript
// ✅ Good - Direct imports
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ❌ Bad - Barrel import
import { Button } from '@/shared/components';
import { useAuth } from '@/features/auth';
```

**For existing barrels:**
Mark as side-effect free in webpack config:
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /src\/features\/.*\/index\.ts$/i,
        sideEffects: false
      }
    ]
  }
}
```

---

## 4. Component Organization Patterns

### 4.1 Atomic Design Structure

**Rule:** Use Atomic Design methodology for component organization.

```
src/
├── components/
│   ├── atoms/              # Primitive building blocks
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.module.css
│   │   │   └── types.ts
│   │   ├── Input/
│   │   └── Icon/
│   ├── molecules/          # Combinations of atoms
│   │   ├── FormField/
│   │   ├── SearchBar/
│   │   └── Card/
│   └── organisms/          # Feature-specific complex components
│       ├── Navigation/
│       ├── Footer/
│       └── Hero/
├── features/
│   └── prayers/
│       └── components/     # Prayer-specific organisms
│           ├── PrayerCard/
│           └── PrayerList/
└── pages/                  # Page-level compositions
    ├── HomePage/
    └── DashboardPage/
```

**Classification Guidelines:**

| Level | Complexity | State | Examples |
|-------|-----------|-------|----------|
| Atoms | Primitive | Stateless | Button, Input, Label, Icon |
| Molecules | Simple composition | Minimal state | FormField, SearchBar, Card |
| Organisms | Complex composition | Stateful | Navigation, LoginForm, PrayerList |
| Templates | Layout structure | No business logic | DashboardLayout, AuthLayout |
| Pages | Full pages | Route-level state | HomePage, DashboardPage |

**Sources:**
- [Atomic Design Pattern for React](https://medium.com/@janelle.wg/atomic-design-pattern-how-to-structure-your-react-application-2bb4d9ca5f97)
- [Atomic Design Best Practices](https://propelius.ai/blogs/atomic-design-in-react-best-practices)
- [Atomic Design in React Guide](https://codebrahma.com/atomic-design-react-component-structure-guide/)

### 4.2 Component Folder Structure

**Rule:** Each non-trivial component gets its own folder with colocated files.

```
Button/
├── Button.tsx              # Main component
├── Button.test.tsx         # Unit tests
├── Button.stories.tsx      # Storybook stories (if using)
├── Button.module.css       # Styles
├── types.ts               # Component-specific types
├── utils.ts               # Component-specific helpers
└── index.ts               # Public API

// Button.tsx
export function Button({ variant, children, ...props }: ButtonProps) {
  return <button className={styles[variant]} {...props}>{children}</button>;
}

// index.ts
export { Button } from './Button';
export type { ButtonProps } from './types';
```

**When to use a folder vs single file:**

```
✅ Single file (simple components)
- Less than 50 lines
- No associated styles/tests/types
- Pure presentation

Example: Badge.tsx, Divider.tsx

✅ Folder (complex components)
- Multiple related files
- Tests, styles, or types needed
- Reusable with documentation

Example: Button/, Modal/, Form/
```

**Source:** [React Component Structure Best Practices](https://www.nilebits.com/blog/2024/04/structuring-react-components/)

### 4.3 Shared vs Feature Components Decision Tree

```
Is this component used by multiple features?
│
├─ No → Put in feature/*/components/
│
└─ Yes → How many features use it?
    │
    ├─ 2 features → Keep in both (wait for 3rd use)
    │
    └─ 3+ features → Move to shared/components/
        │
        └─ Does it have business logic?
            │
            ├─ No → shared/components/atoms or molecules
            │
            └─ Yes → Refactor to separate logic
                     (component in shared, logic in features)
```

**Source:** [Popular React Folder Structures](https://profy.dev/article/react-folder-structure)

---

## 5. State Management File Organization (Zustand)

### 5.1 Store Organization Patterns

**Rule:** Use **feature-specific stores** or the **slices pattern** for modularity.

**Pattern 1: Feature-Specific Stores** (Recommended for most apps)

```
src/
├── features/
│   ├── authentication/
│   │   └── store/
│   │       └── authStore.ts
│   ├── messaging/
│   │   └── store/
│   │       └── messageStore.ts
│   └── prayers/
│       └── store/
│           └── prayerStore.ts
└── shared/
    └── stores/
        └── uiStore.ts       # Global UI state
```

**Pattern 2: Slices Pattern** (For large interconnected state)

```
src/
└── stores/
    ├── index.ts            # Combined store
    ├── slices/
    │   ├── authSlice.ts
    │   ├── messageSlice.ts
    │   └── prayerSlice.ts
    └── types.ts
```

**Example slice pattern:**

```typescript
// slices/authSlice.ts
import { StateCreator } from 'zustand';

export interface AuthSlice {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const createAuthSlice: StateCreator<
  AuthSlice & MessageSlice,  // Combined type
  [],
  [],
  AuthSlice
> = (set) => ({
  user: null,
  login: async (credentials) => {
    const user = await authService.login(credentials);
    set({ user });
  },
  logout: () => set({ user: null })
});

// stores/index.ts
import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createMessageSlice, MessageSlice } from './slices/messageSlice';

export const useStore = create<AuthSlice & MessageSlice>()((...a) => ({
  ...createAuthSlice(...a),
  ...createMessageSlice(...a)
}));
```

**Sources:**
- [Zustand Slices Pattern Official Docs](https://zustand.docs.pmnd.rs/guides/slices-pattern)
- [How to Structure Your Zustand Stores](https://pietrobondioli.com.br/articles/how-to-structure-your-zustand-stores)
- [Large-Scale React Zustand Project Structure](https://medium.com/@itsspss/large-scale-react-zustand-nest-js-project-structure-and-best-practices-93397fb473f4)

### 5.2 Store File Naming

**Rule:** Use **PascalCase** for store names, **camelCase** for file names.

```typescript
// ✅ Good
// stores/authStore.ts
export const useAuthStore = create<AuthState>()((set) => ({ ... }));

// stores/messageStore.ts
export const useMessageStore = create<MessageState>()((set) => ({ ... }));

// ❌ Bad
// stores/AuthStore.ts (PascalCase file)
// stores/auth_store.ts (snake_case file)
// stores/auth-store.ts (kebab-case file)
```

**Source:** [Zustand Best Practices](https://www.projectrules.ai/rules/zustand)

### 5.3 Where NOT to Put Stores

**❌ Don't put stores in:**
- `hooks/` folder (stores are not hooks)
- `utils/` folder (stores are not utilities)
- Root `src/` folder (unless tiny app)

**✅ Do put stores in:**
- `stores/` folder (global stores)
- `features/*/store/` folder (feature-specific)
- Colocated with feature modules

---

## 6. Hooks Organization

### 6.1 Global vs Local Hooks

**Rule:** Separate **global reusable hooks** from **feature-specific hooks**.

```
✅ Good
src/
├── hooks/                  # Global hooks (3+ features use)
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
└── features/
    └── authentication/
        └── hooks/          # Auth-specific hooks
            ├── useAuth.ts
            ├── useSession.ts
            └── useLoginForm.ts

❌ Bad
src/
└── hooks/                  # Everything mixed together
    ├── useDebounce.ts
    ├── useAuth.ts          # Auth-specific
    ├── useLoginForm.ts     # Auth-specific
    ├── usePrayers.ts       # Prayer-specific
    └── useMessages.ts      # Message-specific
```

**Source:** [React Folder Structure: Hooks Organization](https://www.robinwieruch.de/react-folder-structure/), [TypeScript Custom Hooks Patterns](https://stackademic.com/blog/react-typescript-folder-structure-to-follow-ae614e786f8a)

### 6.2 Hook Naming Conventions

**Rule:** All custom hooks MUST start with `use` prefix (camelCase).

```typescript
// ✅ Good
useAuth.ts
useDebounce.ts
useLocalStorage.ts
usePrayerFilters.ts

// ❌ Bad
Auth.ts                     # Missing 'use' prefix
UseAuth.ts                  # PascalCase (should be camelCase file)
use-auth.ts                 # kebab-case
authHook.ts                 # Wrong suffix
```

**Source:** [Airbnb React Style Guide](https://airbnb.io/javascript/react/)

### 6.3 Colocated vs Shared Hooks

**Decision criteria:**

```
Is this hook used by components in multiple features?
│
├─ No → Keep in feature/*/hooks/
│
└─ Yes → How complex is the hook?
    │
    ├─ Simple (< 20 lines) → Duplicate if needed
    │
    └─ Complex → Move to shared/hooks/
```

**Example of duplication (acceptable):**

```typescript
// features/prayers/hooks/useDebounce.ts (15 lines)
// features/messaging/hooks/useDebounce.ts (15 lines)
// Both exist independently - OK because it's simple

// Later, when 3rd feature needs it:
// Move to shared/hooks/useDebounce.ts
```

**Source:** [Colocation Principle](https://kentcdodds.com/blog/colocation)

---

## 7. Types and Interface Organization

### 7.1 Domain-Driven Type Organization

**Rule:** Organize types by **domain/feature**, not by kind.

```
✅ Good (Domain-first)
types/
├── user.ts                 # User, UserProfile, UserSettings
├── message.ts              # Message, MessageThread, MessageStatus
├── prayer.ts               # Prayer, PrayerRequest, PrayerResponse
├── api.ts                  # ApiResponse, ApiError, RequestConfig
└── database.ts             # Database tables & relationships

Or feature-colocated:
features/
└── prayers/
    └── types/
        ├── prayer.ts
        ├── filters.ts
        └── api.ts

❌ Bad (Type-first)
types/
├── interfaces.ts           # All interfaces mixed
├── types.ts               # All types mixed
├── enums.ts               # All enums mixed
└── classes.ts             # All classes mixed
```

**Sources:**
- [TypeScript for Domain-Driven Design](https://dev.to/shafayeat/typescript-for-domain-driven-design-ddd-6kk)
- [Getting Started with DDD in TypeScript](https://medium.com/@alessandro.traversi/getting-started-with-domain-driven-design-in-typescript-a-practical-introduction-4b2082a44287)

### 7.2 Shared Kernel Pattern

**Rule:** Create a **shared kernel** for cross-cutting types used everywhere.

```typescript
// types/shared.ts or types/common.ts
export type ID = string;
export type Timestamp = number;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface BaseEntity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
  meta?: ResponseMeta;
}
```

**Source:** [Domain-Driven Design File Structure](https://dev.to/stevescruz/domain-driven-design-ddd-file-structure-4pja)

### 7.3 Type File Naming

**Rule:** Use singular nouns in camelCase for type definition files.

```
✅ Good
types/
├── user.ts                # export type User, UserRole, etc.
├── message.ts             # export type Message, Thread, etc.
└── prayer.ts              # export type Prayer, PrayerStatus, etc.

❌ Bad
types/
├── User.ts                # PascalCase file
├── users.ts               # Plural
└── Messages.types.ts      # Redundant suffix
```

---

## 8. Service/API Layer Organization

### 8.1 API vs Services Distinction

**Rule:** Separate **HTTP client logic** (`api/`) from **business logic** (`services/`).

```
src/
├── api/                    # Low-level HTTP communication
│   ├── client.ts          # Axios/fetch setup, interceptors
│   ├── endpoints.ts       # API endpoint constants
│   └── types.ts           # Request/Response types
└── services/              # High-level business logic
    ├── authService.ts     # Uses api/, adds business logic
    ├── prayerService.ts
    └── messageService.ts
```

**Example:**

```typescript
// api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000
});

// Interceptors
apiClient.interceptors.request.use(/* auth token */);
apiClient.interceptors.response.use(/* error handling */);

// services/prayerService.ts
import { apiClient } from '@/api/client';
import type { Prayer, CreatePrayerDto } from '@/types/prayer';

export const prayerService = {
  async create(data: CreatePrayerDto): Promise<Prayer> {
    // Business logic: validation, transformation
    const validated = validatePrayerData(data);

    // API call
    const response = await apiClient.post('/prayers', validated);

    // Business logic: post-processing
    return transformPrayerResponse(response.data);
  },

  async list(filters: PrayerFilters): Promise<Prayer[]> {
    const params = buildQueryParams(filters);
    const response = await apiClient.get('/prayers', { params });
    return response.data.map(transformPrayerResponse);
  }
};
```

**Sources:**
- [Structured API Calls in React](https://medium.com/@sankalpa115/structured-api-calls-in-react-ef6fa8f8681b)
- [React TypeScript Folder Structure](https://stackademic.com/blog/react-typescript-folder-structure-to-follow-ae614e786f8a)

### 8.2 When to Use One vs Both

**Small apps:** Use only `services/` or `api/`
**Medium apps:** Use both with clear separation
**Large apps:** Add `repositories/` pattern (DDD approach)

```
Large app structure:
src/
├── api/               # HTTP client
├── repositories/      # Data access layer (CRUD operations)
└── services/         # Business logic (orchestrates repositories)
```

---

## 9. Testing File Organization

### 9.1 Colocated Tests (Recommended)

**Rule:** Place test files **next to the code they test**.

```
✅ Good (Colocated)
Button/
├── Button.tsx
├── Button.test.tsx         # Unit tests
├── Button.integration.test.tsx
└── index.ts

features/
└── prayers/
    ├── components/
    │   └── PrayerCard/
    │       ├── PrayerCard.tsx
    │       └── PrayerCard.test.tsx
    └── services/
        ├── prayerService.ts
        └── prayerService.test.ts

❌ Bad (Separated)
src/
├── components/
│   └── Button.tsx
└── __tests__/
    └── components/
        └── Button.test.tsx    # Far from source
```

**Benefits of colocation:**
- Immediately see that code is tested
- Easier to keep tests in sync with code
- Tests serve as inline documentation
- Refactoring moves tests automatically

**Sources:**
- [The Case for Colocating Tests in React](https://medium.com/@Connorelsea/the-case-for-colocating-tests-in-react-cef6ea7b4a1a)
- [Kent C. Dodds: Colocation](https://kentcdodds.com/blog/colocation)

### 9.2 Test File Naming

**Rule:** Use `.test.tsx` or `.spec.tsx` suffix (be consistent).

```typescript
// ✅ Good
Button.test.tsx
useAuth.test.ts
prayerService.test.ts

// Also acceptable (but pick one)
Button.spec.tsx
useAuth.spec.ts

// ❌ Bad
Button.tests.tsx           # Plural
ButtonTest.tsx            # No dot separator
button.test.tsx           # File should match component name
```

### 9.3 E2E and Integration Tests

**Rule:** Keep **integration/E2E tests** in a separate root-level folder.

```
project/
├── e2e/                   # E2E tests (Playwright, Cypress)
│   ├── auth.test.ts
│   ├── prayers.test.ts
│   └── fixtures/
├── src/
│   └── features/
│       └── prayers/
│           └── components/
│               └── PrayerCard/
│                   ├── PrayerCard.tsx
│                   └── PrayerCard.test.tsx  # Unit test
└── tests/
    └── integration/       # Integration tests
        └── prayerFlow.test.ts
```

**Source:** [Best Practices for Unit Testing in React](https://medium.com/@umerfarooq.dev/best-practices-for-unit-testing-in-react-and-folder-structure-5ca769256546)

---

## 10. Complete Folder Structure Examples

### 10.1 Small to Medium App (Bulletproof React Pattern)

```
prayermap/
├── public/
├── src/
│   ├── app/                    # Application layer
│   │   ├── routes/            # Route definitions
│   │   ├── providers/         # Context providers
│   │   └── index.tsx          # App entry point
│   ├── assets/                # Static files
│   ├── components/            # Shared components
│   │   ├── atoms/
│   │   ├── molecules/
│   │   └── organisms/
│   ├── features/              # Feature modules
│   │   ├── authentication/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   ├── types/
│   │   │   └── index.ts       # Public API
│   │   ├── messaging/
│   │   └── prayers/
│   ├── hooks/                 # Shared hooks
│   ├── lib/                   # Third-party lib configs
│   ├── stores/                # Global stores
│   ├── types/                 # Shared types
│   └── utils/                 # Shared utilities
├── tests/
│   ├── integration/
│   └── e2e/
├── .eslintrc.js
├── tsconfig.json
└── package.json
```

**Source:** [Bulletproof React](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)

### 10.2 Next.js App Router Structure

```
prayermap/
├── app/                       # Next.js App Router
│   ├── (auth)/               # Route group
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/
│   │   ├── dashboard/
│   │   └── prayers/
│   ├── api/                  # API routes
│   ├── layout.tsx
│   └── page.tsx
├── src/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── public/
└── supabase/                 # Supabase migrations/functions
```

**Source:** [Next.js Project Structure Official Docs](https://nextjs.org/docs/app/getting-started/project-structure)

### 10.3 Monorepo Structure (Turborepo/Nx)

```
prayermap/
├── apps/
│   ├── web/                  # Next.js web app
│   ├── mobile/               # React Native
│   └── docs/                 # Documentation site
├── packages/
│   ├── ui/                   # Shared React components
│   ├── config-eslint/        # Shared ESLint config
│   ├── config-typescript/    # Shared TS config
│   └── types/                # Shared TypeScript types
├── supabase/                 # Shared backend
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

**Sources:**
- [Turborepo: Structuring a Repository](https://turborepo.com/docs/crafting-your-repository/structuring-a-repository)
- [React Monorepo Best Practices](https://www.dhiwise.com/post/best-practices-for-structuring-your-react-monorepo)

---

## 11. Enforcing Standards with Tooling

### 11.1 ESLint Rules for File Naming

**Install plugins:**

```bash
npm install -D eslint-plugin-check-file @eslint-react/eslint-plugin
```

**Configure `.eslintrc.js`:**

```javascript
module.exports = {
  plugins: ['check-file', '@eslint-react'],
  rules: {
    // Enforce file naming conventions
    'check-file/filename-naming-convention': [
      'error',
      {
        '**/*.{tsx,jsx}': 'PASCAL_CASE',      // Components
        '**/*.{ts,js}': 'CAMEL_CASE',         // Utils/services
        '**/*.test.{ts,tsx}': 'CAMEL_CASE',   // Tests
      },
      {
        ignoreMiddleExtensions: true
      }
    ],

    // Enforce folder naming
    'check-file/folder-naming-convention': [
      'error',
      {
        'src/features/**/': 'KEBAB_CASE',
        'src/components/**/': 'PASCAL_CASE',
      }
    ],

    // Enforce React component file naming
    '@eslint-react/naming-convention/filename': [
      'error',
      { rule: 'PascalCase' }
    ]
  }
};
```

**Sources:**
- [ESLint Plugin: check-file](https://stackoverflow.com/questions/62464592/how-can-i-enforce-filename-and-folder-name-convention-in-typescript-eslint)
- [ESLint React: Filename Convention](https://www.eslint-react.xyz/docs/rules/naming-convention-filename)

### 11.2 TypeScript Naming Conventions

**Configure `naming-convention` rule:**

```javascript
// .eslintrc.js
rules: {
  '@typescript-eslint/naming-convention': [
    'error',
    // Interfaces and Type Aliases: PascalCase
    {
      selector: ['interface', 'typeAlias'],
      format: ['PascalCase']
    },
    // Functions and Variables: camelCase
    {
      selector: ['function', 'variable'],
      format: ['camelCase', 'UPPER_CASE'],
      leadingUnderscore: 'forbid'
    },
    // React Components: PascalCase
    {
      selector: 'function',
      modifiers: ['exported'],
      format: ['PascalCase'],
      custom: {
        regex: '^[A-Z]',
        match: true
      }
    },
    // Constants: UPPER_CASE
    {
      selector: 'variable',
      modifiers: ['const', 'global'],
      format: ['UPPER_CASE', 'camelCase']
    }
  ]
}
```

**Source:** [typescript-eslint Naming Convention Rule](https://typescript-eslint.io/rules/naming-convention/)

### 11.3 Import Organization

**Use `eslint-plugin-import` to enforce import order:**

```javascript
// .eslintrc.js
rules: {
  'import/order': [
    'error',
    {
      'groups': [
        'builtin',      // Node built-ins
        'external',     // npm packages
        'internal',     // Aliased modules (@/)
        'parent',       // ../
        'sibling',      // ./
        'index'         // ./index
      ],
      'pathGroups': [
        {
          pattern: '@/**',
          group: 'internal',
          position: 'before'
        }
      ],
      'newlines-between': 'always',
      'alphabetize': {
        order: 'asc',
        caseInsensitive: true
      }
    }
  ]
}
```

**Result:**

```typescript
// ✅ Good - Properly ordered imports
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/atoms/Button';
import { useAuth } from '@/features/authentication';
import { formatDate } from '@/utils/date';

import { PrayerCard } from '../PrayerCard';
import { usePrayerFilters } from './usePrayerFilters';
```

---

## 12. Real-World Examples from Open Source

### 12.1 Bulletproof React
- **GitHub:** [alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react)
- **Pattern:** Feature-based with shared components
- **Key takeaway:** Strong separation between features and shared code

### 12.2 Next.js Official Examples
- **GitHub:** [vercel/next.js/examples](https://github.com/vercel/next.js/tree/canary/examples)
- **Pattern:** App Router with route groups
- **Key takeaway:** Leverage framework conventions

### 12.3 Cal.com
- **GitHub:** [calcom/cal.com](https://github.com/calcom/cal.com)
- **Pattern:** Monorepo with apps and packages
- **Key takeaway:** Scale with workspace organization

### 12.4 Remix Blues Stack
- **GitHub:** [remix-run/blues-stack](https://github.com/remix-run/blues-stack)
- **Pattern:** Route-based organization with models
- **Key takeaway:** Database-first design with colocation

### 12.5 T3 App
- **GitHub:** [t3-oss/create-t3-app](https://github.com/t3-oss/create-t3-app)
- **Pattern:** Simple type-based for small apps
- **Key takeaway:** Start simple, evolve to feature-based

**Source:** [CodeWithNico: Production Ready React Apps](https://codewithnico.com/production-ready-react-apps/)

---

## 13. Migration Strategy

### 13.1 Migrating from Type-Based to Feature-Based

**Step 1: Identify features**
```
Current:
src/
├── components/ (50 files)
├── hooks/ (20 files)
└── services/ (15 files)

Group by domain:
- Authentication (10 files)
- Messaging (15 files)
- Prayers (30 files)
- Shared (30 files)
```

**Step 2: Create feature folders**
```bash
mkdir -p src/features/{authentication,messaging,prayers}/{components,hooks,services,types}
```

**Step 3: Move files incrementally (one feature at a time)**
```bash
# Move authentication files
git mv src/components/Login* src/features/authentication/components/
git mv src/hooks/useAuth* src/features/authentication/hooks/
git mv src/services/authService.ts src/features/authentication/services/
```

**Step 4: Update imports**
```typescript
// Before
import { LoginForm } from '@/components/LoginForm';
import { useAuth } from '@/hooks/useAuth';

// After
import { LoginForm, useAuth } from '@/features/authentication';
```

**Step 5: Add barrel exports**
```typescript
// features/authentication/index.ts
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
```

### 13.2 Gradual Adoption Checklist

- [ ] Week 1: Set up folder structure for 1 new feature
- [ ] Week 2: Migrate smallest existing feature
- [ ] Week 3: Update ESLint rules for new structure
- [ ] Week 4: Migrate second feature, document learnings
- [ ] Month 2: Migrate remaining features
- [ ] Month 3: Remove old type-based folders

---

## 14. Summary of Enforceable Rules

### File Naming
1. ✅ Component files: `PascalCase.tsx`
2. ✅ Utility/service files: `camelCase.ts`
3. ✅ Hook files: `camelCase.ts` (must start with `use`)
4. ✅ Test files: `*.test.tsx` or `*.spec.tsx`
5. ✅ Type files: `camelCase.ts` (domain-named)
6. ✅ Constants: `UPPER_SNAKE_CASE.ts` or prefer `as const`

### Folder Organization
7. ✅ Use feature-based structure for apps with 3+ features
8. ✅ Maximum 3-4 folder nesting levels
9. ✅ Colocate tests next to source files
10. ✅ Use `shared/` only for 3+ feature usage
11. ✅ Keep feature modules self-contained

### Module Boundaries
12. ✅ Use barrel files only for feature public APIs
13. ✅ Minimize barrel exports (performance)
14. ✅ Direct imports preferred over barrel re-exports
15. ✅ Never import across feature boundaries except through public API

### Component Architecture
16. ✅ Follow Atomic Design (atoms → molecules → organisms)
17. ✅ Complex components get their own folder
18. ✅ Simple components can be single files

### State & Hooks
19. ✅ Feature-specific stores in `features/*/store/`
20. ✅ Global stores in `stores/` or use slices pattern
21. ✅ Hooks in `hooks/` (global) or `features/*/hooks/` (local)

### Types & Services
22. ✅ Domain-driven type organization
23. ✅ Separate `api/` (HTTP) from `services/` (business logic)
24. ✅ Use shared kernel for cross-cutting types

---

## 15. Sources

### Official Documentation (5 sources)
1. [Airbnb React/JSX Style Guide](https://airbnb.io/javascript/react/)
2. [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
3. [React Official: File Structure](https://legacy.reactjs.org/docs/faq-structure.html)
4. [Next.js: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
5. [TypeScript ESLint: Naming Convention](https://typescript-eslint.io/rules/naming-convention/)

### Naming Conventions (5 sources)
6. [Naming Conventions in React for Clean Code](https://www.sufle.io/blog/naming-conventions-in-react)
7. [Stack Overflow: React Naming Conventions](https://stackoverflow.com/questions/55221433/is-there-an-official-style-guide-or-naming-convention-for-react-based-projects)
8. [Sam Meech-Ward: Naming .tsx Files](https://www.sammeechward.com/naming-tsx)
9. [Next.js File Naming Best Practices](https://shipixen.com/blog/nextjs-file-naming-best-practices)
10. [TypeScript Style Guide](https://basarat.gitbook.io/typescript/styleguide)

### Folder Structure & Architecture (10 sources)
11. [React Folder Structure in 5 Steps](https://www.robinwieruch.de/react-folder-structure/)
12. [Bulletproof React: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
13. [3 Folder Structures: Why Feature-Based Is Best](https://asrulkadir.medium.com/3-folder-structures-in-react-ive-used-and-why-feature-based-is-my-favorite-e1af7c8e91ec)
14. [React Project Structure for Scale](https://www.developerway.com/posts/react-project-structure)
15. [Popular React Folder Structures and Screaming Architecture](https://profy.dev/article/react-folder-structure)
16. [How to Structure React Projects (Beginner to Advanced)](https://blog.webdevsimplified.com/2022-07/react-folder-structure/)
17. [Tania Rascia: React Architecture and Directory Structure](https://www.taniarascia.com/react-architecture-directory-structure/)
18. [Types of Organization Folder Structures in React TypeScript](https://medium.com/@thiraphat-ps-dev/types-of-organization-folder-structures-in-react-typescript-projects-942556f0633b)
19. [React TypeScript Folder Structure To Follow](https://stackademic.com/blog/react-typescript-folder-structure-to-follow-ae614e786f8a)
20. [Building Scalable React with Feature-Based Architecture](https://medium.com/@harutyunabgaryann/building-scalable-react-applications-with-feature-based-architecture-41219d5549df)

### Atomic Design (3 sources)
21. [Atomic Design Pattern: How to Structure React Apps](https://medium.com/@janelle.wg/atomic-design-pattern-how-to-structure-your-react-application-2bb4d9ca5f97)
22. [Atomic Design in React: Best Practices](https://propelius.ai/blogs/atomic-design-in-react-best-practices)
23. [Atomic Design React Component Structure Guide](https://codebrahma.com/atomic-design-react-component-structure-guide/)

### Barrel Files & Tree Shaking (4 sources)
24. [Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files)
25. [Barrel Files: Why You Should Stop Using Them](https://dev.to/tassiofront/barrel-files-and-why-you-should-stop-using-them-now-bc4)
26. [Next.js Issue: Tree Shaking with Barrel Files](https://github.com/vercel/next.js/issues/12557)
27. [A Practical Guide Against Barrel Files](https://dev.to/thepassle/a-practical-guide-against-barrel-files-for-library-authors-118c)

### State Management (3 sources)
28. [Zustand: Slices Pattern Official Docs](https://zustand.docs.pmnd.rs/guides/slices-pattern)
29. [How to Structure Your Zustand Stores](https://pietrobondioli.com.br/articles/how-to-structure-your-zustand-stores)
30. [Large-Scale React Zustand Project Structure](https://medium.com/@itsspss/large-scale-react-zustand-nest-js-project-structure-and-best-practices-93397fb473f4)

### Separation of Concerns (3 sources)
31. [Separation of Concerns with React Hooks](https://felixgerschau.com/react-hooks-separation-of-concerns/)
32. [Mark Erikson: Thoughts on React Hooks and Separation of Concerns](https://blog.isquaredsoftware.com/2019/07/blogged-answers-thoughts-on-hooks/)
33. [Kent C. Dodds: Colocation](https://kentcdodds.com/blog/colocation)

### Testing (2 sources)
34. [The Case for Colocating Tests in React](https://medium.com/@Connorelsea/the-case-for-colocating-tests-in-react-cef6ea7b4a1a)
35. [Best Practices for Unit Testing in React](https://medium.com/@umerfarooq.dev/best-practices-for-unit-testing-in-react-and-folder-structure-5ca769256546)

### TypeScript & DDD (3 sources)
36. [TypeScript for Domain-Driven Design](https://dev.to/shafayeat/typescript-for-domain-driven-design-ddd-6kk)
37. [Getting Started with DDD in TypeScript](https://medium.com/@alessandro.traversi/getting-started-with-domain-driven-design-in-typescript-a-practical-introduction-4b2082a44287)
38. [Domain-Driven Design File Structure](https://dev.to/stevescruz/domain-driven-design-ddd-file-structure-4pja)

### Monorepo (2 sources)
39. [Turborepo: Structuring a Repository](https://turborepo.com/docs/crafting-your-repository/structuring-a-repository)
40. [React Monorepo Best Practices](https://www.dhiwise.com/post/best-practices-for-structuring-your-react-monorepo)

### Linting & Enforcement (2 sources)
41. [Stack Overflow: Enforce Filename Convention with ESLint](https://stackoverflow.com/questions/62464592/how-can-i-enforce-filename-and-folder-name-convention-in-typescript-eslint)
42. [ESLint React: Filename Naming Convention](https://www.eslint-react.xyz/docs/rules/naming-convention-filename)

### Open Source Examples (2 sources)
43. [CodeWithNico: Production Ready React Apps](https://codewithnico.com/production-ready-react-apps/)
44. [GitHub: React Project Structure Examples](https://github.com/topics/react-project-structure)

### Additional Best Practices (3 sources)
45. [AWS: TypeScript Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/best-practices-cdk-typescript-iac/typescript-best-practices.html)
46. [Modern TypeScript: Ditching Enums for Literal Unions](https://smali-kazmi.medium.com/modern-typescript-best-practices-ditching-enums-for-literal-unions-18fd8c2d95fd)
47. [Structured API Calls in React](https://medium.com/@sankalpa115/structured-api-calls-in-react-ef6fa8f8681b)

---

**Total Sources: 47 authoritative references**

## Appendix: Quick Decision Trees

### When to Create a New Feature Module?

```
Do you have 5+ related components/hooks/services?
│
├─ Yes → Create a feature module
│
└─ No → Is it a distinct business domain?
    │
    ├─ Yes → Create a feature module (future-proof)
    │
    └─ No → Keep in shared or existing feature
```

### PascalCase vs camelCase File Decision

```
Does this file's default export define a React component?
│
├─ Yes → PascalCase.tsx
│
└─ No → camelCase.ts
```

### Shared vs Feature Component Decision

```
Used in 3+ features? → shared/components/
Used in 2 features? → Keep in both (duplicate if simple)
Used in 1 feature? → features/*/components/
Has business logic? → Extract logic, keep UI in shared
```

---

**End of Research Report**

*This document should be treated as a living standard and updated as the PrayerMap codebase evolves and new patterns emerge in the React/TypeScript ecosystem.*
