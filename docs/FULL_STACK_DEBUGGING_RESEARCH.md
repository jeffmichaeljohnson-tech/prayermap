# Full-Stack Debugging Tools Research

> **Problem**: Agents can't debug basic chat/messaging windows. Need tools that intelligently debug BOTH backend (Supabase queries, WebSocket connections) AND frontend (React components, animations) together.

---

## 🎯 Requirements

### Must Have
- ✅ **Full-stack distributed tracing** - Trace requests from frontend → backend → database
- ✅ **Supabase integration** - Monitor queries, RLS policies, real-time subscriptions
- ✅ **WebSocket/Realtime debugging** - Track Supabase Realtime connections and messages
- ✅ **Intelligent correlation** - Automatically link frontend actions to backend operations
- ✅ **Root cause analysis** - AI-powered insights into failures
- ✅ **Real-time monitoring** - See issues as they happen

### Nice to Have
- ✅ **Session replay** - See exactly what users see
- ✅ **Performance profiling** - Identify bottlenecks across stack
- ✅ **Error tracking** - Automatic error detection and grouping
- ✅ **Visual regression** - Detect UI bugs

---

## 🔍 Top Recommendations (Ranked)

### 1. **Datadog RUM + APM** ⭐⭐⭐⭐⭐ (BEST OVERALL)

**Why It's Perfect**:
- **Full-stack distributed tracing** - Automatically traces React → Supabase → PostgreSQL
- **Real User Monitoring (RUM)** - Frontend performance + user sessions
- **APM** - Backend/database query tracing
- **Intelligent correlation** - Links frontend errors to backend queries automatically
- **Supabase support** - Built-in PostgreSQL and WebSocket tracing
- **AI-powered insights** - Root cause analysis and anomaly detection

**Key Features**:
- **Automatic instrumentation** - Works with React, Supabase, PostgreSQL out of the box
- **Distributed tracing** - See complete request flow: User click → React component → Supabase query → Database
- **WebSocket monitoring** - Track Supabase Realtime subscriptions and messages
- **Query performance** - See slow queries, RLS policy impacts, connection pooling
- **Error correlation** - Frontend error automatically linked to backend query that caused it
- **Session replay** - Optional integration with LogRocket-like features

**Pricing**: 
- Free tier: 1M RUM events/month, 1M APM spans/month
- Paid: $31/month per host (APM) + $0.10 per 1K RUM sessions

**Installation**:
```bash
npm install @datadog/browser-rum @datadog/browser-rum-react
```

**Configuration** (`src/lib/datadog.ts`):
```typescript
import { datadogRum } from '@datadog/browser-rum';
import { datadogRumReact } from '@datadog/browser-rum-react';

datadogRum.init({
  applicationId: process.env.VITE_DATADOG_APP_ID!,
  clientToken: process.env.VITE_DATADOG_CLIENT_TOKEN!,
  site: 'datadoghq.com',
  service: 'prayermap',
  env: process.env.NODE_ENV || 'development',
  version: process.env.VITE_APP_VERSION,
  sessionSampleRate: 100, // 100% for debugging
  sessionReplaySampleRate: 10, // 10% session replay
  trackResources: true,
  trackLongTasks: true,
  trackUserInteractions: true,
  defaultPrivacyLevel: 'allow', // For debugging
  beforeSend: (event) => {
    // Add Supabase context
    if (event.type === 'resource' && event.resource?.url?.includes('supabase')) {
      event.context = {
        ...event.context,
        supabase_url: event.resource.url,
        supabase_table: extractTableFromUrl(event.resource.url),
      };
    }
    return true;
  },
});

// React integration
datadogRumReact.setupTracking(React);

// Supabase query tracing
export function traceSupabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return datadogRum.addAction(`supabase.query.${queryName}`, async () => {
    const startTime = performance.now();
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      datadogRum.addTiming(`supabase.query.${queryName}.duration`, duration);
      
      if (duration > 1000) {
        datadogRum.addError(new Error(`Slow query: ${queryName}`), {
          query: queryName,
          duration,
        });
      }
      
      return result;
    } catch (error) {
      datadogRum.addError(error as Error, {
        query: queryName,
        type: 'supabase_error',
      });
      throw error;
    }
  });
}
```

**Supabase Integration** (`src/lib/supabase-tracing.ts`):
```typescript
import { supabase } from './supabase';
import { traceSupabaseQuery } from './datadog';

// Wrap Supabase client with tracing
export const tracedSupabase = {
  ...supabase,
  from: (table: string) => {
    const originalFrom = supabase?.from(table);
    if (!originalFrom) return originalFrom;
    
    return {
      ...originalFrom,
      select: (columns?: string) => {
        return traceSupabaseQuery(`select.${table}`, () => 
          originalFrom.select(columns)
        );
      },
      insert: (values: any) => {
        return traceSupabaseQuery(`insert.${table}`, () => 
          originalFrom.insert(values)
        );
      },
      update: (values: any) => {
        return traceSupabaseQuery(`update.${table}`, () => 
          originalFrom.update(values)
        );
      },
      delete: () => {
        return traceSupabaseQuery(`delete.${table}`, () => 
          originalFrom.delete()
        );
      },
    };
  },
  channel: (name: string) => {
    const channel = supabase?.channel(name);
    if (!channel) return channel;
    
    // Trace real-time subscriptions
    const originalSubscribe = channel.subscribe.bind(channel);
    channel.subscribe = (callback?: any) => {
      datadogRum.addAction(`supabase.realtime.subscribe.${name}`, () => {
        const subscription = originalSubscribe(callback);
        
        // Monitor subscription health
        channel.on('error', (error) => {
          datadogRum.addError(error, {
            channel: name,
            type: 'realtime_error',
          });
        });
        
        return subscription;
      });
      
      return originalSubscribe(callback);
    };
    
    return channel;
  },
};
```

**Why It's Best**:
- ✅ **Automatic correlation** - Frontend errors automatically linked to backend queries
- ✅ **Complete visibility** - See entire request flow in one view
- ✅ **Intelligent insights** - AI identifies root causes
- ✅ **Supabase native** - Built-in PostgreSQL and WebSocket support
- ✅ **Production-ready** - Used by companies like Stripe, Shopify, Airbnb

---

### 2. **OpenTelemetry + Grafana Tempo** ⭐⭐⭐⭐ (OPEN SOURCE)

**Why It's Great**:
- **Industry standard** - OpenTelemetry is the de facto standard for observability
- **Full control** - Open source, no vendor lock-in
- **Extensible** - Can integrate with any backend
- **Cost-effective** - Self-hosted or Grafana Cloud

**Key Features**:
- **Distributed tracing** - Complete request tracing
- **Custom instrumentation** - Full control over what to trace
- **Grafana integration** - Beautiful dashboards and query interface
- **Supabase support** - Can instrument Supabase client manually

**Pricing**: 
- Self-hosted: Free (infrastructure costs)
- Grafana Cloud: Free tier available, paid from $49/month

**Installation**:
```bash
npm install @opentelemetry/api @opentelemetry/sdk-web @opentelemetry/instrumentation
npm install @opentelemetry/instrumentation-fetch @opentelemetry/instrumentation-xml-http-request
npm install @opentelemetry/exporter-otlp-http
```

**Configuration** (`src/lib/opentelemetry.ts`):
```typescript
import { WebSDK } from '@opentelemetry/sdk-web';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';

const sdk = new WebSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'prayermap',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.VITE_APP_VERSION,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [
        process.env.VITE_SUPABASE_URL || '',
      ],
    }),
    new XMLHttpRequestInstrumentation({
      propagateTraceHeaderCorsUrls: [
        process.env.VITE_SUPABASE_URL || '',
      ],
    }),
  ],
});

sdk.start();
```

**Why It's Great**:
- ✅ **Industry standard** - Future-proof choice
- ✅ **Full control** - Customize exactly what to trace
- ✅ **No vendor lock-in** - Can switch backends easily
- ✅ **Cost-effective** - Self-hosted option

**Why It's Not #1**:
- ❌ **More setup** - Requires more configuration
- ❌ **Less intelligent** - No built-in AI insights
- ❌ **Manual Supabase integration** - Need to instrument manually

---

### 3. **Sentry Performance + Replay** ⭐⭐⭐⭐ (ALREADY PARTIALLY SET UP)

**Why It's Good**:
- **Already integrated** - You have Sentry Replay partially set up
- **Full-stack tracing** - Performance monitoring + error tracking
- **Session replay** - See exactly what users see
- **Good Supabase support** - Can trace Supabase queries

**Key Features**:
- **Distributed tracing** - Trace requests across services
- **Performance monitoring** - Identify slow operations
- **Error tracking** - Automatic error detection
- **Session replay** - See user sessions with errors

**Pricing**:
- Free tier: 5K errors/month, 10K performance units/month
- Paid: From $26/month

**Enhancement Needed** (`src/lib/sentry-enhanced.ts`):
```typescript
import * as Sentry from '@sentry/react';
import { Replay } from '@sentry/replay';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [
    new BrowserTracing({
      // Trace Supabase requests
      tracePropagationTargets: [
        process.env.VITE_SUPABASE_URL || '',
      ],
      // Custom spans for Supabase
      beforeNavigate: (context) => {
        return {
          ...context,
          tags: {
            ...context.tags,
            'supabase.project': extractProjectId(process.env.VITE_SUPABASE_URL),
          },
        };
      },
    }),
    new Replay({
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
      maskAllText: false,
      blockAllMedia: false,
      networkDetailAllowUrls: [
        process.env.VITE_SUPABASE_URL || '',
      ],
    }),
  ],
  tracesSampleRate: 1.0, // 100% for debugging
  environment: process.env.NODE_ENV || 'development',
  release: process.env.VITE_APP_VERSION,
  
  // Enhanced Supabase tracing
  beforeSend: (event, hint) => {
    // Add Supabase context to errors
    if (event.request?.url?.includes('supabase')) {
      event.contexts = {
        ...event.contexts,
        supabase: {
          url: event.request.url,
          method: event.request.method,
          table: extractTableFromUrl(event.request.url),
        },
      };
    }
    return event;
  },
});

// Supabase query wrapper
export function traceSupabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name: `supabase.query.${queryName}`,
      op: 'db.query',
      attributes: {
        'db.system': 'supabase',
        'db.operation': queryName,
      },
    },
    async () => {
      try {
        return await queryFn();
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            query: queryName,
            type: 'supabase_error',
          },
        });
        throw error;
      }
    }
  );
}
```

**Why It's Good**:
- ✅ **Already partially set up** - Less work to enhance
- ✅ **Good error tracking** - Excellent error grouping
- ✅ **Session replay** - See user sessions

**Why It's Not #1**:
- ❌ **Less intelligent** - No AI-powered root cause analysis
- ❌ **Manual Supabase integration** - Need to wrap queries manually
- ❌ **Less full-stack** - Better at frontend than backend

---

### 4. **New Relic Browser + APM** ⭐⭐⭐ (SOLID ALTERNATIVE)

**Why It's Good**:
- **Full-stack monitoring** - Browser + APM integration
- **Good React support** - Automatic React component instrumentation
- **Database query tracing** - See slow queries
- **Intelligent insights** - AI-powered anomaly detection

**Pricing**:
- Free tier: 100GB/month data ingest
- Paid: From $99/month

**Why It's Not Higher**:
- ❌ **More expensive** - Higher cost than Datadog
- ❌ **Less Supabase-specific** - Generic PostgreSQL support
- ❌ **Steeper learning curve** - More complex setup

---

## 🎯 Recommendation: **Datadog RUM + APM**

### Why Datadog Wins

1. **Automatic Full-Stack Correlation**
   - Frontend error → Automatically linked to backend query
   - User click → Complete trace through React → Supabase → PostgreSQL
   - No manual instrumentation needed

2. **Intelligent Root Cause Analysis**
   - AI identifies patterns in failures
   - Automatically suggests fixes
   - Correlates errors across services

3. **Supabase Native Support**
   - Built-in PostgreSQL query tracing
   - WebSocket/Realtime monitoring
   - RLS policy impact analysis

4. **Perfect for Your Use Case**
   - Chat/messaging debugging: See message flow from frontend → database
   - Real-time issues: Track WebSocket connections and messages
   - Query performance: Identify slow Supabase queries

5. **Agent-Friendly**
   - Clear error messages with full context
   - Automatic correlation reduces false positives
   - Evidence captured automatically

---

## 📋 Implementation Plan

### Phase 1: Datadog Setup (Week 1)
1. **Sign up** for Datadog account (free tier)
2. **Install** `@datadog/browser-rum` and `@datadog/browser-rum-react`
3. **Configure** RUM with Supabase URL tracing
4. **Wrap** Supabase client with tracing
5. **Test** with a simple query

### Phase 2: Enhanced Tracing (Week 1)
1. **Add** Supabase query tracing wrapper
2. **Instrument** Realtime subscriptions
3. **Add** custom spans for critical operations
4. **Test** with chat/messaging flow

### Phase 3: Agent Integration (Week 2)
1. **Update** agent verification to use Datadog traces
2. **Create** Datadog query helpers for agents
3. **Document** how agents should use traces
4. **Test** agent debugging workflow

---

## 🔗 Resources

- **Datadog RUM Docs**: https://docs.datadoghq.com/real_user_monitoring/
- **Datadog APM Docs**: https://docs.datadoghq.com/tracing/
- **OpenTelemetry Docs**: https://opentelemetry.io/docs/
- **Grafana Tempo Docs**: https://grafana.com/docs/tempo/

---

## ✅ Decision Matrix

| Tool | Full-Stack | Supabase Native | Intelligence | Cost | Setup |
|------|------------|-----------------|--------------|------|-------|
| **Datadog** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **OpenTelemetry** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Sentry** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **New Relic** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

---

**Recommendation**: **Datadog RUM + APM** for the best full-stack debugging experience with intelligent correlation and Supabase native support.

