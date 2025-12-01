# Datadog Service Map - Quick Start for Mobile Deployment

> **Get your visual architecture dashboard running in 2-3 hours**

---

## 🎯 What You'll Get

**Interactive Service Map** showing:
- All components (mobile apps, frontend, backend, databases)
- Performance metrics at each component
- Request flows (mobile → API → database)
- Geographic locations of services
- Real-time health status

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Enable APM in Datadog (30 min)

1. **Go to**: https://app.datadoghq.com/apm
2. **Click**: "Get Started" or "Add Service"
3. **Select**: "Node.js" (for Supabase backend)
4. **Follow**: Setup instructions (Datadog will guide you)

**What This Does**: Enables backend tracing and generates Service Map automatically

---

### Step 2: Add Mobile RUM (1 hour per platform)

#### iOS (30 min)

1. **Create iOS App in Datadog**:
   - Go to: https://app.datadoghq.com/rum/application/create
   - Select: **"iOS"**
   - Copy: App ID and Client Token

2. **Add to iOS Project**:
   ```bash
   cd ios/App
   # Edit Podfile, add:
   pod 'DatadogSDK', '~> 2.0'
   pod install
   ```

3. **Initialize** (Add to `AppDelegate.swift`):
   ```swift
   import DatadogRum
   
   func application(_ application: UIApplication, 
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
       RUM.enable(with: RUM.Configuration(
           applicationID: "YOUR_IOS_APP_ID",
           clientToken: "YOUR_CLIENT_TOKEN",
           environment: "production",
           serviceName: "prayermap-ios"
       ))
       return true
   }
   ```

#### Android (30 min)

1. **Create Android App in Datadog**:
   - Go to: https://app.datadoghq.com/rum/application/create
   - Select: **"Android"**
   - Copy: App ID and Client Token

2. **Add to Android Project**:
   ```gradle
   // android/app/build.gradle
   dependencies {
       implementation 'com.datadoghq:dd-sdk-android-rum:2.0.0'
   }
   ```

3. **Initialize** (Add to `MainActivity.kt`):
   ```kotlin
   import com.datadog.android.rum.Rum
   import com.datadog.android.rum.RumConfiguration
   
   Rum.enable(RumConfiguration.Builder(
       applicationId = "YOUR_ANDROID_APP_ID",
       clientToken = "YOUR_CLIENT_TOKEN"
   ).setServiceName("prayermap-android").build(), applicationContext)
   ```

---

### Step 3: View Service Map (Instant!)

1. **Go to**: https://app.datadoghq.com/apm/service-map
2. **Select**: Your environment (Production/Staging/Development)
3. **Explore**: Click nodes, hover connections, filter services

**You'll See**:
- iOS/Android apps as nodes
- Frontend (React) as node
- Backend (Supabase) as node
- Database (PostgreSQL) as node
- Performance metrics on each
- Request flows between them

---

## 📊 Service Map Features

### Visual Components

**Nodes** (Services):
- **Color**: Health (green/yellow/red)
- **Size**: Request volume
- **Label**: Service name

**Connections** (Dependencies):
- **Color**: Latency (green = fast, red = slow)
- **Thickness**: Request volume
- **Direction**: Arrow shows flow

### Performance Metrics

**On Each Node**:
- Latency (p50, p95, p99)
- Error rate (%)
- Throughput (req/sec)
- Status (healthy/warning/critical)

**On Each Connection**:
- Request latency
- Error rate
- Request count

---

## 🎯 For Mobile Deployment This Week

### What Service Map Shows

**Mobile Apps**:
- `prayermap-ios` - iOS app performance
- `prayermap-android` - Android app performance

**Backend Services**:
- `supabase-api` - API performance
- `postgresql` - Database performance
- `supabase-realtime` - WebSocket performance
- `supabase-storage` - File storage performance

**Request Flows**:
```
iOS App → Supabase API → PostgreSQL
Android App → Supabase API → PostgreSQL
React Frontend → Supabase API → PostgreSQL
```

---

## 🔧 Enhanced Tracing (Already Done!)

Your codebase already has:
- ✅ `src/lib/supabase-traced.ts` - Traced Supabase client
- ✅ `src/lib/datadog.ts` - Enhanced with APM context
- ✅ Automatic query tracing
- ✅ Real-time subscription monitoring

**Just need to**:
1. Enable APM in Datadog (Step 1)
2. Add Mobile RUM (Step 2)
3. View Service Map (Step 3)

---

## 📈 What You'll See

### Service Map View

```
┌─────────────────────────────────────────────┐
│           Datadog Service Map               │
│                                             │
│  [iOS App] ──────────┐                     │
│                      │                      │
│  [Android App] ──────┼──→ [React Frontend] │
│                      │         │            │
│                      │         ↓            │
│                      └──→ [Supabase API]   │
│                              │              │
│                              ├─→ [PostgreSQL]│
│                              ├─→ [Realtime] │
│                              └─→ [Storage]  │
│                                             │
└─────────────────────────────────────────────┘
```

### Performance Overlay

- **Green nodes** = Healthy (< 100ms, < 1% errors)
- **Yellow nodes** = Warning (100-500ms, 1-5% errors)
- **Red nodes** = Critical (> 500ms, > 5% errors)

---

## 🚨 Critical Setup Notes

### APM Requirements

**For Service Map to work**, you need:
1. ✅ APM enabled in Datadog
2. ✅ Backend services instrumented (already done!)
3. ✅ Services sending traces to Datadog

**Your codebase already has**:
- Supabase query tracing
- Real-time subscription monitoring
- Error tracking with context

**Just need to**:
- Enable APM in Datadog dashboard
- Configure service tags (optional but recommended)

---

### Mobile RUM Requirements

**For mobile apps in Service Map**:
1. ✅ Mobile RUM SDK installed
2. ✅ Mobile RUM initialized
3. ✅ Mobile apps sending data to Datadog

**Once active**, Service Map automatically shows:
- Mobile apps as nodes
- Mobile → Backend request flows
- Mobile-specific performance metrics

---

## 📚 Full Documentation

- `docs/DATADOG_SERVICE_MAP_MOBILE_SETUP.md` - Detailed setup guide
- `docs/DATADOG_MOBILE_DEPLOYMENT_VISUALIZATION.md` - Mobile-specific guide
- `docs/DATADOG_PRE_REFACTORING_SETUP.md` - APM setup details

---

## ✅ Checklist

- [ ] Enable APM in Datadog (30 min)
- [ ] Add iOS Mobile RUM (30 min)
- [ ] Add Android Mobile RUM (30 min)
- [ ] View Service Map (instant!)
- [ ] Create custom dashboard (optional)
- [ ] Set up alerts (optional)

**Total Time**: 2-3 hours  
**Result**: Complete visual architecture dashboard

---

**Ready to start?** Begin with Step 1 (Enable APM) - it's the foundation for everything else!

