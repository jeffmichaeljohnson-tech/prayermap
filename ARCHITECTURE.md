# PrayerMap Architecture

> **Status**: Post-Refactoring Architecture (Phase 1-4 Complete)
> **Last Updated**: December 2024

## 🏗️ **Current Architecture Overview**

PrayerMap is a React 18 + TypeScript application implementing the **Living Map** principle where users witness prayer happening in real-time across a shared global map with eternal memorial connections.

## 📁 **Directory Structure**

```
prayermap/
├── archive/                    # Historical files (SQL fixes, agent reports)
├── src/
│   ├── components/            # Feature-organized React components
│   │   ├── auth/             # Authentication components
│   │   ├── chat/             # Messaging and conversation
│   │   ├── debug/            # Development/debug tools (excluded from prod)
│   │   ├── map/              # Map rendering and interaction
│   │   ├── prayer/           # Prayer-specific components  
│   │   ├── media/            # Audio/video components
│   │   └── ui/               # Reusable UI primitives
│   ├── hooks/                # React custom hooks
│   ├── lib/                  # Core libraries and utilities
│   ├── services/             # Business logic and API calls
│   │   ├── performance/      # Performance optimization modules
│   │   └── messaging/        # Real-time messaging system
│   └── types/                # TypeScript type definitions
├── supabase/                  # Database migrations and config
├── tests/                     # Unified test directory
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
└── docs/                     # Project documentation
```

## 🔧 **Core Services Architecture**

### **Prayer Service Layer**
- **prayerService.ts** - Core prayer CRUD and geospatial operations
- **livingMapValidator.ts** - Living Map principle compliance validation
- **realtimeMonitor.ts** - Real-time subscription monitoring

### **Integration Layer** 
- **integrationService.ts** - Unified system integration (consolidated from 3 services)
- **mobileOptimizer.ts** - Cross-platform mobile optimizations
- **conversationService.ts** - Chat and messaging functionality

### **Monitoring & Performance**
- **livingMapMonitor.ts** - Living Map specific monitoring 
- **performanceMonitor.ts** - General application performance
- **services/performance/** - Performance optimization modules

## 🗺️ **Living Map Architecture**

The core spiritual mission is implemented through:

1. **Real-Time Updates** (`<2 seconds`)
   - Supabase real-time subscriptions
   - WebSocket connection monitoring
   - Automatic reconnection handling

2. **Eternal Memorial Lines**
   - Database constraints prevent deletion
   - Spatial indexing for performance
   - Memorial line persistence validation

3. **Universal Shared Reality**
   - Global data synchronization
   - Consistent map state across devices
   - Real-time conflict resolution

## 📱 **Mobile-First Design**

- **iOS/Android** compatibility via Capacitor
- **Touch-optimized** interactions
- **Progressive Web App** capabilities
- **Offline-capable** with sync on reconnection

## 🔍 **Monitoring Strategy**

**Simplified Observability Stack:**
- **Datadog RUM** - Real user monitoring
- **Living Map Monitor** - Spiritual mission compliance
- **Performance Monitor** - Technical metrics
- **Debug Components** - Development tools (excluded from production)

## 🚀 **Deployment Pipeline**

- **Development**: Local with Supabase cloud DB
- **Staging**: Vercel preview deployments  
- **Production**: Vercel with Supabase production DB
- **Mobile**: Capacitor builds to iOS App Store

## 🛡️ **Security Architecture**

- **Supabase RLS** - Row-level security for all data
- **JWT Authentication** - Secure user sessions
- **PostGIS Geography** - Location data without addresses
- **Media Upload** - Secure presigned URLs via Supabase Storage

---

## 📊 **Refactoring Improvements**

### **Before Refactoring**
- **80+ files** in project root
- **40+ components** in flat directory
- **8 monitoring systems** with overlaps
- **6 test directories** scattered throughout

### **After Refactoring** 
- **<15 files** in project root
- **Feature-organized** component structure
- **Unified monitoring** strategy
- **Consolidated test** structure

### **Technical Debt Reduction**
- **Removed duplicates**: livingMapMonitor, ConversationThread variants
- **Archived legacy**: SQL fixes, agent reports, debug artifacts  
- **Simplified imports**: Removed commented-out dead code
- **Unified services**: Consolidated 3 integration services

---

**Last Refactoring**: Phase 1-4 Complete (Dec 2024)
**Next Review**: When adding major features or after significant architectural changes