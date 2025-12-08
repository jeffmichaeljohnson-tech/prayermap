---
name: senior-fullstack
description: Comprehensive fullstack development skill for building complete web applications with React, Next.js, Node.js, GraphQL, and PostgreSQL. Includes project scaffolding, code quality analysis, architecture patterns, and complete tech stack guidance. Use when building new projects, analyzing code quality, implementing design patterns, or setting up development workflows.
---

# Senior Fullstack Engineer

Complete toolkit for senior fullstack development with modern tools and best practices.

## Tech Stack (PrayerMap Aligned)

**Frontend:** React 18+, TypeScript, Vite, TailwindCSS, Framer Motion
**Backend:** Supabase (PostgreSQL), Edge Functions, Row Level Security
**Maps:** Mapbox GL JS, GeoJSON, Spatial Queries
**State:** React Query, Zustand
**Testing:** Vitest, Playwright, React Testing Library
**DevOps:** GitHub Actions, Vercel, Docker

## Architecture Patterns

### Clean Component Architecture
```
src/
├── components/     # Reusable UI components
│   ├── ui/         # Primitive components (Button, Input)
│   └── features/   # Feature-specific components
├── hooks/          # Custom React hooks
├── lib/            # Utilities and helpers
├── services/       # API and external service calls
├── stores/         # State management
└── types/          # TypeScript type definitions
```

### Data Fetching Pattern
```typescript
// Use React Query for server state
const { data, isLoading, error } = useQuery({
  queryKey: ['prayers', filters],
  queryFn: () => prayerService.list(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Supabase RLS Pattern
```sql
-- Row Level Security for user data
CREATE POLICY "Users can view own prayers"
ON prayers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prayers"
ON prayers FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

## Best Practices

### TypeScript
- Enable strict mode
- Use type inference where possible
- Define explicit return types for public functions
- Use discriminated unions for state

### React
- Prefer function components with hooks
- Memoize expensive computations
- Use React.lazy for code splitting
- Keep components focused and small

### Performance
- Virtualize long lists
- Lazy load images and heavy components
- Use Suspense boundaries
- Optimize re-renders with memo/useMemo/useCallback

### Security
- Validate all inputs (Zod schemas)
- Use parameterized queries (Supabase handles this)
- Implement proper RLS policies
- Sanitize user-generated content

## Common Patterns

### Error Boundary
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<Loading />}>
    <YourComponent />
  </Suspense>
</ErrorBoundary>
```

### Optimistic Updates
```typescript
const mutation = useMutation({
  mutationFn: updatePrayer,
  onMutate: async (newPrayer) => {
    await queryClient.cancelQueries(['prayers']);
    const previous = queryClient.getQueryData(['prayers']);
    queryClient.setQueryData(['prayers'], (old) => [...old, newPrayer]);
    return { previous };
  },
  onError: (err, newPrayer, context) => {
    queryClient.setQueryData(['prayers'], context.previous);
  },
});
```

### Geospatial Query
```typescript
// Find prayers within radius
const { data } = await supabase
  .rpc('prayers_within_radius', {
    lat: userLocation.lat,
    lng: userLocation.lng,
    radius_km: 10
  });
```

## Code Quality Checklist

- [ ] TypeScript strict mode enabled
- [ ] ESLint + Prettier configured
- [ ] Unit tests for critical logic
- [ ] E2E tests for user flows
- [ ] Error boundaries in place
- [ ] Loading states handled
- [ ] Accessibility (a11y) checked
- [ ] Mobile responsive
- [ ] Performance profiled
