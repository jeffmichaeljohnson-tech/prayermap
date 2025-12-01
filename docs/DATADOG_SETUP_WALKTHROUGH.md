# Datadog Setup Walkthrough for PrayerMap

> **Complete step-by-step guide** to set up Datadog RUM (Real User Monitoring) for PrayerMap frontend.

---

## 🎯 What We're Setting Up

**Frontend Monitoring (RUM)**:
- Real-time user session tracking
- Error tracking and alerting
- Performance monitoring (60fps animations, load times)
- Supabase query tracing
- Real-time subscription monitoring

**Why This Matters for PrayerMap**:
- **Living Map Principle**: Monitor <2 second real-time prayer updates
- **Performance**: Ensure 60fps animations stay smooth
- **Debugging**: Track down real-time messaging issues quickly
- **Observability-Driven Development**: Check Datadog BEFORE debugging errors

---

## Step 1: Get Your Datadog RUM Credentials (5 minutes)

### 1.1 Log into Datadog

1. Go to https://app.datadoghq.com
2. Log in with your account

### 1.2 Navigate to RUM Setup

1. In the left sidebar, click **"RUM"** (under "Observability")
2. If you don't see RUM, click **"Add New"** → **"RUM Application"**
3. Or go directly to: https://app.datadoghq.com/rum/application/create

### 1.3 Create a New RUM Application

1. **Application Name**: `PrayerMap` (or `prayermap`)
2. **Type**: Select **"React"** ⚠️ IMPORTANT
   - Don't use "Javascript" (default)
   - Select **"React"** for React-specific tracking
   - This enables better component-level monitoring
3. **Client Token**: 
   - If you see a client token, **copy it** (starts with `pub_...`)
   - If not, click **"Generate Client Token"** and copy it
4. **Application ID**: 
   - You'll see this displayed (looks like `abc123-def456-...`)
   - **Copy this too**

### 1.4 Save Your Credentials

**⚠️ Important**: Save these in a secure place:

```
Application ID: ________________________
Client Token:   ________________________
```

**✅ Done?** You should have:
- ✅ Application ID (looks like `abc123-def456-...`)
- ✅ Client Token (starts with `pub_...`)

---

## Step 2: Create Environment Variables File (2 minutes)

### 2.1 Create `.env.local` File

In your project root (`/Users/computer/jeffmichaeljohnson-tech/projects/prayermap`), create a new file:

```bash
touch .env.local
```

### 2.2 Add Datadog Credentials

Open `.env.local` and add:

```env
# Datadog RUM Configuration
VITE_DATADOG_APP_ID=your_application_id_here
VITE_DATADOG_CLIENT_TOKEN=your_client_token_here

# Optional: Enable in development (set to 'true' to enable)
VITE_DATADOG_ENABLE_DEV=true
```

**Replace**:
- `your_application_id_here` → Your Application ID from Step 1
- `your_client_token_here` → Your Client Token from Step 1

### 2.3 Verify File Location

Your file structure should be:
```
prayermap/
├── .env.local          ← This file (NEW)
├── src/
├── package.json
└── ...
```

**✅ Done?** Your `.env.local` should have both credentials filled in.

---

## Step 3: Verify Datadog Initialization (3 minutes)

### 3.1 Start Development Server

```bash
npm run dev
```

### 3.2 Open Browser Console

1. Open your app in the browser (usually http://localhost:5173)
2. Open **Developer Tools** (F12 or Cmd+Option+I)
3. Go to **Console** tab

### 3.3 Check for Datadog Initialization

You should see:
```
✅ Datadog RUM initialized
```

**If you see a warning instead**:
```
⚠️ Datadog RUM not configured - missing VITE_DATADOG_APP_ID or VITE_DATADOG_CLIENT_TOKEN
```

**This means**:
- ❌ Environment variables not loaded
- ❌ Need to restart dev server
- ❌ Check `.env.local` file location and spelling

### 3.4 Restart Dev Server (If Needed)

If you see the warning:
1. **Stop** the dev server (Ctrl+C)
2. **Restart**: `npm run dev`
3. **Refresh** browser
4. **Check console** again

**✅ Done?** You should see "✅ Datadog RUM initialized" in console.

---

## Step 4: Test Datadog Integration (5 minutes)

### 4.1 Trigger a Test Event

In your browser console, run:

```javascript
// Test Datadog is working
window.datadogRum?.addAction('test.prayermap.setup', {
  test: true,
  timestamp: new Date().toISOString()
});

console.log('✅ Test event sent to Datadog');
```

### 4.2 Check Datadog Dashboard

1. Go to https://app.datadoghq.com/rum/explorer
2. Click **"Actions"** tab
3. Look for `test.prayermap.setup` action
4. You should see your test event appear within 30 seconds

**✅ Done?** You should see your test event in Datadog dashboard.

---

## Step 5: Verify PrayerMap Integration (5 minutes)

### 5.1 Check Supabase Query Tracing

The codebase already has Supabase query tracing configured. When you:
- Load prayers from the map
- Send a prayer response
- Subscribe to real-time updates

These should automatically appear in Datadog.

### 5.2 Check Real-Time Monitoring

1. In Datadog, go to **RUM** → **Explorer**
2. Look for actions starting with:
   - `supabase.query.*` (database queries)
   - `supabase.realtime.*` (real-time subscriptions)

### 5.3 Monitor Performance

1. Go to **RUM** → **Performance**
2. Check:
   - **Page Load Time** (should be <2s for Living Map)
   - **First Contentful Paint** (should be <1.5s)
   - **Time to Interactive** (should be <3s)

**✅ Done?** You should see PrayerMap data flowing into Datadog.

---

## Step 6: Set Up Alerts (Optional - 5 minutes)

### 6.1 Create Alert for Real-Time Latency

1. Go to **Monitors** → **New Monitor** → **RUM**
2. **Monitor Type**: "RUM Action"
3. **Action Name**: `supabase.realtime.*`
4. **Alert Condition**: "Latency > 2000ms" (2 seconds)
5. **Message**: "PrayerMap real-time update exceeded 2s threshold (Living Map requirement)"

### 6.2 Create Alert for Errors

1. **Monitor Type**: "RUM Error"
2. **Alert Condition**: "Error rate > 1%"
3. **Message**: "PrayerMap error rate exceeded threshold"

**✅ Done?** You'll get notified if performance degrades.

---

## 🎉 Success Checklist

- [ ] ✅ Application ID and Client Token obtained from Datadog
- [ ] ✅ `.env.local` file created with credentials
- [ ] ✅ Dev server restarted and Datadog initialized
- [ ] ✅ Console shows "✅ Datadog RUM initialized"
- [ ] ✅ Test event appears in Datadog dashboard
- [ ] ✅ PrayerMap actions visible in RUM Explorer
- [ ] ✅ Performance metrics showing in Datadog

---

## 🐛 Troubleshooting

### Problem: "Datadog RUM not configured" warning

**Solution**:
1. Check `.env.local` file exists in project root
2. Verify variable names are exact: `VITE_DATADOG_APP_ID` and `VITE_DATADOG_CLIENT_TOKEN`
3. Restart dev server completely
4. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

### Problem: No data in Datadog dashboard

**Solution**:
1. Wait 30-60 seconds (data takes time to appear)
2. Check browser console for errors
3. Verify Application ID and Client Token are correct
4. Check Datadog site is set to `datadoghq.com` (not EU or other regions)

### Problem: Environment variables not loading

**Solution**:
1. Ensure file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
2. File must be in project root (same level as `package.json`)
3. Restart dev server after creating/modifying `.env.local`
4. Check Vite is reading env vars: `console.log(import.meta.env.VITE_DATADOG_APP_ID)`

---

## 📚 Next Steps

Once Datadog RUM is working:

1. **Monitor Living Map Performance**: Watch for <2s real-time updates
2. **Track Animation Performance**: Ensure 60fps for prayer animations
3. **Debug Real-Time Issues**: Use Datadog to trace messaging problems
4. **Set Up Backend Monitoring**: Configure PostgreSQL monitoring (optional)

---

## 🔗 Related Documentation

- `src/lib/datadog.ts` - Datadog integration code
- `docs/OBSERVABILITY_DRIVEN_DEVELOPMENT.md` - ODD protocol
- `MONITORING-GUIDE.md` - Full monitoring guide

---

**Last Updated**: 2024-11-30  
**Status**: Ready for setup

