# Datadog Service Map & APM for Mobile Deployment

> **Visual Architecture Dashboard** - See all components, services, and performance metrics in one interactive map

---

## 🎯 What You'll Get

**Visual Service Map** showing:
- ✅ **All components** (frontend, backend, services, databases)
- ✅ **Performance metrics** at each component location
- ✅ **Request flow** (mobile app → API → database)
- ✅ **Error rates** and latency at each service
- ✅ **Geographic location** of services (hosting regions)
- ✅ **Dependencies** between components

**Perfect for**:
- iOS/Android deployment monitoring
- Understanding system architecture
- Debugging performance issues
- Visualizing request flows

---

## 🚨 Critical Services Needed

### 1. **APM (Application Performance Monitoring)** ⚠️ REQUIRED

**Why Critical**:
- Enables Service Map visualization
- Tracks backend performance (Supabase, Edge Functions)
- Shows request flows from mobile → backend → database
- Provides performance metrics at each component

**What It Shows**:
- Service dependencies (which services call which)
- Request latency at each service
- Error rates per service
- Throughput (requests per second)
- Database query performance

**Setup**: Requires backend instrumentation (see below)

---

### 2. **Mobile RUM (iOS/Android)** ⚠️ REQUIRED

**Why Critical**:
- Tracks mobile app performance
- Shows mobile → backend request flows
- Monitors iOS/Android specific issues
- Correlates mobile errors with backend services

**What It Shows**:
- Mobile app performance metrics
- Network requests from mobile
- Crash reports
- User session replays (mobile)

**Setup**: Add Mobile RUM SDK to iOS/Android apps

---

### 3. **Service Map** ⚠️ AUTOMATIC (Once APM is Active)

**Why Critical**:
- Visual representation of entire architecture
- Shows all components and their relationships
- Performance metrics overlaid on each component
- Interactive exploration of services

**What It Shows**:
```
Mobile App (iOS/Android)
    ↓
Frontend (React/Vite)
    ↓
Supabase API
    ├─→ PostgreSQL Database
    ├─→ Realtime (WebSocket)
    └─→ Storage (S3)
```

**Setup**: Automatically generated from APM data

---

## 🚀 Setup Guide

### Phase 1: APM Setup (Backend) - 1-2 hours

#### Step 1: Install Datadog APM Agent

**For Supabase Edge Functions** (if using):
```bash
# Install Datadog APM tracer
npm install dd-trace
```

**For Vercel Serverless Functions**:
- Datadog has native Vercel integration
- Enable in Datadog → Integrations → Vercel

#### Step 2: Instrument Supabase Queries

**Add to `src/lib/supabase.ts`**:
```typescript
import { tracer } from 'dd-trace';

// Wrap Supabase client with tracing
export const tracedSupabase = {
  from: (table: string) => {
    return tracer.trace(`supabase.query.${table}`, (span) => {
      span.setTag('db.type', 'postgresql');
      span.setTag('db.name', 'supabase');
      span.setTag('db.table', table);
      return supabase.from(table);
    });
  },
  
  rpc: (functionName: string, params?: any) => {
    return tracer.trace(`supabase.rpc.${functionName}`, (span) => {
      span.setTag('db.type', 'postgresql');
      span.setTag('db.function', functionName);
      return supabase.rpc(functionName, params);
    });
  },
};
```

#### Step 3: Configure APM

**Create `datadog-apm-config.js`**:
```javascript
const tracer = require('dd-trace').init({
  service: 'prayermap-backend',
  env: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '0.0.0',
  
  // Enable database tracing
  db: {
    query: true,
  },
  
  // Enable HTTP tracing
  http: {
    server: true,
    client: true,
  },
  
  // Enable WebSocket tracing
  websocket: {
    client: true,
    server: true,
  },
  
  // Sample rate (100% for debugging)
  sampleRate: 1.0,
  
  // Logging
  logInjection: true,
  
  // Runtime metrics
  runtimeMetrics: true,
});

module.exports = tracer;
```

---

### Phase 2: Mobile RUM Setup (iOS/Android) - 1 hour

#### Step 1: Install Mobile RUM SDK

**For iOS**:
```bash
cd ios/App
pod init
# Add to Podfile:
pod 'DatadogSDK', '~> 2.0'
pod install
```

**For Android**:
```bash
# Add to android/app/build.gradle:
dependencies {
    implementation 'com.datadoghq:dd-sdk-android-rum:2.0.0'
}
```

#### Step 2: Initialize Mobile RUM

**iOS (Swift)** - Add to `AppDelegate.swift`:
```swift
import DatadogRum

func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let configuration = RUM.Configuration(
        applicationID: "19266bce-3606-44cf-8982-6e2feec4dbd9", // Your App ID
        clientToken: "pub3b15b24300fc9f06bb50f44124a7603a", // Your Client Token
        environment: "production",
        serviceName: "prayermap-ios",
        sessionSampleRate: 100.0,
        uiKitViewsPredicate: DefaultUIKitRUMViewsPredicate(),
        uiKitActionsPredicate: DefaultUIKitRUMUserActionsPredicate()
    )
    
    RUM.enable(with: configuration)
    
    return true
}
```

**Android (Kotlin)** - Add to `MainActivity.kt`:
```kotlin
import com.datadog.android.rum.Rum
import com.datadog.android.rum.RumConfiguration

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val rumConfig = RumConfiguration.Builder(
            applicationId = "19266bce-3606-44cf-8982-6e2feec4dbd9",
            clientToken = "pub3b15b24300fc9f06bb50f44124a7603a"
        )
            .setEnvironment("production")
            .setServiceName("prayermap-android")
            .setSessionSampleRate(100f)
            .build()
        
        Rum.enable(rumConfig, applicationContext)
        
        setContentView(R.layout.activity_main)
    }
}
```

---

### Phase 3: Service Map Visualization - Automatic

Once APM and Mobile RUM are active, Service Map automatically generates:

1. **Go to Datadog** → **APM** → **Service Map**
2. **You'll see**:
   - All services as nodes
   - Connections showing dependencies
   - Performance metrics on each node
   - Error rates color-coded
   - Latency indicators

**Service Map Features**:
- **Zoom/Pan** - Explore the architecture
- **Click nodes** - See detailed metrics
- **Filter by environment** - Dev/Staging/Production
- **Time range** - See changes over time
- **Performance overlay** - Color-coded by latency/errors

---

## 📊 What You'll See in Service Map

### Component Nodes

**Frontend Services**:
- `prayermap-web` (React app on Vercel)
- `prayermap-ios` (iOS app)
- `prayermap-android` (Android app)

**Backend Services**:
- `supabase-api` (Supabase REST API)
- `supabase-realtime` (WebSocket connections)
- `supabase-storage` (File storage)
- `supabase-auth` (Authentication)

**Database**:
- `postgresql` (Supabase PostgreSQL)

**External Services**:
- `mapbox` (Map rendering)
- `vercel` (Hosting/CDN)

### Performance Metrics on Each Node

- **Request Rate** - Requests per second
- **Latency** - p50, p95, p99 response times
- **Error Rate** - Percentage of failed requests
- **Throughput** - Data transferred
- **Status** - Health indicator (green/yellow/red)

### Connection Lines

- **Request flow** - Shows which services call which
- **Latency** - Color-coded by response time
- **Error rate** - Thickness indicates error frequency
- **Direction** - Arrows show request direction

---

## 🎯 Mobile-Specific Monitoring

### iOS App Monitoring

**Metrics Tracked**:
- App launch time
- Screen load times
- Network request latency
- Crash reports
- Battery usage
- Memory usage

**Service Map Shows**:
- iOS app → Supabase API calls
- iOS app → Mapbox requests
- iOS app → Storage uploads

### Android App Monitoring

**Metrics Tracked**:
- App startup time
- Activity transitions
- Network performance
- ANR (Application Not Responding) events
- Crash reports
- Battery impact

**Service Map Shows**:
- Android app → Backend services
- Android app → External APIs
- Request flows and dependencies

---

## 🔧 Quick Setup Commands

### 1. Enable APM in Datadog

1. Go to https://app.datadoghq.com/apm
2. Click **"Get Started"** or **"Add Service"**
3. Select **"Node.js"** (for Supabase Edge Functions)
4. Follow setup instructions

### 2. Add Mobile RUM Apps

**For iOS**:
1. Go to Datadog → **RUM** → **Applications**
2. Click **"Add Application"**
3. Select **"iOS"**
4. Copy App ID and Client Token
5. Add to iOS app (see Phase 2 above)

**For Android**:
1. Go to Datadog → **RUM** → **Applications**
2. Click **"Add Application"**
3. Select **"Android"**
4. Copy App ID and Client Token
5. Add to Android app (see Phase 2 above)

### 3. View Service Map

1. Go to https://app.datadoghq.com/apm/service-map
2. Select environment: **Production** (or your environment)
3. Explore the visual architecture!

---

## 📈 Advanced Features

### Custom Service Tags

Add tags to services for better organization:

```typescript
// In your code
tracer.setTag('component.type', 'frontend');
tracer.setTag('component.name', 'PrayerMap');
tracer.setTag('deployment.region', 'us-east-1');
tracer.setTag('team', 'prayermap');
```

### Performance Overlays

Service Map automatically shows:
- **Green nodes** - Healthy (< 100ms latency, < 1% errors)
- **Yellow nodes** - Warning (100-500ms latency, 1-5% errors)
- **Red nodes** - Critical (> 500ms latency, > 5% errors)

### Geographic Location

If services are tagged with region:
- Service Map shows geographic distribution
- See which regions have performance issues
- Optimize deployment locations

---

## 🎯 For iOS/Android Deployment This Week

### Priority Setup Order

1. **✅ APM** (1-2 hours) - Enables Service Map
2. **✅ Mobile RUM** (1 hour) - Tracks mobile apps
3. **✅ Service Map** (Automatic) - Visual architecture

### What You'll Get

**Before Deployment**:
- Baseline performance metrics
- Architecture visualization
- Service dependencies mapped

**During Deployment**:
- Real-time monitoring of mobile apps
- Performance comparison (iOS vs Android)
- Error tracking per platform

**After Deployment**:
- Production performance metrics
- User experience monitoring
- Issue detection and debugging

---

## 📚 Related Documentation

- `docs/DATADOG_PRE_REFACTORING_SETUP.md` - APM setup details
- `docs/DATADOG_SETUP_WALKTHROUGH.md` - RUM setup guide
- `MOBILE-GUIDE.md` - Mobile deployment guide
- `ARCHITECTURE.md` - Current architecture

---

## 🚨 Next Steps

1. **Set up APM** - Follow Phase 1 above
2. **Add Mobile RUM** - Follow Phase 2 above
3. **View Service Map** - Go to Datadog → APM → Service Map
4. **Create Dashboard** - Customize Service Map view
5. **Set Alerts** - Get notified of performance issues

---

**Last Updated**: 2024-11-30  
**Status**: Ready for mobile deployment setup  
**Priority**: ⚠️ **HIGH** - Critical for iOS/Android deployment

