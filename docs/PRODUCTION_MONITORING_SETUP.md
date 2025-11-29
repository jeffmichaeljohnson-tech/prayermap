# Production Monitoring Setup for PrayerMap

> **Research-Driven Documentation**
> All recommendations based on official documentation from Sentry, Vercel, Supabase, Better Stack, and industry best practices as of November 2025.

---

## Executive Summary

This document outlines a world-class monitoring stack for PrayerMap, optimized for:
- **Multi-platform deployment** (Web, iOS, Android via Capacitor)
- **Performance excellence** (60fps animations, <1.5s FCP, <2s TTI)
- **Spiritual UX reliability** (zero downtime for prayer submissions)
- **Real-time incident response** (detect and fix before users notice)

### Recommended Monitoring Stack

| Category | Solution | Rationale |
|----------|----------|-----------|
| **Error Tracking** | Sentry | Official Capacitor support, React integration, native crash handling |
| **Performance Monitoring** | Vercel Analytics + Sentry | Built-in Web Vitals + deep performance traces |
| **Session Replay** | Sentry | Integrated with error tracking, cost-effective |
| **Uptime Monitoring** | Better Stack | Native Vercel integration, 2-min setup |
| **Backend Monitoring** | Supabase Logs + Export | Built-in Postgres monitoring, log drain to external tools |

**Total Cost Estimate:**
- Sentry: $26/month (Team plan for 50K errors/month)
- Vercel Analytics: $10/month (included in Pro plan)
- Better Stack: $18/month (Startup plan)
- **Total: ~$54/month** for enterprise-grade observability

---

## Part 1: Error Tracking with Sentry

### Why Sentry?

**Official Support for PrayerMap's Stack:**
- ✅ React 19 support with `reactErrorHandler` hooks
- ✅ Official Capacitor SDK (`@sentry/capacitor`)
- ✅ Native crash handling (iOS dSYM, Android ProGuard)
- ✅ Performance monitoring built-in
- ✅ Session replay included
- ✅ Source map support for stack traces

**Research Sources:**
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Capacitor Documentation](https://docs.sentry.io/platforms/javascript/guides/capacitor/)
- [Sentry NPM Package](https://www.npmjs.com/package/@sentry/react)

### Installation & Setup

#### Step 1: Install Dependencies

```bash
npm install @sentry/react @sentry/capacitor
```

**Package versions (latest as of 2025-11):**
- `@sentry/react`: ^10.27.0
- `@sentry/capacitor`: ^2.3.1

#### Step 2: Initialize Sentry (Web + React)

**File:** `/home/user/prayermap/src/lib/sentry.ts`

```typescript
import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";

export function initializeSentry() {
  // Only initialize in production or staging
  if (import.meta.env.DEV) {
    console.log("Sentry disabled in development");
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    // Environment
    environment: import.meta.env.MODE, // "production" | "staging"
    release: `prayermap@${import.meta.env.VITE_APP_VERSION || "0.0.0"}`,

    // Performance Monitoring
    tracesSampleRate: 1.0, // 100% in production (adjust based on volume)
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/prayermap\.net/,
      /^https:\/\/.*\.supabase\.co/,
    ],

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // React 19 Integration
    integrations: [
      // Browser integrations
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false, // Show text in replays (adjust for privacy)
        blockAllMedia: false, // Show images/video
        maskAllInputs: true, // Hide sensitive form inputs
      }),

      // React Router integration (if using)
      // Sentry.reactRouterV6BrowserTracingIntegration({
      //   useEffect,
      //   useLocation,
      //   useNavigationType,
      //   createRoutesFromChildren,
      //   matchRoutes,
      // }),
    ],

    // Error Filtering
    beforeSend(event, hint) {
      // Don't send errors from development
      if (window.location.hostname === "localhost") {
        return null;
      }

      // Filter out known non-critical errors
      const error = hint.originalException;
      if (error && typeof error === "object" && "message" in error) {
        const message = String(error.message);

        // Ignore ResizeObserver errors (benign browser quirk)
        if (message.includes("ResizeObserver loop")) {
          return null;
        }

        // Ignore Mapbox attribution errors (cosmetic)
        if (message.includes("mapbox-attribution")) {
          return null;
        }
      }

      return event;
    },

    // Native Platform Detection
    enabled: !Capacitor.isNativePlatform(), // Web only (native uses @sentry/capacitor)
  });
}

// React 19 Error Boundary Integration
export const sentryCreateRoot = Sentry.withErrorBoundary;
```

#### Step 3: Initialize in App Entry Point

**File:** `/home/user/prayermap/src/main.tsx`

```typescript
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { initializeSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry FIRST
initializeSentry();

// React 19 Error Handling
const root = createRoot(document.getElementById("root")!, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn("Uncaught error", error, errorInfo);
  }),
  onCaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn("Caught error", error, errorInfo);
  }),
  // Optional: Handle recoverable errors
  // onRecoverableError: Sentry.reactErrorHandler(),
});

root.render(<App />);
```

#### Step 4: Capacitor Native Integration

**File:** `/home/user/prayermap/capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.prayermap.app',
  appName: 'PrayerMap',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // ... existing plugins ...

    // Sentry Native Crash Reporting
    SentryCapacitor: {
      dsn: process.env.VITE_SENTRY_DSN,
      environment: process.env.MODE || 'production',
      enabled: true,
      // iOS-specific settings
      iosAutoInit: true,
      iosNativeCrashHandling: true,
      // Android-specific settings
      androidAutoInit: true,
      androidNativeCrashHandling: true,
    }
  }
};

export default config;
```

**iOS Setup (Debug Symbols):**

1. Install Sentry CLI:
   ```bash
   brew install getsentry/tools/sentry-cli
   ```

2. Add build phase in Xcode:
   - Open `ios/App/App.xcodeproj`
   - Select target → Build Phases → + → New Run Script Phase
   - Add script:
     ```bash
     export SENTRY_ORG=your-org
     export SENTRY_PROJECT=prayermap-ios
     export SENTRY_AUTH_TOKEN=your-auth-token

     /bin/sh ../node_modules/@sentry/capacitor/scripts/sentry-xcode.sh
     ```

**Android Setup (ProGuard/R8):**

1. Enable ProGuard mapping upload in `android/app/build.gradle`:
   ```gradle
   apply from: "../../node_modules/@sentry/capacitor/sentry.gradle"
   ```

2. Create `android/sentry.properties`:
   ```properties
   defaults.project=prayermap-android
   defaults.org=your-org
   auth.token=your-auth-token
   ```

#### Step 5: Environment Variables

**Add to `.env.example` and `.env.local`:**

```bash
# ----------------------------------------------------------------------------
# OPTIONAL: Error Tracking (Sentry)
# ----------------------------------------------------------------------------
# Real-time error tracking and performance monitoring
# Get your DSN from: https://sentry.io/settings/projects/prayermap/keys/
# Security: SAFE to expose client-side (rate-limited by Sentry)

VITE_SENTRY_DSN=https://your-public-key@sentry.io/your-project-id
```

**Set in Vercel Dashboard:**
- Go to Project Settings → Environment Variables
- Add `VITE_SENTRY_DSN` for Production, Preview, Development

### Usage Examples

#### Manual Error Capture

```typescript
import * as Sentry from "@sentry/react";

// Capture exception with context
try {
  await prayerService.submitPrayer(prayerData);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: "prayer-submission",
      userId: user?.id,
    },
    contexts: {
      prayer: {
        category: prayerData.category,
        isAnonymous: prayerData.isAnonymous,
      },
    },
  });

  throw error; // Re-throw for UI error handling
}
```

#### Performance Monitoring

```typescript
import * as Sentry from "@sentry/react";

// Measure custom operation
async function loadPrayersNearUser(location: Location) {
  const transaction = Sentry.startTransaction({
    name: "Load Prayers Near User",
    op: "prayer.load",
  });

  try {
    const prayers = await prayerService.getPrayersNearLocation(location);
    transaction.setStatus("ok");
    return prayers;
  } catch (error) {
    transaction.setStatus("internal_error");
    throw error;
  } finally {
    transaction.finish();
  }
}
```

#### User Context

```typescript
import * as Sentry from "@sentry/react";

// Set user context (in AuthContext)
useEffect(() => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username,
    });
  } else {
    Sentry.setUser(null);
  }
}, [user]);
```

---

## Part 2: Performance Monitoring with Vercel Analytics

### Why Vercel Analytics?

**Native Vercel Integration:**
- ✅ Zero-config setup for Vercel deployments
- ✅ Real User Monitoring (RUM) data from actual devices
- ✅ Core Web Vitals tracking (LCP, INP, CLS)
- ✅ Framework-agnostic (works with Vite/React)
- ✅ $10/month (included in Vercel Pro plan)

**Research Sources:**
- [Vercel Web Analytics](https://vercel.com/docs/analytics)
- [Vercel Analytics Quickstart](https://vercel.com/docs/analytics/quickstart)
- [Web Vitals Metrics Overview](https://vercel.com/docs/concepts/analytics/web-vitals)

### Installation & Setup

#### Step 1: Enable in Vercel Dashboard

1. Go to your Vercel project
2. Navigate to **Analytics** tab
3. Click **Enable Web Analytics**
4. Copy the analytics ID

#### Step 2: Install Vercel Analytics Package

```bash
npm install @vercel/analytics
```

#### Step 3: Initialize Analytics

**File:** `/home/user/prayermap/src/main.tsx`

```typescript
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { initializeSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry
initializeSentry();

// Render app with Analytics
const root = createRoot(document.getElementById("root")!);

root.render(
  <>
    <App />
    <Analytics />
  </>
);
```

**That's it!** Vercel Analytics is now tracking:
- Page views
- Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
- Top pages
- Top referrers
- User demographics (country, browser, OS)

### Custom Event Tracking (Optional)

```typescript
import { track } from "@vercel/analytics";

// Track prayer submission
function handlePrayerSubmit(prayer: Prayer) {
  track("Prayer Submitted", {
    category: prayer.category,
    isAnonymous: prayer.isAnonymous,
    hasAudio: !!prayer.audioUrl,
    hasVideo: !!prayer.videoUrl,
  });
}

// Track prayer support
function handlePrayForPrayer(prayerId: string) {
  track("Prayer Support Sent", {
    prayerId,
  });
}
```

### Vercel Speed Insights

For even deeper performance analysis, enable **Speed Insights**:

```bash
npm install @vercel/speed-insights
```

```typescript
import { SpeedInsights } from "@vercel/speed-insights/react";

root.render(
  <>
    <App />
    <Analytics />
    <SpeedInsights />
  </>
);
```

**Speed Insights provides:**
- Real-time Web Vitals scoring
- Performance recommendations
- Lighthouse audit history
- Field data vs. lab data comparison

---

## Part 3: Uptime Monitoring with Better Stack

### Why Better Stack?

**Native Vercel Integration:**
- ✅ 2-minute setup with official Vercel integration
- ✅ HTTP status code monitoring
- ✅ Global monitoring from multiple regions
- ✅ Incident management with on-call rotation
- ✅ Status page generation
- ✅ Mobile push notifications (iOS/Android)

**Research Sources:**
- [Better Stack Uptime Documentation](https://betterstack.com/docs/uptime/start/)
- [Better Stack Vercel Integration](https://betterstack.com/docs/logs/vercel/automatic-integration/)
- [Uptime Monitor Setup](https://betterstack.com/docs/uptime/uptime-monitor/)

### Setup

#### Step 1: Create Better Stack Account

1. Go to [Better Stack](https://betterstack.com/)
2. Sign up for free trial (14 days)
3. Choose **Startup Plan** ($18/month for 10 monitors)

#### Step 2: Create Uptime Monitor

1. Navigate to **Monitors** → **Create monitor**
2. Configure:
   - **URL to monitor:** `https://prayermap.net`
   - **Monitor type:** HTTP
   - **Expected status code:** 200
   - **Check frequency:** 30 seconds
   - **Locations:** Select multiple regions (US East, US West, EU, Asia)
   - **Timeout:** 10 seconds

3. Add additional monitors:
   - `https://prayermap.net/api/health` (if you have a health endpoint)
   - Supabase endpoint health (optional)

#### Step 3: Set Up Alerting

**Email Alerts:**
1. Go to **Integrations** → **Email**
2. Add your email
3. Whitelist `@betterstack.com` domain

**Slack Integration:**
1. Go to **Integrations** → **Slack**
2. Connect to `#incidents` or `#alerts` channel
3. Configure alert format

**Mobile Push Notifications:**
1. Download Better Stack app (iOS/Android)
2. Go to **Integrations** → **Mobile apps**
3. Follow installation guide

**SMS/Phone Call (Optional):**
- Better Stack supports Twilio integration for critical alerts
- Recommended for primary on-call engineer

#### Step 4: Create Status Page

1. Go to **Status Pages** → **Create status page**
2. Configure:
   - **Domain:** `status.prayermap.net` (requires CNAME)
   - **Components:** Web App, API, Database, Mobile App
   - **Monitors:** Link to your uptime monitors
3. Customize branding (logo, colors, custom domain)

**Status Page URL:** `https://prayermapnet.betteruptime.com`

#### Step 5: Integrate Vercel Logs (Optional)

For centralized log management:

1. Go to [Vercel Better Stack Integration](https://betterstack.com/docs/logs/vercel/automatic-integration/)
2. Click **Add Integration**
3. Select your Vercel project
4. Logs will automatically flow to Better Stack → **Logs & traces**

### Alert Thresholds

**Recommended Configuration:**

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Uptime Check Fails** | 2 consecutive failures | Slack notification |
| **Uptime Check Fails** | 5 consecutive failures | Email + SMS |
| **Response Time** | >3 seconds for 5 minutes | Slack notification |
| **Response Time** | >10 seconds | Immediate alert |
| **SSL Certificate Expiry** | 7 days before expiry | Email notification |

---

## Part 4: Backend Monitoring (Supabase)

### Why Supabase Built-in Tools?

**Native Capabilities:**
- ✅ `pg_stat_statements` for query performance
- ✅ Postgres logs (ERROR/WARNING levels)
- ✅ Real-time metrics (CPU, memory, disk, connections)
- ✅ Log drain to external tools (Datadog, Grafana, Better Stack)

**Research Sources:**
- [Supabase Logging Documentation](https://supabase.com/docs/guides/telemetry/logs)
- [Supabase Debugging and Monitoring](https://supabase.com/docs/guides/database/inspect)
- [Supabase Metrics](https://supabase.com/docs/guides/telemetry/metrics)

### Setup

#### Step 1: Configure Log Levels

**In Supabase Dashboard:**
1. Navigate to **Database** → **Settings**
2. Set `log_min_messages` to **WARNING** (production)
   - `ERROR` for quieter logs (only failures)
   - `WARNING` for recommended production setting
   - `INFO` or `DEBUG` only for short-term debugging

**Why WARNING?**
- Captures issues worth attention without log bloat
- Prevents disk space issues from excessive logging
- Reduces I/O impact on database performance

#### Step 2: Enable Query Performance Monitoring

`pg_stat_statements` is enabled by default. To view slow queries:

1. Go to **Database** → **Query Performance**
2. Sort by:
   - **Mean execution time** (find slow queries)
   - **Total time** (find high-impact queries)
   - **Calls** (find frequently-run queries)

**Optimization Targets:**
- Queries >100ms: Investigate and optimize
- Queries >1s: Critical - add indexes or refactor

#### Step 3: Set Up Alerts

**In Supabase Dashboard:**
1. Navigate to **Settings** → **Alerts**
2. Configure:

| Alert Type | Threshold | Action |
|------------|-----------|--------|
| **Disk Usage** | 80% | Email notification |
| **Disk Usage** | 90% | Critical alert + Slack |
| **Connection Pool** | 90% utilization | Email notification |
| **CPU Usage** | >80% for 10 minutes | Slack notification |
| **Memory Usage** | >85% | Email notification |

#### Step 4: Enable Audit Logging (Optional)

For detailed query auditing, enable `pgAudit`:

**Run in SQL Editor:**
```sql
-- Enable pgAudit extension
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Configure audit logging (DDL + WRITE operations)
ALTER SYSTEM SET pgaudit.log = 'DDL, WRITE';

-- Reload configuration
SELECT pg_reload_conf();
```

**View audit logs:**
- Go to **Logs** → **Postgres Logs**
- Filter by `pgaudit`

**Warning:** Audit logging can be verbose. Use selectively.

#### Step 5: Export Logs to External Tools (Production)

For long-term log retention and analysis:

**Better Stack:**
1. Go to Better Stack → **Sources** → **Add source**
2. Select **Supabase**
3. Configure webhook URL
4. Set in Supabase → **Settings** → **Webhooks**

**Datadog (Alternative):**
- Use Supabase → Datadog integration
- Configure log forwarding via API key

**Grafana + Prometheus (Self-hosted):**
- Export Supabase metrics to Prometheus
- Visualize in Grafana dashboards

---

## Part 5: Monitoring Dashboard & Metrics

### Key Metrics to Track

Based on PrayerMap's performance goals from CLAUDE.md:

#### Frontend Performance

| Metric | Target | How to Monitor |
|--------|--------|----------------|
| **First Contentful Paint (FCP)** | <1.5s | Vercel Analytics, Sentry |
| **Time to Interactive (TTI)** | <2s | Vercel Analytics, Lighthouse |
| **Largest Contentful Paint (LCP)** | <2.5s | Vercel Analytics (Core Web Vital) |
| **Interaction to Next Paint (INP)** | <200ms | Vercel Analytics (Core Web Vital) |
| **Cumulative Layout Shift (CLS)** | <0.1 | Vercel Analytics (Core Web Vital) |
| **Map Load Time** | <1s | Sentry custom transaction |
| **Animation Frame Rate** | 60fps | Browser DevTools, Sentry |
| **Bundle Size (main.js)** | <500kb | Vite build output, Vercel |

#### User Experience

| Metric | Target | How to Monitor |
|--------|--------|----------------|
| **Time to First Prayer View** | <3s | Sentry custom transaction |
| **Time to Post Prayer** | <30s | Sentry custom transaction |
| **Time to Send Support** | <10s | Sentry custom transaction |
| **Form Abandonment Rate** | <5% | Vercel Analytics custom events |
| **Prayer Submission Success Rate** | >99% | Sentry error rate |
| **Mobile App Crash Rate** | <0.1% | Sentry native crash reports |

#### Backend Performance

| Metric | Target | How to Monitor |
|--------|--------|----------------|
| **API Response Time (p95)** | <500ms | Supabase pg_stat_statements |
| **Database Query Time (p95)** | <100ms | Supabase pg_stat_statements |
| **Supabase Realtime Latency** | <200ms | Sentry network monitoring |
| **Uptime (Monthly)** | >99.9% | Better Stack |
| **Error Rate** | <0.1% | Sentry |

#### Infrastructure

| Metric | Alert Threshold | How to Monitor |
|--------|-----------------|----------------|
| **Vercel Function Errors** | >1% error rate | Vercel Dashboard |
| **Supabase Disk Usage** | >80% | Supabase Alerts |
| **Supabase Connection Pool** | >90% | Supabase Metrics |
| **SSL Certificate Expiry** | <7 days | Better Stack |
| **Mapbox API Quota** | >80% | Mapbox Dashboard |

### Recommended Monitoring Dashboard

**Create a Single Dashboard in Better Stack or Grafana:**

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ PRAYERMAP PRODUCTION HEALTH                             │
├─────────────────────────────────────────────────────────┤
│ Uptime: 99.98% | Active Incidents: 0 | Users: 1,234    │
├─────────────────────────────────────────────────────────┤
│ FRONTEND PERFORMANCE (Real User Data - Vercel)          │
│ ┌─────────┬─────────┬─────────┬─────────┬─────────┐    │
│ │ LCP     │ INP     │ CLS     │ FCP     │ TTFB    │    │
│ │ 1.2s ✅ │ 85ms ✅ │ 0.05 ✅ │ 0.9s ✅ │ 320ms ✅│    │
│ └─────────┴─────────┴─────────┴─────────┴─────────┘    │
├─────────────────────────────────────────────────────────┤
│ ERROR TRACKING (Sentry)                                 │
│ ┌─────────────────────┬─────────────────────────────┐  │
│ │ Error Rate          │ Top Errors                  │  │
│ │ 0.02% ✅            │ 1. MapboxGLError (3)        │  │
│ │ ▁▂▁▃▂▁ (24h trend)  │ 2. NetworkError (2)         │  │
│ └─────────────────────┴─────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│ BACKEND HEALTH (Supabase)                               │
│ ┌───────────┬───────────┬───────────┬─────────────┐    │
│ │ Disk      │ CPU       │ Memory    │ Connections │    │
│ │ 45% ✅    │ 32% ✅    │ 58% ✅    │ 45/100 ✅   │    │
│ └───────────┴───────────┴───────────┴─────────────┘    │
├─────────────────────────────────────────────────────────┤
│ UPTIME MONITORING (Better Stack)                        │
│ ┌─────────────────────────────────────────────────┐    │
│ │ prayermap.net          200 OK  Response: 245ms  │    │
│ │ ✅ US East   ✅ US West   ✅ EU   ✅ Asia      │    │
│ └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Part 6: Alert Configuration Best Practices

### Alert Severity Levels

**1. CRITICAL (Page Immediately)**
- Entire site down (uptime check fails for 2+ minutes)
- Database connection pool exhausted
- Error rate >5% for >1 minute
- SSL certificate expired

**Actions:**
- SMS + phone call to on-call engineer
- Slack message to #incidents
- Create PagerDuty incident

**2. HIGH (Notify Within 5 Minutes)**
- Site response time >10 seconds
- Error rate >1% for >5 minutes
- Disk usage >90%
- CPU usage >90% for >10 minutes

**Actions:**
- Slack message to #alerts
- Email to engineering team

**3. MEDIUM (Notify Within 30 Minutes)**
- Site response time >3 seconds for >5 minutes
- Error rate >0.5% for >10 minutes
- Disk usage >80%
- Slow queries >1 second

**Actions:**
- Email notification
- Slack message to #monitoring (optional)

**4. LOW (Daily Digest)**
- Performance degradation (Web Vitals trending down)
- Increased error frequency (but below thresholds)
- Certificate expiry in 7-30 days

**Actions:**
- Daily summary email
- Weekly review in team meeting

### Alert Rules Configuration

**Sentry Alert Rules:**

1. **JavaScript Errors Spike**
   - Condition: Error rate >1% compared to previous hour
   - Action: Slack #alerts

2. **Native Crash Detected (iOS/Android)**
   - Condition: Any native crash
   - Action: Slack #critical + Email

3. **Performance Degradation**
   - Condition: LCP >2.5s for >50% of sessions
   - Action: Email daily digest

4. **New Error Introduced**
   - Condition: First occurrence of error in last 7 days
   - Action: Slack #alerts

**Better Stack Alert Rules:**

1. **Site Down**
   - Condition: 2 consecutive failed checks (1 minute)
   - Action: SMS + Phone + Slack

2. **Slow Response**
   - Condition: Response time >3s for 5 minutes
   - Action: Slack #alerts

3. **Certificate Expiry**
   - Condition: SSL certificate expires in <7 days
   - Action: Email + Slack

**Supabase Alert Rules:**

1. **Disk Space Critical**
   - Condition: Disk usage >90%
   - Action: Email + Slack #critical

2. **Connection Pool Exhausted**
   - Condition: Connections >95%
   - Action: Email + Slack #critical

3. **Slow Query Detected**
   - Condition: Query execution >5 seconds
   - Action: Log to Slack #performance (daily digest)

### On-Call Rotation

**Recommended Setup:**
1. **Primary On-Call:** Receives all CRITICAL alerts
2. **Secondary On-Call:** Receives escalation after 10 minutes
3. **Manager:** Receives escalation after 30 minutes

**Tools:**
- PagerDuty (enterprise)
- Better Stack On-Call (included)
- Slack on-call rotation bot

---

## Part 7: Mobile-Specific Monitoring

### iOS Monitoring

**Native Crash Reporting:**
- Sentry Capacitor SDK captures native iOS crashes
- Automatic dSYM upload via Xcode build phase
- Crash reports include:
  - Device model, OS version
  - App version, build number
  - Full stack trace (symbolicated)
  - Memory usage, battery level

**Performance Monitoring:**
- Use Sentry `Sentry.startTransaction()` in Capacitor plugin calls
- Track native API performance (Camera, Geolocation, etc.)

**App Store Crash Reports:**
- Download from App Store Connect → **App Analytics** → **Crashes**
- Import to Sentry for unified view

**Key Metrics:**
- Crash-free rate: >99.9%
- App launch time: <2s
- Memory usage: <150MB

### Android Monitoring

**Native Crash Reporting:**
- Sentry Capacitor SDK captures native Android crashes
- Automatic ProGuard mapping upload via Gradle plugin
- Crash reports include:
  - Device manufacturer, model
  - Android version, API level
  - App version, build number
  - Full stack trace (de-obfuscated)

**Performance Monitoring:**
- Track ANRs (Application Not Responding)
- Monitor memory leaks with Sentry
- Track WebView performance (Capacitor uses WebView)

**Google Play Console Crash Reports:**
- Download from Play Console → **Quality** → **Crashes & ANRs**
- Import to Sentry for unified view

**Key Metrics:**
- Crash-free rate: >99.9%
- ANR rate: <0.1%
- App startup time: <2s

---

## Part 8: Implementation Checklist

### Phase 1: Core Monitoring (Week 1)

- [ ] **Install Sentry**
  - [ ] Add `@sentry/react` dependency
  - [ ] Initialize in `src/main.tsx`
  - [ ] Add DSN to environment variables
  - [ ] Deploy to production
  - [ ] Verify errors are captured (test with intentional error)

- [ ] **Enable Vercel Analytics**
  - [ ] Enable in Vercel dashboard
  - [ ] Add `@vercel/analytics` dependency
  - [ ] Add `<Analytics />` component
  - [ ] Deploy to production
  - [ ] Verify Web Vitals are tracked

- [ ] **Set Up Better Stack Uptime**
  - [ ] Create Better Stack account
  - [ ] Add `prayermap.net` monitor
  - [ ] Configure email alerts
  - [ ] Set up Slack integration
  - [ ] Test alert by pausing site

### Phase 2: Advanced Monitoring (Week 2)

- [ ] **Sentry Performance Monitoring**
  - [ ] Add custom transactions for critical user flows
  - [ ] Configure trace sampling
  - [ ] Set up performance alerts
  - [ ] Review performance dashboard

- [ ] **Sentry Session Replay**
  - [ ] Configure replay sampling rates
  - [ ] Test replay capture
  - [ ] Review privacy settings (mask sensitive data)
  - [ ] Set up replay-on-error alerts

- [ ] **Supabase Monitoring**
  - [ ] Configure log levels (WARNING)
  - [ ] Set up disk usage alerts
  - [ ] Set up connection pool alerts
  - [ ] Review `pg_stat_statements` for slow queries

### Phase 3: Mobile Monitoring (Week 3)

- [ ] **iOS Sentry Integration**
  - [ ] Add `@sentry/capacitor` dependency
  - [ ] Configure Capacitor plugin
  - [ ] Add Xcode build phase for dSYM upload
  - [ ] Test native crash reporting
  - [ ] Verify symbolication works

- [ ] **Android Sentry Integration**
  - [ ] Configure Gradle plugin
  - [ ] Add `sentry.properties` file
  - [ ] Test ProGuard mapping upload
  - [ ] Test native crash reporting
  - [ ] Verify de-obfuscation works

- [ ] **Mobile Performance Tracking**
  - [ ] Add transactions for Capacitor plugin calls
  - [ ] Track app launch time
  - [ ] Monitor memory usage
  - [ ] Set up mobile-specific alerts

### Phase 4: Optimization & Tuning (Week 4)

- [ ] **Review Alert Thresholds**
  - [ ] Analyze alert frequency (reduce noise)
  - [ ] Tune error rate thresholds
  - [ ] Adjust performance thresholds
  - [ ] Set up alert escalation

- [ ] **Dashboard Setup**
  - [ ] Create unified monitoring dashboard
  - [ ] Add key metrics widgets
  - [ ] Set up daily/weekly reports
  - [ ] Share dashboard with team

- [ ] **Incident Response Plan**
  - [ ] Document on-call rotation
  - [ ] Create runbook for common incidents
  - [ ] Set up incident post-mortem template
  - [ ] Test incident response process

---

## Part 9: Monitoring Costs & ROI

### Cost Breakdown (Monthly)

**Sentry:**
- **Team Plan:** $26/month
  - 50,000 errors/month
  - 100,000 performance units/month
  - 500 replays/month
  - 10 team members

**Vercel Analytics:**
- **Included in Pro Plan:** $10/month (total Vercel cost: $20/month)
  - Unlimited page views
  - Core Web Vitals
  - Custom events

**Better Stack:**
- **Startup Plan:** $18/month
  - 10 uptime monitors
  - 30-second check frequency
  - Unlimited incidents
  - Status page included

**Supabase:**
- **Pro Plan:** $25/month (already budgeted)
  - Built-in monitoring included
  - No additional cost

**Total: $69/month** (~$828/year)

### ROI Calculation

**Cost of Downtime (Hypothetical):**
- Average downtime without monitoring: 4 hours/month
- User base: 10,000 active users
- Conversion rate to paid features: 2%
- Average user value: $10/month
- **Downtime cost:** 10,000 × 0.02 × $10 × (4h/730h) = **$109/month**

**ROI:** $109 - $69 = **$40/month net benefit**

**Intangible Benefits:**
- Faster incident response (minutes vs. hours)
- Improved user trust (fewer complaints)
- Better product decisions (data-driven)
- Reduced engineering stress (proactive vs. reactive)

---

## Part 10: Next Steps

1. **Review this document** with the team
2. **Choose Phase 1 monitoring** to implement first (Sentry + Vercel Analytics + Better Stack)
3. **Set up test environment** to validate monitoring before production
4. **Create Sentry project** at https://sentry.io
5. **Enable Vercel Analytics** in Vercel dashboard
6. **Sign up for Better Stack** at https://betterstack.com
7. **Follow implementation checklist** in Part 8
8. **Schedule monitoring review meeting** (weekly for first month, then monthly)

---

## Resources & Documentation

### Official Documentation

**Sentry:**
- [React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Capacitor Documentation](https://docs.sentry.io/platforms/javascript/guides/capacitor/)
- [Performance Monitoring](https://docs.sentry.io/platforms/javascript/guides/react/performance/)
- [Session Replay](https://docs.sentry.io/platforms/javascript/guides/react/session-replay/)

**Vercel:**
- [Web Analytics](https://vercel.com/docs/analytics)
- [Web Vitals Metrics](https://vercel.com/docs/concepts/analytics/web-vitals)
- [Speed Insights](https://vercel.com/docs/speed-insights)

**Supabase:**
- [Logging Documentation](https://supabase.com/docs/guides/telemetry/logs)
- [Metrics](https://supabase.com/docs/guides/telemetry/metrics)
- [Database Inspection](https://supabase.com/docs/guides/database/inspect)

**Better Stack:**
- [Uptime Monitoring](https://betterstack.com/docs/uptime/start/)
- [Vercel Integration](https://betterstack.com/docs/logs/vercel/automatic-integration/)
- [Uptime Monitor Setup](https://betterstack.com/docs/uptime/uptime-monitor/)

### Community Resources

- [Web.dev - Core Web Vitals](https://web.dev/vitals/)
- [Sentry Blog - React Error Tracking](https://blog.sentry.io/category/react/)
- [Vercel Blog - Performance Optimization](https://vercel.com/blog/tag/performance)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-29
**Maintained by:** Monitoring Setup Agent
**Review Frequency:** Quarterly or after major infrastructure changes
