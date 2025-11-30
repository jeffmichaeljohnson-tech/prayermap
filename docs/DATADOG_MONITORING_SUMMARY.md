# Datadog Monitoring Setup - Complete Summary

## ✅ What's Set Up

### 1. PostgreSQL Database Monitoring ✅
- **Status**: Working perfectly
- **Metrics**: 4,804 per run
- **Location**: `/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml`
- **What it monitors**: Query performance, connections, table sizes, slow queries

### 2. Frontend RUM (Real User Monitoring) ✅
- **Status**: Configured in code
- **Location**: `src/lib/datadog.ts`
- **What it monitors**: React components, user interactions, errors, page views

---

## 🆕 What We Just Added

### 1. Realtime/Messaging Monitor ✅
**File**: `src/lib/realtime-monitor.ts`

**Monitors**:
- WebSocket connection health
- Message delivery latency
- Subscription status
- Reconnection attempts
- Message count per channel

**Usage**:
```typescript
import { realtimeMonitor } from '@/lib/realtime-monitor';

// In your subscription code:
const channel = supabase.channel('prayers');
realtimeMonitor.monitorChannel('prayers', channel);
channel.subscribe();
```

### 2. Animation Performance Monitor ✅
**File**: `src/lib/animation-monitor.ts`

**Monitors**:
- Frame rate (target: 60fps)
- Jank detection (frames >16.67ms)
- Animation completion timing
- Animation variance

**Usage**:
```typescript
import { animationMonitor } from '@/lib/animation-monitor';

// Start monitoring
animationMonitor.start('prayer_send_animation');

// Stop monitoring
animationMonitor.stop('prayer_send_animation');

// Track completion
animationMonitor.trackCompletion('prayer_send_animation', 6000, 6000);
```

### 3. Layout Shift Tracker ✅
**File**: `src/lib/layout-shift-tracker.ts`

**Monitors**:
- Cumulative Layout Shift (CLS)
- Visual stability
- Element-specific layout shifts

**Usage**:
```typescript
import { trackLayoutShifts } from '@/lib/layout-shift-tracker';

// In App.tsx
useEffect(() => {
  const cleanup = trackLayoutShifts();
  return cleanup;
}, []);
```

---

## 📊 Complete Monitoring Coverage

| System | Status | Metrics Tracked |
|--------|--------|----------------|
| **Database** | ✅ Working | Query time, connections, slow queries |
| **Frontend RUM** | ✅ Configured | Component performance, errors, interactions |
| **Messaging** | ✅ Ready to integrate | Connection health, message latency, subscriptions |
| **Animations** | ✅ Ready to integrate | FPS, jank rate, completion timing |
| **Layout Shifts** | ✅ Ready to integrate | CLS score, visual stability |

---

## 🎯 Next Steps (Priority Order)

### Step 1: Integrate Messaging Monitor (30 minutes)

**Update these files**:

1. **`src/services/messaging/MessagingChannelManager.ts`**:
```typescript
import { realtimeMonitor } from '@/lib/realtime-monitor';

// In setupConversationChannel:
realtimeMonitor.monitorChannel(channelName, channel);
```

2. **`src/services/inboxSyncService.ts`**:
```typescript
import { realtimeMonitor } from '@/lib/realtime-monitor';

// In subscribeToInbox:
realtimeMonitor.monitorChannel(subscriptionKey, subscription);
```

3. **`src/lib/supabase-traced.ts`**:
```typescript
import { realtimeMonitor } from './realtime-monitor';

// Update channel wrapper:
if (prop === 'channel') {
  return (name: string, options?: any) => {
    const channel = original.call(target, name, options);
    realtimeMonitor.monitorChannel(name, channel);
    return traceRealtimeSubscription(name, () => channel);
  };
}
```

### Step 2: Integrate Animation Monitor (30 minutes)

**Update these files**:

1. **`src/components/PrayerAnimationLayer.tsx`**:
```typescript
import { animationMonitor } from '@/lib/animation-monitor';
import { useEffect } from 'react';

// In component:
useEffect(() => {
  animationMonitor.start('prayer_send_animation');
  return () => {
    animationMonitor.stop('prayer_send_animation');
  };
}, []);
```

2. **`src/App.tsx`**:
```typescript
import { trackLayoutShifts } from '@/lib/layout-shift-tracker';

useEffect(() => {
  const cleanup = trackLayoutShifts();
  return cleanup;
}, []);
```

### Step 3: Create Datadog Dashboards (15 minutes)

1. **Messaging Dashboard**:
   - WebSocket connection count
   - Message delivery latency (p95)
   - Subscription error rate
   - Reconnection attempts

2. **Animation Dashboard**:
   - Average FPS
   - Jank rate
   - Animation completion variance
   - Layout shift score (CLS)

3. **Backend Dashboard**:
   - Query performance
   - Slow queries count
   - Connection pool usage

---

## 🔔 Alerts to Set Up

### Critical Alerts

1. **Messaging**:
   - Connection failures: Alert when >5% subscriptions fail
   - Message latency: Alert when p95 >2 seconds
   - Reconnection storms: Alert when >10 reconnections/min

2. **Animations**:
   - Low FPS: Alert when FPS <55 for >5 seconds
   - High jank: Alert when jank rate >10%
   - Layout shifts: Alert when CLS >0.1

3. **Backend**:
   - Slow queries: Alert when >10 queries/sec take >1s
   - Connection pool: Alert when >80% of max

---

## 📚 Documentation Created

1. **`docs/DATADOG_COMPLETE_MONITORING_SETUP.md`** - Full setup guide
2. **`docs/DATADOG_MONITORING_IMPLEMENTATION_PLAN.md`** - Implementation checklist
3. **`src/lib/realtime-monitor.ts`** - Realtime monitoring code
4. **`src/lib/animation-monitor.ts`** - Animation monitoring code
5. **`src/lib/layout-shift-tracker.ts`** - Layout shift tracking code

---

## ✅ Current Status

- ✅ **PostgreSQL**: Fully monitored and working
- ✅ **Frontend RUM**: Configured and ready
- ✅ **Messaging Monitor**: Code created, needs integration
- ✅ **Animation Monitor**: Code created, needs integration
- ✅ **Layout Shift Tracker**: Code created, needs integration

---

## 🚀 Ready to Implement?

**Start with messaging monitoring** - it's most critical for the Living Map real-time features.

**Quick start**:
1. Import `realtimeMonitor` in your messaging services
2. Call `monitorChannel()` for each subscription
3. Check Datadog dashboard for metrics
4. Set up alerts

**Then move to animations**, then backend monitoring.

---

**All the code is ready - just needs integration! Let me know which one you want to tackle first.**

