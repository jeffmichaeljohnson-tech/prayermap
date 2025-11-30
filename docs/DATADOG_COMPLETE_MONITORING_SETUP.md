# Complete Datadog Monitoring Setup - Backend, Messaging & Animations

> **Comprehensive monitoring strategy** for PrayerMap's critical systems: backend performance, real-time messaging, and animation performance.

---

## ✅ What's Already Set Up

1. **✅ PostgreSQL Database Monitoring** - Collecting 4,804 metrics per run
2. **✅ Datadog RUM (Frontend)** - Basic React component tracking
3. **✅ Supabase Query Tracing** - Basic query performance tracking

---

## 🎯 What We Need to Add

### 1. **Backend/API Monitoring** ⚠️ Missing
- Supabase Edge Functions performance
- API endpoint latency tracking
- RLS policy performance impact
- Request/response monitoring

### 2. **Messaging/Realtime Monitoring** ⚠️ Partially Missing
- WebSocket connection health
- Message delivery tracking
- Subscription status monitoring
- Reconnection attempts tracking
- Message latency measurement

### 3. **Animation Performance** ⚠️ Missing
- Frame rate monitoring (60fps target)
- Animation jank detection
- GPU usage tracking
- Layout shift tracking
- Animation completion verification

---

## 📊 Monitoring Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Datadog Platform                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend (RUM)          Backend (APM)                 │
│  ├─ React Components     ├─ PostgreSQL                  │
│  ├─ User Interactions   ├─ Supabase Queries            │
│  ├─ Errors              ├─ Edge Functions              │
│  └─ Performance         └─ API Endpoints               │
│                                                         │
│  Real-time (Custom)      Animations (Custom)           │
│  ├─ WebSocket Health    ├─ Frame Rate (60fps)         │
│  ├─ Message Delivery    ├─ Jank Detection             │
│  ├─ Subscription Status ├─ GPU Usage                  │
│  └─ Reconnection Logs   └─ Layout Shifts              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Step 1: Enhanced Backend Monitoring

### 1.1 Supabase Edge Functions Monitoring

**If you're using Supabase Edge Functions**, add monitoring:

```typescript
// src/lib/supabase-edge-traced.ts
import { traceSupabaseQuery } from './datadog';

export async function traceEdgeFunction<T>(
  functionName: string,
  functionFn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return traceSupabaseQuery(`edge_function.${functionName}`, async () => {
    const startTime = performance.now();
    
    try {
      const result = await functionFn();
      const duration = performance.now() - startTime;
      
      // Track edge function performance
      datadogRum.addTiming(`edge_function.${functionName}.duration`, duration);
      
      // Alert on slow edge functions (>2 seconds)
      if (duration > 2000) {
        datadogRum.addError(new Error(`Slow edge function: ${functionName}`), {
          function: functionName,
          duration,
          type: 'slow_edge_function',
          ...metadata,
        });
      }
      
      return result;
    } catch (error) {
      datadogRum.addError(error as Error, {
        function: functionName,
        type: 'edge_function_error',
        ...metadata,
      });
      throw error;
    }
  }, metadata);
}
```

### 1.2 API Endpoint Monitoring

**Add to your service files**:

```typescript
// src/services/prayerService.ts
import { traceSupabaseQuery } from '@/lib/datadog';

export async function createPrayer(prayer: PrayerInput) {
  return traceSupabaseQuery('api.createPrayer', async () => {
    const { data, error } = await supabase
      .from('prayers')
      .insert(prayer)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }, {
    prayer_type: prayer.content_type,
    is_anonymous: prayer.is_anonymous,
  });
}
```

### 1.3 RLS Policy Performance Tracking

**Monitor RLS policy impact**:

```typescript
// Add to datadog.ts
export function trackRLSPolicyPerformance(
  table: string,
  operation: string,
  duration: number,
  policyName?: string
) {
  datadogRum.addTiming(`rls.${table}.${operation}.duration`, duration);
  
  // Alert if RLS adds significant overhead (>100ms)
  if (duration > 100) {
    datadogRum.addAction(`rls.slow_policy`, () => {}, {
      table,
      operation,
      duration,
      policy: policyName,
    });
  }
}
```

---

## 🔧 Step 2: Enhanced Messaging/Realtime Monitoring

### 2.1 WebSocket Connection Health Monitor

**Create comprehensive realtime monitoring**:

```typescript
// src/lib/realtime-monitor.ts
import { datadogRum } from '@datadog/browser-rum';
import { supabase } from './supabase';

export class RealtimeMonitor {
  private connections = new Map<string, {
    channel: any;
    status: 'connected' | 'disconnected' | 'error';
    reconnectAttempts: number;
    lastMessageTime: number;
    messageCount: number;
  }>();

  /**
   * Monitor a Supabase Realtime channel
   */
  monitorChannel(channelName: string, channel: any) {
    const startTime = Date.now();
    
    // Track subscription status
    channel.on('SUBSCRIBED', () => {
      this.connections.set(channelName, {
        channel,
        status: 'connected',
        reconnectAttempts: 0,
        lastMessageTime: Date.now(),
        messageCount: 0,
      });
      
      datadogRum.addAction('realtime.subscribed', () => {}, {
        channel: channelName,
        latency: Date.now() - startTime,
      });
    });

    channel.on('CHANNEL_ERROR', (error: Error) => {
      const conn = this.connections.get(channelName);
      if (conn) {
        conn.status = 'error';
        conn.reconnectAttempts++;
      }
      
      datadogRum.addError(error, {
        channel: channelName,
        type: 'realtime_error',
        reconnectAttempts: conn?.reconnectAttempts || 0,
      });
    });

    channel.on('TIMED_OUT', () => {
      const conn = this.connections.get(channelName);
      if (conn) {
        conn.status = 'disconnected';
        conn.reconnectAttempts++;
      }
      
      datadogRum.addAction('realtime.timeout', () => {}, {
        channel: channelName,
        reconnectAttempts: conn?.reconnectAttempts || 0,
      });
    });

    // Track message delivery
    const originalOn = channel.on?.bind(channel);
    if (originalOn) {
      channel.on = (event: string, callback: any) => {
        return originalOn(event, (payload: any) => {
          const conn = this.connections.get(channelName);
          if (conn) {
            conn.lastMessageTime = Date.now();
            conn.messageCount++;
            
            // Track message latency
            const messageLatency = Date.now() - (payload.created_at ? new Date(payload.created_at).getTime() : Date.now());
            datadogRum.addTiming(`realtime.message.${channelName}.latency`, messageLatency);
          }
          
          return callback(payload);
        });
      };
    }
  }

  /**
   * Get connection health metrics
   */
  getHealthMetrics() {
    const metrics = {
      totalChannels: this.connections.size,
      connectedChannels: 0,
      disconnectedChannels: 0,
      errorChannels: 0,
      totalReconnectAttempts: 0,
      totalMessages: 0,
      avgMessageLatency: 0,
    };

    let totalLatency = 0;
    let latencyCount = 0;

    this.connections.forEach((conn) => {
      if (conn.status === 'connected') metrics.connectedChannels++;
      else if (conn.status === 'disconnected') metrics.disconnectedChannels++;
      else if (conn.status === 'error') metrics.errorChannels++;
      
      metrics.totalReconnectAttempts += conn.reconnectAttempts;
      metrics.totalMessages += conn.messageCount;
    });

    return metrics;
  }

  /**
   * Report metrics to Datadog
   */
  reportMetrics() {
    const metrics = this.getHealthMetrics();
    
    datadogRum.addAction('realtime.health', () => {}, metrics);
    
    // Alert if connection health is poor
    if (metrics.errorChannels > 0 || metrics.disconnectedChannels > metrics.connectedChannels) {
      datadogRum.addError(new Error('Poor realtime connection health'), {
        type: 'realtime_health_warning',
        ...metrics,
      });
    }
  }
}

export const realtimeMonitor = new RealtimeMonitor();
```

### 2.2 Enhanced Realtime Subscription Wrapper

**Update supabase-traced.ts** to use the monitor:

```typescript
// Add to supabase-traced.ts
import { realtimeMonitor } from './realtime-monitor';

// In createTracedSupabase, update channel wrapper:
if (prop === 'channel') {
  return (name: string, options?: any) => {
    const channel = original.call(target, name, options);
    
    // Monitor channel health
    realtimeMonitor.monitorChannel(name, channel);
    
    return traceRealtimeSubscription(name, () => channel);
  };
}
```

### 2.3 Message Delivery Tracking

**Track message delivery end-to-end**:

```typescript
// src/lib/message-delivery-tracker.ts
import { datadogRum } from '@datadog/browser-rum';

export function trackMessageDelivery(
  messageId: string,
  channel: string,
  action: 'sent' | 'received' | 'delivered' | 'read'
) {
  const timestamp = Date.now();
  
  datadogRum.addAction(`message.${action}`, () => {}, {
    message_id: messageId,
    channel,
    timestamp,
    action,
  });
  
  // Track delivery latency
  if (action === 'received') {
    // Calculate time from sent to received
    const sentTime = localStorage.getItem(`msg_sent_${messageId}`);
    if (sentTime) {
      const latency = timestamp - parseInt(sentTime);
      datadogRum.addTiming(`message.delivery_latency`, latency);
      localStorage.removeItem(`msg_sent_${messageId}`);
    }
  } else if (action === 'sent') {
    localStorage.setItem(`msg_sent_${messageId}`, timestamp.toString());
  }
}
```

---

## 🔧 Step 3: Animation Performance Monitoring

### 3.1 Frame Rate Monitor (60fps Target)

**Create animation performance monitor**:

```typescript
// src/lib/animation-monitor.ts
import { datadogRum } from '@datadog/browser-rum';

export class AnimationMonitor {
  private frameCount = 0;
  private lastFrameTime = 0;
  private jankyFrames = 0;
  private monitoring = false;
  private animationFrameId: number | null = null;

  /**
   * Start monitoring animation performance
   */
  start(animationName: string) {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.frameCount = 0;
    this.jankyFrames = 0;
    this.lastFrameTime = performance.now();
    
    const measureFrame = (timestamp: number) => {
      if (!this.monitoring) return;
      
      const frameTime = timestamp - this.lastFrameTime;
      
      // Detect janky frames (>16.67ms for 60fps)
      if (frameTime > 16.67) {
        this.jankyFrames++;
      }
      
      this.frameCount++;
      this.lastFrameTime = timestamp;
      
      // Report every 60 frames (1 second at 60fps)
      if (this.frameCount % 60 === 0) {
        const fps = Math.round(60000 / (timestamp - (this.lastFrameTime - frameTime * 60)));
        const jankRate = (this.jankyFrames / 60) * 100;
        
        datadogRum.addTiming(`animation.${animationName}.fps`, fps);
        datadogRum.addTiming(`animation.${animationName}.jank_rate`, jankRate);
        
        // Alert if FPS drops below 55 (target is 60)
        if (fps < 55) {
          datadogRum.addError(new Error(`Low FPS: ${fps} for ${animationName}`), {
            type: 'animation_performance',
            animation: animationName,
            fps,
            jankRate,
          });
        }
        
        // Reset counters
        this.jankyFrames = 0;
      }
      
      this.animationFrameId = requestAnimationFrame(measureFrame);
    };
    
    this.animationFrameId = requestAnimationFrame(measureFrame);
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.monitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Track animation completion
   */
  trackCompletion(animationName: string, duration: number, expectedDuration: number) {
    const variance = Math.abs(duration - expectedDuration);
    const variancePercent = (variance / expectedDuration) * 100;
    
    datadogRum.addTiming(`animation.${animationName}.duration`, duration);
    datadogRum.addTiming(`animation.${animationName}.variance`, variancePercent);
    
    // Alert if animation takes significantly longer than expected
    if (variancePercent > 20) {
      datadogRum.addError(new Error(`Animation timing variance: ${variancePercent}%`), {
        type: 'animation_timing',
        animation: animationName,
        duration,
        expectedDuration,
        variance: variancePercent,
      });
    }
  }
}

export const animationMonitor = new AnimationMonitor();
```

### 3.2 Framer Motion Integration

**Wrap Framer Motion animations**:

```typescript
// src/lib/framer-motion-traced.ts
import { motion, MotionProps } from 'framer-motion';
import { animationMonitor } from './animation-monitor';
import { useEffect, useRef } from 'react';

/**
 * Traced motion component that monitors animation performance
 */
export function TracedMotion({
  animationName,
  children,
  onAnimationStart,
  onAnimationComplete,
  ...props
}: MotionProps & { animationName: string }) {
  const startTimeRef = useRef<number>(0);
  const expectedDurationRef = useRef<number>(0);
  
  useEffect(() => {
    if (animationName) {
      animationMonitor.start(animationName);
    }
    
    return () => {
      if (animationName) {
        animationMonitor.stop();
      }
    };
  }, [animationName]);
  
  const handleAnimationStart = () => {
    startTimeRef.current = performance.now();
    
    // Extract expected duration from transition
    if (props.transition?.duration) {
      expectedDurationRef.current = (props.transition.duration as number) * 1000;
    }
    
    onAnimationStart?.();
  };
  
  const handleAnimationComplete = () => {
    const duration = performance.now() - startTimeRef.current;
    
    if (animationName && expectedDurationRef.current > 0) {
      animationMonitor.trackCompletion(
        animationName,
        duration,
        expectedDurationRef.current
      );
    }
    
    onAnimationComplete?.();
  };
  
  return (
    <motion.div
      {...props}
      onAnimationStart={handleAnimationStart}
      onAnimationComplete={handleAnimationComplete}
    >
      {children}
    </motion.div>
  );
}
```

### 3.3 Layout Shift Tracking

**Track Cumulative Layout Shift (CLS)**:

```typescript
// src/lib/layout-shift-tracker.ts
import { datadogRum } from '@datadog/browser-rum';

export function trackLayoutShifts() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }
  
  let clsValue = 0;
  let clsEntries: PerformanceEntry[] = [];
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Only count layout shifts without recent user input
      if (!(entry as any).hadRecentInput) {
        const firstSessionEntry = clsEntries[0];
        const lastSessionEntry = clsEntries[clsEntries.length - 1];
        
        // If entries occurred less than 1 second apart and share the same source, merge them
        if (
          clsEntries.length &&
          entry.startTime - lastSessionEntry.startTime < 1000 &&
          entry.startTime - firstSessionEntry.startTime < 5000
        ) {
          clsValue += (entry as any).value;
          clsEntries.push(entry);
        } else {
          clsValue = (entry as any).value;
          clsEntries = [entry];
        }
        
        // Report CLS to Datadog
        datadogRum.addTiming('layout_shift.cls', clsValue);
        
        // Alert if CLS is high (>0.1 is poor)
        if (clsValue > 0.1) {
          datadogRum.addError(new Error(`High CLS: ${clsValue.toFixed(3)}`), {
            type: 'layout_shift',
            cls: clsValue,
            entries: clsEntries.length,
          });
        }
      }
    }
  });
  
  observer.observe({ type: 'layout-shift', buffered: true });
  
  return () => observer.disconnect();
}
```

---

## 🔧 Step 4: Integration with Existing Code

### 4.1 Update Realtime Subscriptions

**Update your messaging services** to use the monitor:

```typescript
// src/services/messaging/MessagingChannelManager.ts
import { realtimeMonitor } from '@/lib/realtime-monitor';
import { trackMessageDelivery } from '@/lib/message-delivery-tracker';

// In setupConversationChannel:
const channel = supabase.channel(channelName);

// Monitor channel health
realtimeMonitor.monitorChannel(channelName, channel);

channel.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'prayer_responses',
  filter: `prayer_id=eq.${conversationId}`
}, (payload) => {
  // Track message delivery
  trackMessageDelivery(
    payload.new.id,
    channelName,
    'received'
  );
  
  this.handleNewMessage(conversationId, payload.new);
});
```

### 4.2 Update Animation Components

**Use TracedMotion for critical animations**:

```typescript
// src/components/PrayerAnimationLayer.tsx
import { TracedMotion } from '@/lib/framer-motion-traced';

export function PrayerAnimationLayer() {
  return (
    <TracedMotion
      animationName="prayer_send_animation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 6 }}
    >
      {/* Animation content */}
    </TracedMotion>
  );
}
```

### 4.3 Initialize Layout Shift Tracking

**Add to App.tsx**:

```typescript
// src/App.tsx
import { trackLayoutShifts } from '@/lib/layout-shift-tracker';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const cleanup = trackLayoutShifts();
    return cleanup;
  }, []);
  
  // ... rest of app
}
```

---

## 📊 Datadog Dashboard Setup

### Custom Dashboard: "PrayerMap Performance"

**Create dashboard with these widgets**:

1. **Backend Performance**
   - PostgreSQL query time (p95)
   - Slow queries count (>1s)
   - RLS policy overhead
   - Edge function latency

2. **Messaging Health**
   - WebSocket connection count
   - Message delivery latency (p95)
   - Reconnection attempts
   - Subscription error rate

3. **Animation Performance**
   - Average FPS across all animations
   - Jank rate (% frames >16.67ms)
   - Animation completion variance
   - Layout shift score (CLS)

### Alerts to Set Up

1. **Backend Alerts**
   - Slow queries: Alert when >10 queries/sec take >1s
   - Connection pool: Alert when >80% of max connections
   - RLS overhead: Alert when RLS adds >200ms overhead

2. **Messaging Alerts**
   - Connection failures: Alert when >5% of subscriptions fail
   - Message latency: Alert when p95 latency >2 seconds
   - Reconnection storms: Alert when >10 reconnections/min

3. **Animation Alerts**
   - Low FPS: Alert when FPS <55 for >5 seconds
   - High jank: Alert when jank rate >10%
   - Layout shifts: Alert when CLS >0.1

---

## ✅ Implementation Checklist

### Backend Monitoring
- [ ] Add Edge Function tracing
- [ ] Add API endpoint tracing to all services
- [ ] Track RLS policy performance
- [ ] Set up backend alerts

### Messaging Monitoring
- [ ] Integrate RealtimeMonitor into all subscriptions
- [ ] Add message delivery tracking
- [ ] Set up connection health reporting
- [ ] Create messaging dashboard

### Animation Monitoring
- [ ] Add AnimationMonitor to critical animations
- [ ] Wrap Framer Motion components with TracedMotion
- [ ] Track layout shifts
- [ ] Set up animation performance alerts

---

## 📚 Next Steps

1. **Implement monitoring code** (use templates above)
2. **Test monitoring** in development
3. **Create Datadog dashboards** for each area
4. **Set up alerts** for critical metrics
5. **Review metrics weekly** to optimize performance

---

**Priority Order**:
1. **Messaging** (critical for Living Map real-time features)
2. **Animation** (critical for 60fps spiritual experience)
3. **Backend** (important for overall performance)

**Let's start with messaging monitoring since it's critical for the Living Map principle!**

