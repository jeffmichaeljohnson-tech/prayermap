# PrayerMap Production Monitoring - Metrics Reference Card

> **Quick reference for daily monitoring checks**

---

## Performance Targets (from CLAUDE.md)

### Frontend Performance

| Metric | Target | Good | Needs Improvement | Critical |
|--------|--------|------|-------------------|----------|
| **First Contentful Paint (FCP)** | <1.5s | <1.5s | 1.5-2.5s | >2.5s |
| **Time to Interactive (TTI)** | <2s | <2s | 2-4s | >4s |
| **Largest Contentful Paint (LCP)** | <2.5s | <2.5s | 2.5-4s | >4s |
| **Interaction to Next Paint (INP)** | <200ms | <200ms | 200-500ms | >500ms |
| **Cumulative Layout Shift (CLS)** | <0.1 | <0.1 | 0.1-0.25 | >0.25 |
| **Map Load Time** | <1s | <1s | 1-3s | >3s |
| **Animation Frame Rate** | 60fps | 60fps | 30-60fps | <30fps |
| **Bundle Size (main.js)** | <500kb | <500kb | 500kb-1MB | >1MB |

### User Experience

| Metric | Target | Tool |
|--------|--------|------|
| **Time to First Prayer View** | <3s | Sentry (custom transaction) |
| **Time to Post Prayer** | <30s | Sentry (custom transaction) |
| **Time to Send Support** | <10s | Sentry (custom transaction) |
| **Form Abandonment Rate** | <5% | Vercel Analytics (custom event) |
| **Prayer Submission Success Rate** | >99% | Sentry (error rate) |
| **Mobile Crash-Free Rate** | >99.9% | Sentry (mobile) |

### Backend Performance

| Metric | Target | Tool |
|--------|--------|------|
| **API Response Time (p95)** | <500ms | Supabase |
| **Database Query Time (p95)** | <100ms | pg_stat_statements |
| **Realtime Latency** | <200ms | Sentry network tab |
| **Uptime (Monthly)** | >99.9% | Better Stack |
| **Overall Error Rate** | <0.1% | Sentry |

### Infrastructure

| Metric | Alert Threshold | Critical Threshold |
|--------|-----------------|---------------------|
| **Vercel Function Errors** | >1% | >5% |
| **Supabase Disk Usage** | >80% | >90% |
| **Supabase Connection Pool** | >90% | >95% |
| **SSL Certificate Expiry** | <7 days | <3 days |
| **Mapbox API Quota** | >80% | >95% |

---

## Daily Monitoring Checklist

### Morning Check (5 minutes)

```
□ Check Better Stack - Overall uptime status
  └─ Target: All green, response time <500ms

□ Check Sentry - Error rate (last 24h)
  └─ Target: <0.1% error rate, no new critical errors

□ Check Vercel Analytics - Core Web Vitals (last 24h)
  └─ LCP <2.5s, INP <200ms, CLS <0.1

□ Check Supabase - Database health
  └─ Disk <80%, CPU <70%, Connections <90%

□ Review #alerts Slack channel
  └─ Any incidents overnight? All resolved?
```

### Weekly Review (30 minutes)

```
□ Review Sentry - Top errors (last 7 days)
  └─ Prioritize: User-facing errors > Backend errors > Warnings

□ Review Vercel Analytics - Performance trends
  └─ Are Web Vitals improving or degrading?

□ Review Supabase - Slow queries
  └─ Optimize queries >100ms, add indexes

□ Review Better Stack - Incident reports
  └─ Average response time, uptime percentage

□ Check SSL certificates
  └─ Renew if <30 days to expiry

□ Review monitoring costs
  └─ Are we within budget? ($54/month target)
```

---

## Alert Response Guide

### When You Get an Alert

**1. Assess Severity**
```
CRITICAL (🚨) → Drop everything, investigate now
HIGH (⚠️)     → Investigate within 5 minutes
MEDIUM (ℹ️)   → Investigate within 30 minutes
LOW (📊)      → Review in daily standup
```

**2. Gather Context**
```
□ What's the error message?
□ When did it start?
□ How many users affected?
□ Is it still happening?
□ Check other monitoring tools for correlation
```

**3. Check Common Causes**
```
□ Recent deployment? (Vercel → Deployments)
□ Supabase maintenance? (status.supabase.com)
□ Vercel issues? (vercel-status.com)
□ Mapbox outage? (status.mapbox.com)
□ DNS issues? (dig prayermap.net)
```

**4. Take Action**
```
□ Rollback if recent deployment caused issue
□ Scale resources if capacity issue
□ Fix bug if code issue
□ Wait if external service issue
```

**5. Communicate**
```
□ Post in #incidents Slack channel
□ Update status page (if user-facing)
□ Notify team if major incident
□ Create post-mortem doc (for critical incidents)
```

---

## Quick Command Reference

### Check Monitoring Status

```bash
# Sentry - View recent errors
open https://sentry.io/organizations/your-org/issues/

# Vercel Analytics - View Web Vitals
open https://vercel.com/your-team/prayermap/analytics

# Better Stack - View uptime
open https://betterstack.com/team/your-team/uptime

# Supabase - View database health
open https://supabase.com/dashboard/project/your-project/database
```

### Test Monitoring Tools

```bash
# Test Sentry error capture
# In browser console:
throw new Error("Test Sentry integration")

# Test Sentry transaction
import * as Sentry from "@sentry/react";
const transaction = Sentry.startTransaction({ name: "Test Transaction" });
setTimeout(() => transaction.finish(), 1000);

# Test Vercel Analytics
import { track } from "@vercel/analytics";
track("Test Event", { timestamp: Date.now() });

# Test Better Stack alert
# Temporarily pause Vercel deployment
# Should receive alert within 1 minute
```

### Debugging Performance Issues

```bash
# Check Lighthouse score
npx lighthouse https://prayermap.net --view

# Check bundle size
npm run build
# Look for warnings about chunk sizes

# Analyze Web Vitals
# In Chrome DevTools:
# 1. Open Performance tab
# 2. Record page load
# 3. Look for "Core Web Vitals" annotations

# Profile React components
# In React DevTools:
# 1. Open Profiler tab
# 2. Record interaction
# 3. Look for slow renders
```

### Supabase Query Debugging

```sql
-- View slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- View active connections
SELECT
  count(*),
  state
FROM pg_stat_activity
GROUP BY state;

-- View database size
SELECT
  pg_size_pretty(pg_database_size('postgres')) as size;

-- View table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Performance Optimization Priority

### When Web Vitals Are Poor

**LCP (Largest Contentful Paint) >2.5s**
```
1. Optimize images (use WebP, add width/height, lazy load)
2. Reduce server response time (check Supabase query performance)
3. Remove render-blocking resources (inline critical CSS)
4. Preload critical resources (fonts, hero images)
```

**INP (Interaction to Next Paint) >200ms**
```
1. Break up long JavaScript tasks (use web workers)
2. Optimize event handlers (debounce, throttle)
3. Reduce main thread work (lazy load non-critical code)
4. Use React.memo() to prevent unnecessary re-renders
```

**CLS (Cumulative Layout Shift) >0.1**
```
1. Add explicit width/height to images and iframes
2. Avoid inserting content above existing content
3. Use CSS transform for animations (not top/left)
4. Reserve space for dynamic content (skeletons)
```

### When Error Rate Is High

**Error Rate >1%**
```
1. Check Sentry → Issues → Sort by frequency
2. Identify top 3 errors
3. Check if related to recent deployment
4. Check browser compatibility (old browsers?)
5. Check mobile vs. desktop breakdown
6. Prioritize user-facing errors over backend errors
```

**Mobile Crash Rate >0.1%**
```
1. Check Sentry → iOS/Android crashes
2. Identify device/OS patterns
3. Check for Capacitor plugin issues
4. Test on affected devices
5. Review native logs (Xcode/Android Studio)
```

---

## Monitoring Tool Dashboards

### Sentry Dashboard
```
URL: https://sentry.io/organizations/your-org/issues/
Key Metrics:
  - Error rate (last 24h)
  - New issues (unresolved)
  - Performance (transaction duration)
  - Session replay (errors with video)
```

### Vercel Analytics Dashboard
```
URL: https://vercel.com/your-team/prayermap/analytics
Key Metrics:
  - Page views
  - Top pages
  - Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
  - Top referrers
  - User demographics
```

### Better Stack Dashboard
```
URL: https://betterstack.com/team/your-team/uptime
Key Metrics:
  - Uptime percentage (last 7d, 30d, 90d)
  - Response time (avg, p95, p99)
  - Incidents (active, resolved)
  - Status page views
```

### Supabase Dashboard
```
URL: https://supabase.com/dashboard/project/your-project
Key Metrics:
  - Database health (CPU, Memory, Disk)
  - Connection pool usage
  - Query performance (pg_stat_statements)
  - API requests (count, errors)
```

---

## Emergency Contacts

### Escalation Path

```
1. Primary On-Call → Slack DM + SMS
2. Secondary On-Call (after 10 min) → Slack DM + SMS
3. Engineering Manager (after 30 min) → Phone call
4. CTO (critical only) → Phone call
```

### External Services

```
Vercel Support: https://vercel.com/help
  - Response: <1 hour (Pro plan)

Supabase Support: https://supabase.com/dashboard/support
  - Response: <4 hours (Pro plan)

Sentry Support: https://sentry.io/support/
  - Response: <1 business day (Team plan)

Better Stack Support: https://betterstack.com/docs
  - Response: Email support@betterstack.com
```

---

## Cost Monitoring

### Monthly Budget: $54

| Service | Cost | Usage Limit | Overage Cost |
|---------|------|-------------|--------------|
| Sentry | $26 | 50K errors/mo | $0.0006/error |
| Vercel Analytics | $10 | Unlimited | N/A |
| Better Stack | $18 | 10 monitors | $5/monitor |
| **Total** | **$54** | - | - |

### Cost Alerts

```
□ Sentry approaching 50K errors → Review error quality
□ Better Stack >10 monitors → Consolidate or upgrade
□ Vercel approaching plan limits → Upgrade to Team plan
```

---

## Success Criteria

**Monitoring is successful when:**

- ✅ Mean Time to Detection (MTTD): <2 minutes
- ✅ Mean Time to Resolution (MTTR): <30 minutes
- ✅ False positive rate: <5%
- ✅ Alert fatigue: <3 alerts/day
- ✅ Uptime: >99.9%
- ✅ All Core Web Vitals: "Good" (green)

---

**Print this document and keep it near your desk for quick reference!**

**Last Updated:** 2025-11-29
**Next Review:** 2025-12-29 (monthly)
