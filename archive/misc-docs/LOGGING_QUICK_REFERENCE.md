# Logging & Observability Quick Reference

## Enable Debug Mode

```bash
# URL Parameter
http://localhost:5173/?debug=true

# Browser Console
window.prayerMapDebug.enable()
window.prayerMapDebug.downloadDebugData()
```

## Basic Logging

```typescript
// Import
import { logger, useLogger } from './lib/logger';

// Function/Service
logger.info('Message', { action: 'action_name', metadata: {} });

// React Component
const log = useLogger('ComponentName');
log.info('Action', { action: 'action_name' });
```

## Track Async Operations

```typescript
const result = await logger.trackAsync(
  'operationName',
  async () => api.call(),
  { action: 'api_call', userId }
);
```

## Error Tracking

```typescript
import { errorTracker } from './lib/errorTracking';

// Capture error
errorTracker.captureException(error, { context: 'where', data: {} });

// Add breadcrumb
errorTracker.addBreadcrumb({
  category: 'custom',
  message: 'Action performed',
  level: 'info',
});
```

## Performance Tracking

```typescript
import { usePerformance } from './lib/performanceMonitor';

const { trackInteraction } = usePerformance('ComponentName');

const handleClick = () => {
  const end = trackInteraction('clickAction');
  // ... do work
  end();
};
```

## Log Levels

- `DEBUG` - Development only (verbose)
- `INFO` - Important events
- `WARN` - Warnings
- `ERROR` - Errors
- `FATAL` - Critical errors

## Context Keys

Always include:
- `action` - What's happening
- `userId` - Who (if available)
- `metadata` - Additional data

## Common Patterns

```typescript
// Service
const log = logger.child({ component: 'ServiceName' });

// Hook
const log = useLogger('useHookName');

// Component
const log = useLogger('ComponentName');
useRenderLogger('ComponentName'); // Track renders

// Performance
const { trackInteraction } = usePerformance('Name');
```

## Debug Data Export

```javascript
// Browser console
window.prayerMapDebug.downloadDebugData()

// Returns JSON with:
// - Error reports
// - Performance metrics
// - Component metrics
// - API metrics
// - Browser diagnostics
```

## Keyboard Shortcuts

None by default. Access via:
- URL: `?debug=true`
- Console: `window.prayerMapDebug`
- Debug Panel (appears when enabled)

## Files Created

- `/src/lib/logger.ts` - Core logging
- `/src/lib/errorTracking.ts` - Error capture
- `/src/lib/performanceMonitor.ts` - Metrics
- `/src/lib/debugMode.ts` - Debug controls
- `/src/lib/diagnostics.ts` - System checks
- `/src/components/DiagnosticOverlay.tsx` - Visual overlay
- `/src/examples/*.example.ts*` - Usage examples

## See Also

- Full documentation: `/LOGGING_AND_OBSERVABILITY.md`
- Examples: `/src/examples/`
