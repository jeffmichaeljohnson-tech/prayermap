# Datadog APM Setup - Correct Path for PrayerMap

> **Important**: PrayerMap does NOT use AWS. Use Manual Instrumentation instead.

---

## 🚨 Why You Don't Need AWS

**PrayerMap Architecture**:
- ✅ **Frontend**: Vercel (serverless, but NOT AWS)
- ✅ **Backend**: Supabase (managed PostgreSQL, NOT AWS)
- ✅ **Mobile**: iOS/Android via Capacitor (NOT AWS)

**AWS Remote Instrumentation is for**:
- ❌ AWS Lambda functions
- ❌ AWS ECS/Fargate containers
- ❌ AWS EC2 instances

**PrayerMap doesn't use any of these**, so AWS setup is not needed.

---

## ✅ Correct Setup Path

### Step 1: Go Back to APM Setup Page

1. **Click the back arrow** (top left of current page)
2. **Or go directly to**: https://app.datadoghq.com/apm

### Step 2: Choose Manual Instrumentation

On the APM setup page:

1. **Select**: "Manual Instrumentation" tab (already selected)
2. **Skip**: "Where are your traces coming from?" section
   - This is for backend APM agents
   - You're tracing from the frontend (React app)
   - Your backend is Supabase (managed service)

### Step 3: Your Setup is Already Done!

**Why Manual Instrumentation Works**:
- ✅ Your frontend is already instrumented with Datadog RUM
- ✅ Supabase queries are already traced via `src/lib/datadog.ts`
- ✅ Real-time subscriptions are already monitored
- ✅ You just need APM enabled in Datadog to see Service Map

---

## 🎯 What You Actually Need

### For Service Map Visualization

**You DON'T need**:
- ❌ AWS account integration
- ❌ AWS Lambda instrumentation
- ❌ Backend APM agent installation
- ❌ Serverless function tracing

**You DO need**:
- ✅ APM enabled in Datadog (just enable it)
- ✅ Your existing frontend tracing (already done!)
- ✅ Mobile RUM for iOS/Android (separate setup)

---

## 🚀 Correct Setup Steps

### Option A: Enable APM via RUM (Easiest)

Since you're already using Datadog RUM:

1. **Go to**: https://app.datadoghq.com/apm/service-map
2. **Check if Service Map appears** - It might already work!
3. **If not**, enable APM:
   - Go to https://app.datadoghq.com/apm
   - Click "Get Started"
   - Select "Manual Instrumentation"
   - Choose "JavaScript/TypeScript"
   - Follow instructions (but you're already instrumented!)

### Option B: Enable Vercel Integration (Optional)

If you want to trace Vercel serverless functions:

1. **Go to**: Datadog → Integrations → Vercel
2. **Enable**: Vercel integration
3. **Connect**: Your Vercel account
4. **Result**: Vercel functions appear in Service Map

**Note**: This is optional - your frontend tracing already works!

---

## 📊 What Will Appear in Service Map

Once APM is enabled, you'll see:

**Frontend Services**:
- `prayermap-web` (React app on Vercel)
- `prayermap-ios` (after adding Mobile RUM)
- `prayermap-android` (after adding Mobile RUM)

**Backend Services** (via Supabase):
- `supabase-api` (REST API calls)
- `supabase-realtime` (WebSocket connections)
- `postgresql` (Database queries)
- `supabase-storage` (File uploads)

**External Services**:
- `mapbox` (Map rendering)
- `vercel` (Hosting/CDN)

---

## 🔧 Quick Action Plan

### Right Now (5 minutes)

1. **Go back** from AWS page (click back arrow)
2. **Go to**: https://app.datadoghq.com/apm/service-map
3. **Check**: Does Service Map show any services?
   - If YES → You're done! APM is already working
   - If NO → Continue to next step

### If Service Map is Empty (15 minutes)

1. **Go to**: https://app.datadoghq.com/apm
2. **Click**: "Get Started" or "Add Service"
3. **Select**: "Manual Instrumentation"
4. **Choose**: "JavaScript/TypeScript"
5. **Follow**: Basic setup (your code is already instrumented)
6. **Verify**: Service Map shows services

---

## 🎯 For Mobile Deployment This Week

**Priority Order**:

1. **✅ Enable APM** (5-15 min) - See Service Map
2. **✅ Add Mobile RUM iOS** (30 min) - Track iOS app
3. **✅ Add Mobile RUM Android** (30 min) - Track Android app
4. **✅ View Service Map** - See complete architecture

**Total Time**: ~1.5 hours  
**Result**: Complete visual architecture dashboard

---

## 📚 Related Documentation

- `docs/DATADOG_SERVICE_MAP_QUICK_START.md` - Quick setup guide
- `docs/DATADOG_MOBILE_DEPLOYMENT_VISUALIZATION.md` - Mobile guide
- `src/lib/datadog.ts` - Your existing tracing code

---

## ✅ Summary

**Don't use AWS** - PrayerMap doesn't use AWS Lambda  
**Use Manual Instrumentation** - Your frontend is already instrumented  
**Enable APM** - Just enable it in Datadog  
**Add Mobile RUM** - For iOS/Android apps  

**Next Step**: Go back from AWS page and check Service Map directly!

---

**Last Updated**: 2024-11-30  
**Status**: Correct path identified - no AWS needed

