# PrayerMap Logging & Observability Infrastructure

Complete world-class logging and observability system for self-diagnosis and debugging.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Features](#features)
- [How to Enable Debug Mode](#how-to-enable-debug-mode)
- [Components](#components)
- [Usage Examples](#usage-examples)
- [Log Output Examples](#log-output-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The PrayerMap logging infrastructure provides:

- **Structured Logging**: JSON-formatted logs with context enrichment
- **Error Tracking**: Automatic error capture with breadcrumbs and deduplication
- **Performance Monitoring**: Core Web Vitals, component metrics, API tracking
- **Debug Mode**: Toggle verbose logging and diagnostic overlays
- **Self-Diagnostics**: Browser capabilities, service health, storage status

## Quick Start

### 1. Import the Logger

```typescript
import { logger, useLogger } from './lib/logger';

// In a function/service
logger.info('Operation started', {
  action: 'operation_name',
  metadata: { key: 'value' },
});

// In a React component
const componentLogger = useLogger('MyComponent');
componentLogger.info('Component action', { action: 'button_click' });
```

### 2. Track Async Operations

```typescript
import { logger } from './lib/logger';

const result = await logger.trackAsync(
  'fetchUserData',
  async () => {
    return await api.getUser(userId);
  },
  { action: 'user_fetch', userId }
);
```

### 3. Capture Errors

```typescript
import { errorTracker } from './lib/errorTracking';

try {
  // risky operation
} catch (error) {
  errorTracker.captureException(error as Error, {
    context: 'MyComponent.handleSubmit',
    userId: user?.id,
  });
}
```

## How to Enable Debug Mode

### Method 1: URL Parameter (Recommended for Testing)

Add `?debug=true` to your URL:

```
http://localhost:5173/?debug=true
```

This enables:
- Verbose logging (DEBUG level)
- Network logging
- State inspection

For specific features:
```
?debug-performance    # Enable performance overlay only
?debug-render        # Enable render highlighting only
```

### Method 2: Browser Console

```javascript
// Enable debug mode
window.prayerMapDebug.enable();

// Enable with specific options
window.prayerMapDebug.enable({
  verboseLogging: true,
  networkLogging: true,
  performanceOverlay: true,
  stateInspection: true,
});

// Disable debug mode
window.prayerMapDebug.disable();

// Toggle a specific feature
window.prayerMapDebug.toggle('performanceOverlay');

// Export debug data
window.prayerMapDebug.downloadDebugData();
```

### Method 3: Debug Panel UI

When debug mode is enabled, a Debug Panel appears in the bottom-right corner:

- Toggle individual features with checkboxes
- Export debug data as JSON
- Close to disable debug mode

## Features

### 1. Structured Logger (`/src/lib/logger.ts`)

**Capabilities:**
- Multiple log levels: DEBUG, INFO, WARN, ERROR, FATAL
- Context enrichment (user, session, action, component)
- Correlation IDs for request tracing
- Performance timing
- React hooks for component logging

**Log Levels:**
- `DEBUG`: Detailed information for debugging (dev only by default)
- `INFO`: General informational messages
- `WARN`: Warning messages for potential issues
- `ERROR`: Error events that might still allow the app to continue
- `FATAL`: Severe errors that might cause termination

**Transports:**
- `ConsoleTransport`: Pretty-printed in dev, JSON in production
- `LocalStorageTransport`: Circular buffer of last 1000 logs
- `RemoteTransport`: Send logs to remote service (placeholder)

### 2. Error Tracking (`/src/lib/errorTracking.ts`)

**Features:**
- Automatic global error capture
- Unhandled promise rejection tracking
- Error deduplication via fingerprinting
- Breadcrumb trail (last 50 actions)
- React Error Boundary integration

**Automatic Instrumentation:**
- Global `window.onerror`
- Unhandled promise rejections
- Console errors and warnings
- Fetch API calls
- Navigation events

### 3. Performance Monitor (`/src/lib/performanceMonitor.ts`)

**Metrics Tracked:**
- **Core Web Vitals**: LCP, FID, CLS, FCP, TTFB, INP
- **Component Metrics**: Render count, average/max render time
- **API Metrics**: Call count, success/error rate, duration
- **Memory**: JS heap usage (if available)
- **Long Tasks**: Detect tasks > 50ms

**Performance Thresholds:**
- LCP: Good ≤ 2.5s, Needs Improvement ≤ 4s
- FID: Good ≤ 100ms, Needs Improvement ≤ 300ms
- CLS: Good ≤ 0.1, Needs Improvement ≤ 0.25
- FCP: Good ≤ 1.8s, Needs Improvement ≤ 3s
- TTFB: Good ≤ 800ms, Needs Improvement ≤ 1.8s

### 4. Debug Mode (`/src/lib/debugMode.ts`)

**Features:**
- Toggle debug mode on/off
- Enable/disable specific features
- State inspection with history
- Export debug data as JSON
- URL parameter support

**Debug Features:**
- `verboseLogging`: Set log level to DEBUG
- `networkLogging`: Log all network requests
- `performanceOverlay`: Show real-time performance metrics
- `renderHighlighting`: Highlight component re-renders
- `stateInspection`: Log and inspect state changes

### 5. Self-Diagnostics (`/src/lib/diagnostics.ts`)

**Checks:**
- Browser name and version
- Feature capabilities (WebGL, WebRTC, MediaRecorder, etc.)
- Permissions (camera, microphone, geolocation, notifications)
- Connectivity status and network info
- Storage availability and usage
- Service health (Supabase, Mapbox)

### 6. Diagnostic Overlay (`/src/components/DiagnosticOverlay.tsx`)

**Tabs:**
- **Performance**: Core Web Vitals, memory usage, slow components
- **Errors**: Recent errors with stack traces
- **Network**: Connectivity status, API call metrics
- **System**: Browser info, capabilities, services, storage

## Usage Examples

### In a Service

```typescript
import { logger } from '../lib/logger';

const serviceLogger = logger.child({ component: 'PrayerService' });

export async function createPrayer(data: PrayerData) {
  serviceLogger.info('Creating prayer', {
    action: 'prayer_create_start',
    userId: data.userId,
  });

  try {
    const result = await logger.trackAsync(
      'createPrayer',
      async () => {
        return await api.createPrayer(data);
      },
      { action: 'prayer_create', userId: data.userId }
    );

    serviceLogger.info('Prayer created', {
      action: 'prayer_create_success',
      metadata: { prayerId: result.id },
    });

    return result;
  } catch (error) {
    serviceLogger.error('Failed to create prayer', error as Error, {
      action: 'prayer_create_failed',
    });
    throw error;
  }
}
```

### In a React Hook

```typescript
import { useLogger } from '../lib/logger';
import { usePerformance } from '../lib/performanceMonitor';

export function usePrayers() {
  const logger = useLogger('usePrayers');
  const { trackInteraction } = usePerformance('usePrayers');

  const createPrayer = async (data: PrayerData) => {
    const endTrack = trackInteraction('createPrayer');

    logger.info('Creating prayer', { action: 'prayer_create' });

    try {
      const result = await api.createPrayer(data);
      logger.info('Prayer created', { action: 'prayer_create_success' });
      endTrack();
      return result;
    } catch (error) {
      logger.error('Failed to create prayer', error as Error);
      endTrack();
      throw error;
    }
  };

  return { createPrayer };
}
```

### In a React Component

```typescript
import { useLogger, useRenderLogger } from '../lib/logger';
import { usePerformance } from '../lib/performanceMonitor';

export function MyComponent() {
  const logger = useLogger('MyComponent');
  useRenderLogger('MyComponent'); // Track renders in dev
  const { trackInteraction } = usePerformance('MyComponent');

  const handleClick = () => {
    const endTrack = trackInteraction('buttonClick');

    logger.info('Button clicked', {
      action: 'button_click',
      metadata: { buttonId: 'submit' },
    });

    // ... handle click

    endTrack();
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

## Log Output Examples

### Development (Pretty-Printed)

```
[14:32:15] INFO PrayerMap application started [AppContent]
{
  action: 'app_init',
  metadata: {
    version: '1.0.0',
    environment: 'development',
    debugMode: false
  }
}

[14:32:16] INFO User location obtained [AppContent]
{
  action: 'geolocation_success',
  metadata: {
    lat: 37.7749,
    lng: -122.4194,
    accuracy: 10
  }
}

[14:32:20] ERROR Failed to create prayer [PrayerService]
{
  action: 'prayer_create_failed',
  userId: 'user_123',
  error: {
    name: 'Error',
    message: 'Network request failed',
    stack: '...'
  }
}
```

### Production (JSON)

```json
{
  "timestamp": "2025-11-29T14:32:15.123Z",
  "level": 1,
  "levelName": "INFO",
  "message": "PrayerMap application started",
  "context": {
    "action": "app_init",
    "component": "AppContent",
    "correlationId": "1234567890-abc123",
    "metadata": {
      "version": "1.0.0",
      "environment": "production",
      "debugMode": false
    }
  },
  "environment": "production",
  "version": "1.0.0"
}
```

### Error Report Example

```json
{
  "id": "err_1638123456_abc123",
  "timestamp": "2025-11-29T14:32:20.456Z",
  "error": {
    "name": "Error",
    "message": "Network request failed",
    "stack": "Error: Network request failed\n    at createPrayer (...)"
  },
  "context": {
    "userId": "user_123",
    "sessionId": "session_1638123400_xyz789",
    "url": "https://prayermap.com/",
    "userAgent": "Mozilla/5.0...",
    "viewport": { "width": 1920, "height": 1080 },
    "correlationId": "1234567890-abc123"
  },
  "breadcrumbs": [
    {
      "timestamp": "2025-11-29T14:32:18.000Z",
      "category": "navigation",
      "message": "Page loaded: /",
      "level": "info"
    },
    {
      "timestamp": "2025-11-29T14:32:19.000Z",
      "category": "click",
      "message": "Button clicked: create-prayer",
      "level": "info"
    },
    {
      "timestamp": "2025-11-29T14:32:20.000Z",
      "category": "xhr",
      "message": "Fetch: /api/prayers",
      "level": "info"
    }
  ],
  "tags": {},
  "extra": {
    "context": "PrayerService.createPrayer"
  }
}
```

## Best Practices

### 1. Use Appropriate Log Levels

- `DEBUG`: Verbose information useful during development
- `INFO`: Important business logic milestones
- `WARN`: Recoverable issues or deprecation warnings
- `ERROR`: Errors that need attention but don't crash the app
- `FATAL`: Critical errors that may crash the app

### 2. Add Context to Logs

Always include:
- `action`: What operation is being performed
- `userId`: Who is performing the action (if available)
- `metadata`: Additional relevant data

```typescript
logger.info('Prayer created', {
  action: 'prayer_create_success',
  userId: user.id,
  metadata: {
    prayerId: prayer.id,
    location: prayer.location,
  },
});
```

### 3. Track Async Operations

Use `trackAsync` for automatic timing and error handling:

```typescript
const result = await logger.trackAsync(
  'operationName',
  async () => {
    // your async operation
  },
  { action: 'action_name', ...context }
);
```

### 4. Add Breadcrumbs for Important Actions

```typescript
errorTracker.addBreadcrumb({
  category: 'custom',
  message: 'User performed action X',
  level: 'info',
  data: { relevantData: 'value' },
});
```

### 5. Track Performance

```typescript
// In components
const { trackInteraction } = usePerformance('ComponentName');

const handleClick = () => {
  const endTrack = trackInteraction('actionName');
  // ... do work
  endTrack();
};

// In services
performanceMonitor.trackApiCall('/api/endpoint', duration, success);
```

### 6. Use Error Boundaries

Wrap components with Error Boundaries:

```typescript
import { ErrorBoundary } from './lib/errorTracking';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

## Troubleshooting

### Logs Not Appearing in Console

1. Check log level - DEBUG logs only appear in development
2. Verify logger is imported correctly
3. Check browser console filters

### Debug Mode Not Enabling

1. Clear localStorage: `localStorage.clear()`
2. Try URL parameter: `?debug=true`
3. Check browser console for errors

### Performance Overlay Not Showing

1. Enable debug mode first
2. Toggle performance overlay: `window.prayerMapDebug.toggle('performanceOverlay')`
3. Refresh the page

### High Memory Usage

1. Open Diagnostic Overlay → Performance tab
2. Check JS heap usage percentage
3. If > 90%, consider:
   - Clearing old logs: `localStorage.clear()`
   - Reducing component count
   - Optimizing re-renders

### Export Debug Data

```javascript
// In browser console
window.prayerMapDebug.downloadDebugData();
```

This creates a JSON file with:
- All error reports
- Performance metrics
- Component and API metrics
- Browser capabilities
- Service health status

## API Reference

See the individual files for complete API documentation:

- `/src/lib/logger.ts` - Logger API
- `/src/lib/errorTracking.ts` - Error Tracking API
- `/src/lib/performanceMonitor.ts` - Performance Monitor API
- `/src/lib/debugMode.ts` - Debug Mode API
- `/src/lib/diagnostics.ts` - Diagnostics API

## Examples

Complete integration examples:

- `/src/examples/logging-integration-service.example.ts`
- `/src/examples/logging-integration-hook.example.tsx`
- `/src/examples/logging-integration-component.example.tsx`

---

Built with ❤️ for PrayerMap
