# Enable APM in Datadog - Step-by-Step Guide

> **Current Status**: No services listed in APM → APM needs to be enabled

---

## 🎯 Goal

Enable APM in Datadog so that:
- ✅ RUM traces appear in APM Service Map
- ✅ Network requests show up as services
- ✅ Distributed tracing works (frontend → Supabase)

---

## ✅ Step 1: Enable APM in Datadog Dashboard

### Option A: From APM Services Page (Easiest)

1. **Go to**: https://app.datadoghq.com/apm/services
2. **Look for**: 
   - Button: **"Get Started"** (large, prominent)
   - Button: **"Add Service"** (top right)
   - Link: **"Set up APM"**
3. **Click**: Any of these buttons

### Option B: From Main APM Page

1. **Go to**: https://app.datadoghq.com/apm
2. **Look for**: Setup wizard or "Get Started" button
3. **Click**: "Get Started"

### Option C: From Service Map Page

1. **Go to**: https://app.datadoghq.com/apm/service-map
2. **Look for**: "Enable APM" or "Get Started" button
3. **Click**: It should take you to setup

---

## ✅ Step 2: Choose Setup Method

When you see setup options:

**Select**: **"Manual Instrumentation"** or **"JavaScript"** or **"Browser"**

**Skip**:
- ❌ "Single-Step Instrumentation" (for AWS/containers)
- ❌ "Serverless" (for AWS Lambda)
- ❌ "Docker" (for containers)

**Why**: PrayerMap is a React app in the browser, not a backend server.

---

## ✅ Step 3: Follow Setup Wizard

Datadog will show you steps like:

1. **Install package** → ✅ Already done (`@datadog/browser-rum`)
2. **Initialize code** → ✅ Already done (`src/lib/datadog.ts`)
3. **Configure** → ✅ Already done (`.env` file)

**What to do**:
- **Skip** code installation steps (you're already instrumented)
- **Click** "Next" or "Continue" through the wizard
- **Enable** APM when prompted
- **Verify** that APM is now enabled

---

## ✅ Step 4: Verify APM is Enabled

### Check 1: APM Services Page

1. **Go to**: https://app.datadoghq.com/apm/services
2. **Expected**: You should see services listed (even if empty initially)
3. **If empty**: Wait 2-5 minutes for data to flow

### Check 2: Service Map

1. **Go to**: https://app.datadoghq.com/apm/service-map
2. **Expected**: Service Map should load (may be empty initially)
3. **If empty**: Generate some traffic (use your app) and wait

### Check 3: RUM Explorer

1. **Go to**: https://app.datadoghq.com/rum/explorer
2. **Expected**: You should see RUM sessions/events
3. **Verify**: Data is flowing

---

## ✅ Step 5: Generate Traffic (To See Services)

After enabling APM:

1. **Open your app**: http://localhost:5173 (or your dev URL)
2. **Interact with it**:
   - Load the map
   - Click on prayer markers
   - Send a prayer response
   - Use real-time features
3. **Wait 2-5 minutes**
4. **Check Service Map**: https://app.datadoghq.com/apm/service-map

**Expected Services**:
- `prayermap` (your React app)
- `supabase-api` (Supabase REST API)
- `supabase-realtime` (WebSocket connections)
- `postgresql` (database queries)

---

## 🔧 What We Just Updated in Code

**File**: `src/lib/datadog.ts`

**Added**:
```typescript
// Distributed tracing - enables APM Service Map
allowedTracingUrls: allowedTracingUrls,
allowedTracingOrigins: supabaseUrl ? [new URL(supabaseUrl).origin] : undefined,
```

**Why**: This tells Datadog RUM to send traces to APM, enabling Service Map visualization.

---

## 🚨 Troubleshooting

### "I don't see a 'Get Started' button"

**Try**:
1. Go to: https://app.datadoghq.com/apm
2. Look for "Add Service" in top right
3. Or check if APM is already enabled (go to `/apm/services`)

### "APM is enabled but Service Map is still empty"

**Wait**: It takes 2-5 minutes for data to appear

**Generate traffic**: Use your app to create events

**Check**: Make sure RUM is working (https://app.datadoghq.com/rum/explorer)

### "I see services but they're not connected"

**This is normal**: Services appear individually first, then connections appear as traffic flows

**Wait**: More traffic = more connections in Service Map

---

## ✅ Next Steps After APM is Enabled

1. **✅ Verify Service Map** - See your architecture visualized
2. **✅ Add Mobile RUM iOS** - Track iOS app (see `DATADOG_SERVICE_MAP_MOBILE_SETUP.md`)
3. **✅ Add Mobile RUM Android** - Track Android app
4. **✅ View Complete Architecture** - All services in one map

---

## 📚 Related Documentation

- `docs/DATADOG_SERVICE_MAP_QUICK_START.md` - Quick reference
- `docs/DATADOG_SERVICE_MAP_MOBILE_SETUP.md` - Mobile setup
- `src/lib/datadog.ts` - Your tracing code

---

**Last Updated**: 2024-11-30  
**Status**: Ready to enable APM in dashboard

