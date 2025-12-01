# How to Enable APM in Datadog - Step by Step

> **Problem**: Service Map is empty because APM isn't enabled yet. Here's how to enable it.

---

## 🎯 The Issue

**Service Map shows services only AFTER APM is enabled**. Since you're on the Service Map page and it's empty, APM needs to be enabled first.

---

## ✅ Solution: Enable APM First

### Step 1: Navigate to APM Setup

**Option A: From Service Map Page**
1. Look for a button/link that says:
   - "Get Started"
   - "Set up APM"
   - "Add Service"
   - "Enable APM"

**Option B: Direct Navigation**
1. Go to: https://app.datadoghq.com/apm
2. You should see setup options

**Option C: From Main Menu**
1. Click **"APM"** in left sidebar
2. Look for **"Get Started"** or **"Add Service"** button
3. Click it

---

### Step 2: Choose Setup Method

Once on the APM setup page, you'll see options:

**For PrayerMap (Frontend Tracing)**:
- ✅ **"Manual Instrumentation"** - Choose this
- ❌ "Single-Step Instrumentation" - Skip (for AWS/containers)
- ❌ "Serverless" - Skip (for AWS Lambda)

---

### Step 3: Select Language/Platform

After choosing Manual Instrumentation:

**Select**: **"JavaScript"** or **"TypeScript"** or **"Browser"**

**Why**: Your frontend is React/TypeScript running in the browser

---

### Step 4: Follow Setup Instructions

Datadog will show you:
1. **Install package** (you already have `@datadog/browser-rum`)
2. **Initialize code** (you already have this in `src/lib/datadog.ts`)
3. **Configure** (you already have credentials in `.env`)

**Since you're already instrumented**, you can:
- Skip the code setup steps
- Just enable APM in Datadog
- Verify Service Map appears

---

## 🔍 Alternative: Check if APM is Already Enabled

### Check APM Status

1. **Go to**: https://app.datadoghq.com/apm/services
2. **Look for**: Any services listed
   - If you see services → APM is enabled, Service Map should work
   - If empty → APM needs to be enabled

### Check RUM Status

1. **Go to**: https://app.datadoghq.com/rum/explorer
2. **Check**: Do you see actions/events?
   - If YES → RUM is working, APM might just need linking
   - If NO → Check RUM initialization

---

## 🚀 Quick Fix: Enable APM via RUM

Since you're already using Datadog RUM, APM might just need to be "linked":

1. **Go to**: https://app.datadoghq.com/apm
2. **Look for**: "Link RUM to APM" or "Enable APM Tracing"
3. **Click**: Enable/Activate

**This should**:
- Link your existing RUM data to APM
- Generate Service Map automatically
- Show your services

---

## 📋 What to Look For on APM Page

When you go to https://app.datadoghq.com/apm, you should see:

**If APM is NOT enabled**:
- "Get Started" button
- "Set up APM" button
- "Add Service" button
- Setup wizard/instructions

**If APM IS enabled**:
- List of services
- Service Map link
- Traces explorer
- Performance metrics

---

## 🎯 Recommended Action

### Try This First (30 seconds)

1. **Go to**: https://app.datadoghq.com/apm/services
2. **Check**: Do you see any services?
   - If YES → APM is enabled, Service Map should work
   - If NO → Continue to next step

### If No Services (5 minutes)

1. **Go to**: https://app.datadoghq.com/apm
2. **Look for**: Any button that says:
   - "Get Started"
   - "Set up APM"
   - "Add Service"
   - "Enable APM"
3. **Click it** and follow the setup wizard
4. **Select**: "Manual Instrumentation" → "JavaScript/TypeScript"
5. **Skip code steps** (you're already instrumented)
6. **Enable APM** in Datadog

---

## 🔧 If You Still Can't Find It

### Check Your Datadog Plan

**APM might require**:
- Datadog Pro plan (not free tier)
- APM feature enabled in your account

**To check**:
1. Go to: Datadog → Settings → Plan & Usage
2. Check if APM is included
3. If not, you might need to upgrade

### Alternative: Use RUM Only

**If APM isn't available**, you can still:
- ✅ Use RUM Explorer for frontend monitoring
- ✅ See performance metrics
- ✅ Track errors and sessions
- ❌ Service Map won't be available (requires APM)

---

## 📞 Need Help?

**What to check**:
1. Are you on the right Datadog account?
2. Does your plan include APM?
3. Can you see the APM menu item in the sidebar?

**Screenshots that would help**:
- Screenshot of https://app.datadoghq.com/apm page
- Screenshot of Service Map page
- Screenshot of APM sidebar menu

---

## ✅ Summary

**The Issue**: Service Map is empty because APM needs to be enabled first

**The Solution**:
1. Go to https://app.datadoghq.com/apm (not Service Map)
2. Look for "Get Started" or "Enable APM" button
3. Choose "Manual Instrumentation"
4. Select "JavaScript/TypeScript"
5. Enable APM (your code is already instrumented)
6. Return to Service Map - it should show services

---

**Last Updated**: 2024-11-30  
**Status**: Troubleshooting APM enablement

