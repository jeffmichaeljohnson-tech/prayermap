# Production Monitoring - Quick Start Guide

> **TL;DR:** Get world-class monitoring running in 1 hour

---

## The Stack

| Tool | Purpose | Cost | Setup Time |
|------|---------|------|------------|
| **Sentry** | Error tracking + Performance | $26/mo | 20 min |
| **Vercel Analytics** | Web Vitals + User metrics | $10/mo | 5 min |
| **Better Stack** | Uptime monitoring | $18/mo | 10 min |
| **Supabase Logs** | Backend monitoring | Free (included) | 5 min |

**Total: $54/month | Setup: ~40 minutes**

---

## Step 1: Sentry (20 minutes)

### 1.1 Create Account
```bash
# Go to https://sentry.io/signup/
# Choose "Team" plan ($26/month)
# Create project: "prayermap-web"
```

### 1.2 Install Package
```bash
npm install @sentry/react @sentry/capacitor
```

### 1.3 Add to .env.local
```bash
VITE_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/your-project-id
```

### 1.4 Initialize (copy-paste)

**Create:** `/home/user/prayermap/src/lib/sentry.ts`
```typescript
import * as Sentry from "@sentry/react";

export function initializeSentry() {
  if (import.meta.env.DEV) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
  });
}
```

**Update:** `/home/user/prayermap/src/main.tsx`
```typescript
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { initializeSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";

initializeSentry();

const root = createRoot(document.getElementById("root")!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
});

root.render(<App />);
```

### 1.5 Deploy & Test
```bash
git add .
git commit -m "feat: Add Sentry error tracking"
git push

# Test by throwing an error in console:
# throw new Error("Test Sentry integration")
```

---

## Step 2: Vercel Analytics (5 minutes)

### 2.1 Enable in Dashboard
1. Go to Vercel project → **Analytics** tab
2. Click **Enable Web Analytics**

### 2.2 Install Package
```bash
npm install @vercel/analytics
```

### 2.3 Add Component

**Update:** `/home/user/prayermap/src/main.tsx`
```typescript
import { Analytics } from "@vercel/analytics/react";

root.render(
  <>
    <App />
    <Analytics />
  </>
);
```

### 2.4 Deploy
```bash
git add .
git commit -m "feat: Add Vercel Analytics"
git push

# Check Vercel dashboard → Analytics tab in ~5 minutes
```

---

## Step 3: Better Stack (10 minutes)

### 3.1 Create Account
```bash
# Go to https://betterstack.com/
# Sign up for free trial
# Choose "Startup" plan ($18/month)
```

### 3.2 Create Uptime Monitor
1. Click **Monitors** → **Create monitor**
2. Enter URL: `https://prayermap.net`
3. Check frequency: **30 seconds**
4. Locations: Select **4+ regions** (US East, US West, EU, Asia)
5. Click **Create monitor**

### 3.3 Set Up Alerts
1. Go to **Integrations**
2. Add **Email** (whitelist `@betterstack.com`)
3. Add **Slack** (connect to `#alerts` channel)
4. (Optional) Add **Mobile app** (download iOS/Android app)

### 3.4 Test
1. Pause your Vercel deployment (or wait for natural downtime)
2. Verify you receive alert within 1 minute
3. Unpause deployment
4. Verify recovery alert

---

## Step 4: Supabase (5 minutes)

### 4.1 Configure Logs
1. Go to Supabase Dashboard → **Database** → **Settings**
2. Set `log_min_messages` to **WARNING**

### 4.2 Set Up Alerts
1. Go to **Settings** → **Alerts**
2. Configure:
   - **Disk usage:** Alert at 80%
   - **Connection pool:** Alert at 90%
   - **CPU usage:** Alert at 80% for 10 minutes

### 4.3 Check Query Performance
1. Go to **Database** → **Query Performance**
2. Review `pg_stat_statements`
3. Optimize queries >100ms

---

## Step 5: Verify Everything Works (5 minutes)

### 5.1 Checklist

- [ ] Sentry captures errors
  - [ ] Go to Sentry dashboard
  - [ ] Throw test error: `throw new Error("Test")`
  - [ ] See error appear in Sentry

- [ ] Vercel Analytics tracks page views
  - [ ] Visit https://prayermap.net
  - [ ] Check Vercel Analytics tab
  - [ ] See page view within 5 minutes

- [ ] Better Stack monitors uptime
  - [ ] Check Better Stack dashboard
  - [ ] See green checkmarks for all regions
  - [ ] Verify response time <500ms

- [ ] Supabase alerts configured
  - [ ] Check Settings → Alerts
  - [ ] Verify email/Slack connected

---

## Key Metrics to Watch (Daily)

### Frontend (Vercel Analytics)
- **LCP (Largest Contentful Paint):** Target <2.5s
- **INP (Interaction to Next Paint):** Target <200ms
- **CLS (Cumulative Layout Shift):** Target <0.1

### Errors (Sentry)
- **Error Rate:** Target <0.1%
- **Crash-Free Rate (Mobile):** Target >99.9%

### Backend (Supabase)
- **Disk Usage:** Keep <80%
- **Connection Pool:** Keep <90%
- **Slow Queries:** Optimize anything >100ms

### Uptime (Better Stack)
- **Availability:** Target >99.9%
- **Response Time:** Target <500ms

---

## Alert Severity Guide

### 🚨 CRITICAL (Act Immediately)
- Site down (2+ minutes)
- Error rate >5%
- Database connection pool exhausted
- **Action:** Check Slack → Investigate → Fix → Post-mortem

### ⚠️ HIGH (Act Within 5 Minutes)
- Error rate >1% for 5+ minutes
- Response time >10 seconds
- Disk usage >90%
- **Action:** Investigate → Create ticket → Fix within 1 hour

### ℹ️ MEDIUM (Act Within 30 Minutes)
- Error rate >0.5% for 10+ minutes
- Response time >3 seconds
- Disk usage >80%
- **Action:** Log issue → Schedule fix

### 📊 LOW (Review Daily/Weekly)
- Web Vitals trending down
- Certificate expiry in 7-30 days
- **Action:** Add to weekly review

---

## Common Issues & Fixes

### Sentry Not Capturing Errors
```bash
# 1. Check DSN is set
echo $VITE_SENTRY_DSN

# 2. Check environment
# Sentry only runs in production/staging, not dev

# 3. Check browser console
# Look for "Sentry initialized" message

# 4. Test manually
throw new Error("Test Sentry integration")
```

### Vercel Analytics Not Showing Data
```bash
# 1. Wait 5-10 minutes (data is delayed)
# 2. Check Analytics is enabled in Vercel dashboard
# 3. Check <Analytics /> component is rendered
# 4. Check browser console for errors
# 5. Clear cache and hard reload
```

### Better Stack False Positives
```bash
# 1. Increase check interval to 60 seconds
# 2. Require 2-3 consecutive failures before alerting
# 3. Add more monitoring regions
# 4. Check if Vercel is experiencing issues
```

### Supabase Slow Queries
```sql
-- 1. View slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 2. Add indexes for frequently-queried columns
CREATE INDEX idx_prayers_location ON prayers USING GIST(location);

-- 3. Analyze query plan
EXPLAIN ANALYZE <your-slow-query>;
```

---

## Next Steps

1. **Set up mobile monitoring** (iOS/Android)
   - See full documentation: `/home/user/prayermap/docs/PRODUCTION_MONITORING_SETUP.md`
   - Section: "Part 7: Mobile-Specific Monitoring"

2. **Create monitoring dashboard**
   - Combine Sentry + Vercel + Better Stack
   - Share with team (read-only access)

3. **Document incident response**
   - Create runbook for common issues
   - Set up on-call rotation

4. **Review weekly**
   - Check metrics against targets
   - Tune alert thresholds
   - Optimize performance

---

## Resources

- **Full Documentation:** `/home/user/prayermap/docs/PRODUCTION_MONITORING_SETUP.md`
- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Vercel Analytics:** https://vercel.com/docs/analytics
- **Better Stack:** https://betterstack.com/docs/uptime/start/
- **Supabase Monitoring:** https://supabase.com/docs/guides/telemetry/logs

---

**Estimated Setup Time:** 40 minutes
**Monthly Cost:** $54
**Impact:** World-class observability for PrayerMap
