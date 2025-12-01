# Datadog Service Map for iOS/Android Deployment

> **Visual Architecture Dashboard** - See all components, services, and performance metrics in one interactive map

---

## 🎯 What You're Getting

**Interactive Service Map** showing:
- ✅ **All components** (mobile apps, frontend, backend, databases)
- ✅ **Performance metrics** at each component (latency, error rate, throughput)
- ✅ **Request flows** (iOS app → API → Database)
- ✅ **Geographic locations** (where services are hosted)
- ✅ **Dependencies** (which services call which)
- ✅ **Real-time status** (health indicators)

**Perfect for iOS/Android deployment**:
- Monitor mobile app performance
- Track backend API calls from mobile
- Debug mobile-specific issues
- Visualize complete request flows

---

## 🚨 Required Setup (In Order)

### 1. **APM (Application Performance Monitoring)** ⚠️ REQUIRED FIRST

**Why**: Service Map is automatically generated from APM data. Without APM, no Service Map.

**What It Does**:
- Tracks backend services (Supabase API, PostgreSQL, Edge Functions)
- Shows request flows and dependencies
- Provides performance metrics per service
- Enables Service Map visualization

**Setup Time**: 1-2 hours

---

### 2. **Mobile RUM (iOS/Android)** ⚠️ REQUIRED FOR MOBILE

**Why**: Tracks mobile apps and shows mobile → backend flows in Service Map.

**What It Does**:
- Monitors iOS/Android app performance
- Tracks network requests from mobile
- Shows mobile app in Service Map
- Correlates mobile errors with backend

**Setup Time**: 1 hour per platform (iOS + Android = 2 hours)

---

### 3. **Service Map** ⚠️ AUTOMATIC

**Why**: Automatically generated once APM is active.

**What It Shows**:
- Visual architecture diagram
- All services as nodes
- Performance metrics on each node
- Request flows as connections

**Setup Time**: 0 hours (automatic)

---

## 🚀 Quick Setup Guide

### Step 1: Enable APM in Datadog (30 minutes)

1. **Go to Datadog Dashboard**:
   - https://app.datadoghq.com/apm
   - Click **"Get Started"** or **"Add Service"**

2. **Select Your Backend Type**:
   - **Supabase**: Select "PostgreSQL" + "Node.js"
   - **Vercel**: Enable Vercel integration (automatic)

3. **Get APM Configuration**:
   - Datadog will provide setup instructions
   - Copy API key and service configuration

4. **Instrument Your Backend**:
   - See "APM Instrumentation" section below
   - Add tracing to Supabase queries
   - Enable Edge Function tracing (if using)

---

### Step 2: Add Mobile RUM (1 hour per platform)

#### iOS Setup

1. **Create iOS RUM App in Datadog**:
   - Go to https://app.datadoghq.com/rum/application/create
   - Select **"iOS"**
   - Copy App ID and Client Token

2. **Add to iOS Project**:
   ```bash
   cd ios/App
   # Add to Podfile:
   pod 'DatadogSDK', '~> 2.0'
   pod install
   ```

3. **Initialize in Swift**:
   ```swift
   // Add to AppDelegate.swift
   import DatadogRum
   
   func application(_ application: UIApplication, 
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
       let configuration = RUM.Configuration(
           applicationID: "YOUR_IOS_APP_ID",
           clientToken: "YOUR_CLIENT_TOKEN",
           environment: "production",
           serviceName: "prayermap-ios"
       )
       RUM.enable(with: configuration)
       return true
   }
   ```

#### Android Setup

1. **Create Android RUM App in Datadog**:
   - Go to https://app.datadoghq.com/rum/application/create
   - Select **"Android"**
   - Copy App ID and Client Token

2. **Add to Android Project**:
   ```gradle
   // android/app/build.gradle
   dependencies {
       implementation 'com.datadoghq:dd-sdk-android-rum:2.0.0'
   }
   ```

3. **Initialize in Kotlin**:
   ```kotlin
   // Add to MainActivity.kt
   import com.datadog.android.rum.Rum
   import com.datadog.android.rum.RumConfiguration
   
   class MainActivity : AppCompatActivity() {
       override fun onCreate(savedInstanceState: Bundle?) {
           super.onCreate(savedInstanceState)
           
           val rumConfig = RumConfiguration.Builder(
               applicationId = "YOUR_ANDROID_APP_ID",
               clientToken = "YOUR_CLIENT_TOKEN"
           )
               .setEnvironment("production")
               .setServiceName("prayermap-android")
               .build()
           
           Rum.enable(rumConfig, applicationContext)
           
           setContentView(R.layout.activity_main)
       }
   }
   ```

---

### Step 3: View Service Map (Automatic)

Once APM is active:

1. **Go to Service Map**:
   - https://app.datadoghq.com/apm/service-map

2. **You'll See**:
   ```
   ┌─────────────────────────────────────────┐
   │         Service Map View                │
   │                                         │
   │  [iOS App] ──→ [React Frontend]        │
   │     │              │                    │
   │     │              ↓                    │
   │  [Android App] ──→ [Supabase API]      │
   │                        │                │
   │                        ├─→ [PostgreSQL]│
   │                        ├─→ [Realtime]  │
   │                        └─→ [Storage]    │
   │                                         │
   └─────────────────────────────────────────┘
   ```

3. **Interact**:
   - **Click nodes** - See detailed metrics
   - **Hover connections** - See request latency
   - **Filter by environment** - Dev/Staging/Production
   - **Time range** - See changes over time

---

## 📊 What Service Map Shows

### Component Nodes

Each service appears as a node with:

**Visual Indicators**:
- **Color**: Health status (green/yellow/red)
- **Size**: Request volume
- **Shape**: Service type (app/database/external)

**Performance Metrics**:
- **Latency**: p50, p95, p99 response times
- **Error Rate**: Percentage of failed requests
- **Throughput**: Requests per second
- **Status**: Real-time health indicator

### Connection Lines

Show dependencies between services:

**Visual Indicators**:
- **Color**: Latency (green = fast, red = slow)
- **Thickness**: Request volume
- **Direction**: Arrow shows request flow
- **Style**: Solid = healthy, dashed = errors

**Metrics**:
- Request latency between services
- Error rate on connections
- Request count

---

## 🎯 For iOS/Android Deployment This Week

### Priority Setup (Do This First)

1. **✅ APM** (1-2 hours) - Enables Service Map
   - Instrument Supabase queries
   - Enable Vercel integration
   - Configure service tags

2. **✅ Mobile RUM iOS** (1 hour) - Track iOS app
   - Add Datadog SDK to iOS project
   - Initialize in AppDelegate
   - Test on iOS device

3. **✅ Mobile RUM Android** (1 hour) - Track Android app
   - Add Datadog SDK to Android project
   - Initialize in MainActivity
   - Test on Android device

### What You'll Get

**Before Deployment**:
- ✅ Visual architecture map
- ✅ Baseline performance metrics
- ✅ Service dependencies mapped

**During Deployment**:
- ✅ Real-time mobile app monitoring
- ✅ iOS vs Android performance comparison
- ✅ Backend API performance tracking

**After Deployment**:
- ✅ Production performance dashboard
- ✅ User experience metrics
- ✅ Issue detection and debugging

---

## 🔧 APM Instrumentation (Enhanced)

### Enhance Existing Supabase Tracing

You already have `src/lib/supabase-traced.ts`. Enhance it for APM:

**Add to `src/lib/supabase-traced.ts`**:
```typescript
import { datadogRum } from '@datadog/browser-rum';

// Enhanced tracing with APM context
export function traceSupabaseQueryWithAPM<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  // Start APM span
  const span = datadogRum.startAction(`supabase.query.${queryName}`, {
    service: 'supabase-api',
    resource: queryName,
    type: 'db',
    db: {
      type: 'postgresql',
      name: 'supabase',
    },
    ...metadata,
  });
  
  const startTime = performance.now();
  
  return queryFn()
    .then((result) => {
      const duration = performance.now() - startTime;
      
      // Add timing
      datadogRum.addTiming(`supabase.query.${queryName}.duration`, duration);
      
      // Set APM tags
      span.setTag('duration', duration);
      span.setTag('status', 'success');
      
      return result;
    })
    .catch((error) => {
      const duration = performance.now() - startTime;
      
      // Track error
      datadogRum.addError(error, {
        query: queryName,
        duration,
        type: 'supabase_error',
      });
      
      span.setTag('error', true);
      span.setTag('error.message', error.message);
      
      throw error;
    })
    .finally(() => {
      span.finish();
    });
}
```

---

## 📈 Service Map Features

### Interactive Exploration

1. **Zoom/Pan** - Navigate the architecture
2. **Click Nodes** - See detailed metrics:
   - Request rate
   - Latency distribution
   - Error breakdown
   - Top endpoints
3. **Filter** - By environment, service type, region
4. **Time Range** - See changes over time
5. **Search** - Find specific services

### Performance Overlays

**Color Coding**:
- **Green** - Healthy (< 100ms latency, < 1% errors)
- **Yellow** - Warning (100-500ms latency, 1-5% errors)
- **Red** - Critical (> 500ms latency, > 5% errors)

**Size Indicates**:
- Larger nodes = Higher request volume
- Smaller nodes = Lower request volume

---

## 🎯 Mobile-Specific Views

### iOS App View

Service Map shows:
- `prayermap-ios` → `supabase-api` (API calls)
- `prayermap-ios` → `mapbox` (Map rendering)
- `prayermap-ios` → `supabase-storage` (File uploads)

### Android App View

Service Map shows:
- `prayermap-android` → `supabase-api` (API calls)
- `prayermap-android` → `mapbox` (Map rendering)
- `prayermap-android` → `supabase-storage` (File uploads)

### Cross-Platform Comparison

Compare iOS vs Android:
- Performance differences
- Error rates
- Network request patterns
- User experience metrics

---

## 🚨 Critical for Mobile Deployment

### What Service Map Reveals

**Before Deployment**:
- Architecture gaps
- Missing service connections
- Performance bottlenecks
- Error-prone services

**During Deployment**:
- Mobile app → Backend connectivity
- API performance from mobile
- Database query performance
- Real-time connection health

**After Deployment**:
- Production performance baseline
- User experience metrics
- Issue detection and debugging
- Optimization opportunities

---

## 📚 Next Steps

1. **Set up APM** - Follow Step 1 above (1-2 hours)
2. **Add Mobile RUM** - Follow Step 2 above (2 hours total)
3. **View Service Map** - Go to Datadog → APM → Service Map
4. **Create Custom Dashboard** - Save your Service Map view
5. **Set Up Alerts** - Get notified of performance issues

---

## 🔗 Related Documentation

- `docs/DATADOG_SERVICE_MAP_MOBILE_SETUP.md` - Detailed setup guide
- `docs/DATADOG_PRE_REFACTORING_SETUP.md` - APM setup details
- `MOBILE-GUIDE.md` - Mobile deployment guide
- `ARCHITECTURE.md` - Current architecture

---

**Last Updated**: 2024-11-30  
**Status**: Ready for mobile deployment setup  
**Priority**: ⚠️ **CRITICAL** - Required for iOS/Android deployment visualization

