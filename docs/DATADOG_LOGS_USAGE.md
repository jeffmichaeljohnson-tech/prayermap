# Datadog Log Management - Usage Guide

> **Quick reference** for using Datadog Log Management during refactoring

---

## ✅ Setup Complete

- ✅ `@datadog/browser-logs` package installed
- ✅ Log initialization added to `src/lib/datadog.ts`
- ✅ Structured logging helpers created
- ✅ Refactoring logger utility created

---

## 🚀 Quick Start

### Basic Logging

```typescript
import { logger } from '@/lib/datadog';

// Info log
logger.info('User logged in', { user_id: '123' });

// Warning log
logger.warn('Slow query detected', { query: 'getPrayers', duration: 1500 });

// Error log
logger.error('Failed to load prayers', error, { component: 'PrayerMap' });
```

### Refactoring-Specific Logging

```typescript
import { refactoringLogger } from '@/lib/refactoringLogger';

// Start tracking a refactoring task
const refactoringId = refactoringLogger.start('PrayerMap component extraction', {
  component: 'PrayerMap',
  goal: 'Extract MapContainer and PrayerMarkers'
});

// Log component changes
refactoringLogger.component('PrayerMap', 'extracted', {
  new_components: ['MapContainer', 'PrayerMarkers', 'ConnectionLines'],
  lines_reduced: 150,
  files_created: 3
});

// Log file changes
refactoringLogger.file('src/components/PrayerMap.tsx', 'modified', {
  lines_before: 400,
  lines_after: 250
});

refactoringLogger.file('src/components/map/MapContainer.tsx', 'created', {
  lines: 120
});

// Log milestones
refactoringLogger.milestone('Component extraction complete', {
  components_extracted: 3,
  tests_passing: true
});

// Log performance comparison
refactoringLogger.performance('component_render_time', 45, 32, {
  component: 'PrayerMap',
  improvement: '28.9% faster'
});

// Log issues found
refactoringLogger.issue('TypeScript errors in MapContainer', 'medium', {
  file: 'src/components/map/MapContainer.tsx',
  errors: 2
});

// Complete refactoring
refactoringLogger.complete('PrayerMap component extraction', refactoringId, {
  total_time_ms: 5000,
  components_created: 3,
  lines_reduced: 150,
  tests_passing: true
});
```

---

## 📊 Log Types

### 1. Refactoring Progress
```typescript
refactoringLogger.start(task, context);
refactoringLogger.complete(task, refactoringId, context);
refactoringLogger.milestone(milestone, context);
```

### 2. Component Changes
```typescript
refactoringLogger.component(component, 'extracted' | 'created' | 'modified' | 'removed', context);
```

### 3. File Changes
```typescript
refactoringLogger.file(file, 'created' | 'modified' | 'deleted', context);
```

### 4. Performance Metrics
```typescript
refactoringLogger.performance(metric, before, after, context);
```

### 5. Issues & Quality
```typescript
refactoringLogger.issue(issue, 'low' | 'medium' | 'high', context);
refactoringLogger.quality(metric, value, target, context);
refactoringLogger.test(testName, passed, context);
```

---

## 🎯 Example: Refactoring PrayerMap Component

```typescript
import { refactoringLogger } from '@/lib/refactoringLogger';

// Start refactoring
const refactoringId = refactoringLogger.start('PrayerMap refactoring', {
  component: 'PrayerMap',
  goal: 'Extract sub-components for better maintainability',
  current_lines: 400
});

// Extract MapContainer
refactoringLogger.component('MapContainer', 'extracted', {
  from: 'PrayerMap',
  lines: 120
});

refactoringLogger.file('src/components/map/MapContainer.tsx', 'created', {
  lines: 120
});

// Extract PrayerMarkers
refactoringLogger.component('PrayerMarkers', 'extracted', {
  from: 'PrayerMap',
  lines: 80
});

refactoringLogger.file('src/components/map/PrayerMarkers.tsx', 'created', {
  lines: 80
});

// Milestone
refactoringLogger.milestone('All components extracted', {
  components_created: 2,
  tests_passing: true
});

// Performance check
refactoringLogger.performance('component_render_time', 45, 32, {
  component: 'PrayerMap'
});

// Complete
refactoringLogger.complete('PrayerMap refactoring', refactoringId, {
  components_created: 2,
  lines_reduced: 200,
  tests_passing: true,
  performance_improved: true
});
```

---

## 📈 Viewing Logs in Datadog

1. Go to https://app.datadoghq.com/logs
2. Filter by:
   - `service:prayermap`
   - `type:refactoring` (for refactoring logs)
   - `type:component_change` (for component logs)
   - `type:performance` (for performance logs)

3. Create saved views:
   - "Refactoring Progress" - Filter: `type:refactoring`
   - "Component Changes" - Filter: `type:component_change`
   - "Performance Metrics" - Filter: `type:performance`

---

## 🔍 Log Context Best Practices

Always include relevant context:

```typescript
// ✅ Good - Rich context
refactoringLogger.component('PrayerMap', 'extracted', {
  new_components: ['MapContainer', 'PrayerMarkers'],
  lines_reduced: 150,
  files_created: 3,
  tests_passing: true,
  performance_impact: 'improved'
});

// ❌ Bad - Missing context
refactoringLogger.component('PrayerMap', 'extracted');
```

---

## 🎯 Refactoring Workflow

1. **Start**: `refactoringLogger.start()` - Mark beginning
2. **Track Changes**: Log component/file changes as you work
3. **Mark Milestones**: Use `milestone()` for major steps
4. **Monitor Performance**: Use `performance()` to track improvements
5. **Log Issues**: Use `issue()` for problems found
6. **Complete**: `refactoringLogger.complete()` - Mark end with summary

---

## 📚 Related Files

- `src/lib/datadog.ts` - Datadog initialization and basic logging
- `src/lib/refactoringLogger.ts` - Refactoring-specific logging utility
- `docs/DATADOG_PRE_REFACTORING_SETUP.md` - Complete setup guide

---

**Ready to use!** Start logging your refactoring work now. 🚀

