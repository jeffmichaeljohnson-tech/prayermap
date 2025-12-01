# Finding APM Setup in Datadog - Troubleshooting Guide

> **Problem**: Service Map page doesn't show "Enable APM" option. Here's where to find it.

---

## 🎯 The Issue

**Service Map page** (`/apm/service-map`) is a **view-only** page. It shows services that are already being traced. To enable APM, you need to go to a **different page**.

---

## ✅ Where to Enable APM

### Option 1: Main APM Page (Most Common)

1. **Go to**: https://app.datadoghq.com/apm
   - **NOT** `/apm/service-map` (that's just the visualization)
   - **NOT** `/apm/services` (that's the services list)
   - **YES** `/apm` (the main APM page)

2. **Look for**:
   - "Get Started" button (large, prominent)
   - "Set up APM" button
   - "Add Service" button
   - Setup wizard/instructions

### Option 2: APM Services Page

1. **Go to**: https://app.datadoghq.com/apm/services
2. **Look for**:
   - "Add Service" button (top right)
   - "Get Started" link
   - Empty state message with setup instructions

### Option 3: From Left Sidebar

1. **Click**: "APM" in left sidebar (under Observability)
2. **Look for**: Setup options or "Get Started" button
3. **If you see services listed**: APM might already be enabled!

---

## 🔍 Check if APM is Already Enabled

### Quick Check (30 seconds)

1. **Go to**: https://app.datadoghq.com/apm/services
2. **Check**: Do you see any services listed?
   - **If YES** → APM is enabled! Service Map should work
   - **If NO** → APM needs to be enabled

### Check RUM Integration

Since you're using Datadog RUM:

1. **Go to**: https://app.datadoghq.com/rum/explorer
2. **Check**: Do you see actions/events?
   - **If YES** → RUM is working
   - **If NO** → Check RUM initialization

---

## 🚨 Important: Frontend vs Backend APM

### For PrayerMap (Frontend React App)

**Traditional APM** (with backend agents) is designed for:
- ❌ Backend services (Node.js servers, APIs)
- ❌ Server-side applications
- ❌ Containerized services

**Your Architecture**:
- ✅ Frontend: React app in browser (uses RUM, not APM)
- ✅ Backend: Supabase (managed service, not your server)

**What This Means**:
- Service Map might work with **RUM data alone**
- Or you might need **RUM + APM integration**
- Or APM might not be needed for frontend-only apps

---

## 🎯 Alternative: Use RUM Explorer Instead

If APM isn't available or doesn't work for frontend apps:

### RUM Explorer Shows:

1. **Go to**: https://app.datadoghq.com/rum/explorer
2. **You'll see**:
   - All user sessions
   - Performance metrics
   - Error tracking
   - Network requests (including Supabase)
   - User flows

**This gives you**:
- ✅ Component performance (via RUM)
- ✅ Network request tracking
- ✅ Error correlation
- ✅ User experience metrics
- ❌ Service Map visualization (requires APM)

---

## 🔧 For Service Map Specifically

### Service Map Requires APM

**Service Map needs**:
- APM enabled in Datadog
- Services sending traces (not just RUM events)
- Backend instrumentation (or RUM + APM integration)

### Check Your Datadog Plan

**APM might require**:
- Datadog Pro plan (not free tier)
- APM feature enabled in account

**To check**:
1. Go to: Datadog → **Settings** → **Plan & Usage**
2. Look for: "APM" in your plan features
3. Check: If APM is included

---

## 🚀 Recommended Next Steps

### Step 1: Check APM Status (1 minute)

1. **Go to**: https://app.datadoghq.com/apm/services
2. **Check**: Do you see services?
   - If YES → APM is enabled, Service Map should work
   - If NO → Continue to Step 2

### Step 2: Try Main APM Page (2 minutes)

1. **Go to**: https://app.datadoghq.com/apm
2. **Look for**: "Get Started" or "Add Service" button
3. **If you see it**: Click and follow setup
4. **If you don't see it**: Continue to Step 3

### Step 3: Check Plan/Account (2 minutes)

1. **Go to**: Datadog → **Settings** → **Plan & Usage**
2. **Check**: Does your plan include APM?
3. **If YES**: Contact Datadog support
4. **If NO**: Consider upgrading or use RUM Explorer instead

### Step 4: Alternative - Use RUM Explorer

If APM isn't available:

1. **Use**: https://app.datadoghq.com/rum/explorer
2. **You'll get**: Most of what you need (performance, errors, requests)
3. **Missing**: Service Map visualization (requires APM)

---

## 📋 What to Look For

### On APM Main Page (`/apm`)

**If APM is NOT enabled**:
- Large "Get Started" button
- Setup wizard
- "Add Service" button
- Instructions for instrumentation

**If APM IS enabled**:
- List of services
- Service Map link
- Traces explorer
- Performance dashboards

### On Service Map Page (`/apm/service-map`)

**If APM is enabled**:
- Visual map with services
- Nodes and connections
- Performance metrics

**If APM is NOT enabled**:
- Empty map
- "No services" message
- Setup instructions or "Get Started" link

---

## 🎯 For Your Specific Case

### PrayerMap Architecture

Since you're using:
- **Frontend**: React (browser-based, uses RUM)
- **Backend**: Supabase (managed service)

**You might need**:
- ✅ RUM Explorer (already working)
- ✅ RUM + APM integration (if available)
- ❌ Traditional APM (for backend servers)

### Check RUM Explorer First

1. **Go to**: https://app.datadoghq.com/rum/explorer
2. **Check**: Do you see data?
   - If YES → RUM is working, check if Service Map appears
   - If NO → Fix RUM first

---

## ✅ Summary

**The Problem**: Service Map page is view-only - it doesn't have setup options

**The Solution**:
1. Go to https://app.datadoghq.com/apm (main APM page, not Service Map)
2. Look for "Get Started" or "Add Service" button
3. If not found, check your Datadog plan includes APM
4. Alternative: Use RUM Explorer for frontend monitoring

**Next Action**: Try going to `/apm` (not `/apm/service-map`) and look for setup options

---

**Last Updated**: 2024-11-30  
**Status**: Troubleshooting APM enablement location

