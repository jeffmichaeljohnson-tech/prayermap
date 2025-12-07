# PrayerMap Architecture Decision Record

This document captures key architectural decisions and their rationale for PrayerMap.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │    PWA       │  │  iOS Native  │          │
│  │   (React)    │  │  (Installed) │  │  (Phase 3)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                  │
│         └─────────────────┴──────────────────┘                  │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │   MapBox    │                              │
│                    │   GL JS     │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        EDGE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      VERCEL                               │   │
│  │  • Static React app (CDN cached)                         │   │
│  │  • Edge functions (auth middleware)                      │   │
│  │  • Auto-scaling                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    CLOUDFRONT                             │   │
│  │  • Media CDN (audio/video)                               │   │
│  │  • Global distribution                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      SUPABASE                             │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │         PostgreSQL 15 + PostGIS                     │ │   │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐     │ │   │
│  │  │  │ users  │ │prayers │ │responses│ │ support  │     │ │   │
│  │  │  └────────┘ └────────┘ └────────┘ └──────────┘     │ │   │
│  │  │                                                     │ │   │
│  │  │  • Row-Level Security (RLS)                        │ │   │
│  │  │  • PostGIS spatial queries                         │ │   │
│  │  │  • Triggers for denormalized counts               │ │   │
│  │  │  • JSONB for flexible notifications               │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │            Supabase Auth (GoTrue)                   │ │   │
│  │  │  • JWT tokens                                       │ │   │
│  │  │  • Sign in with Apple                              │ │   │
│  │  │  • Row-level policies                              │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │            Supabase Realtime                        │ │   │
│  │  │  • WebSocket subscriptions                         │ │   │
│  │  │  • Prayer updates                                  │ │   │
│  │  │  • Notification delivery                           │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      AWS S3                               │   │
│  │  • Audio/video storage                                   │   │
│  │  • Presigned URL uploads                                 │   │
│  │  • CloudFront distribution                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Supabase over Firebase

**Status:** Accepted

**Context:**  
Need a backend service with authentication, database, and realtime capabilities.

**Decision:**  
Use Supabase instead of Firebase.

**Rationale:**
1. **PostgreSQL** — Relational data model fits prayers/users better than NoSQL
2. **PostGIS** — Native geospatial queries (Firebase requires Cloud Functions)
3. **Row-Level Security** — More granular than Firestore rules
4. **SQL** — Team familiarity, easier debugging
5. **Open Source** — No vendor lock-in, can self-host if needed
6. **Cost** — More predictable pricing at scale

**Consequences:**
- ✅ Powerful geospatial queries in 5ms
- ✅ Familiar SQL interface
- ✅ Strong type safety with generated types
- ⚠️ Less mature than Firebase
- ⚠️ Smaller community

---

### ADR-002: MapBox over Google Maps

**Status:** Accepted

**Context:**  
Need a mapping solution for displaying prayers geographically.

**Decision:**  
Use MapBox GL JS v3.

**Rationale:**
1. **Custom Styling** — Full control over map appearance (Ethereal Dawn theme)
2. **3D Support** — Buildings, terrain, pitched camera for animations
3. **Vector Tiles** — Smaller, faster than raster
4. **Client-Side Rendering** — Smooth interactions
5. **Generous Free Tier** — 50k loads/month free
6. **Existing Account** — Already have credentials

**Consequences:**
- ✅ Beautiful custom map styles
- ✅ Smooth 60fps animations
- ✅ 3D capabilities for Phase 2
- ⚠️ Learning curve for custom styles
- ⚠️ Less familiar than Google Maps

---

### ADR-003: AWS S3 for Media over Supabase Storage

**Status:** Accepted

**Context:**  
Need storage for audio/video prayer recordings.

**Decision:**  
Use AWS S3 with presigned URLs instead of Supabase Storage.

**Rationale:**
1. **Cost** — 50% cheaper at scale ($30 vs $80 at 50k users)
2. **Industry Standard** — Battle-tested infrastructure
3. **Video Optimization** — Better tools for transcoding (future)
4. **CloudFront** — Global CDN included
5. **Scalability** — Unlimited storage

**Consequences:**
- ✅ Lower cost at scale
- ✅ More control over media processing
- ✅ Better CDN performance
- ⚠️ More complex setup (presigned URLs)
- ⚠️ Separate from Supabase ecosystem

---

### ADR-004: Zustand over Redux

**Status:** Accepted

**Context:**  
Need client-side state management for UI and cached data.

**Decision:**  
Use Zustand for state management.

**Rationale:**
1. **Simplicity** — No boilerplate, no actions/reducers
2. **Size** — 1KB vs 16KB (Redux + toolkit)
3. **TypeScript** — First-class support
4. **React Query** — Handles server state separately
5. **Minimal Learning** — Team can be productive immediately

**Consequences:**
- ✅ Simple, readable code
- ✅ Smaller bundle
- ✅ Easy to test
- ⚠️ Less ecosystem (middleware, devtools)
- ⚠️ Manual persistence if needed

---

### ADR-005: React Query for Server State

**Status:** Accepted

**Context:**  
Need to manage server data (prayers, notifications) efficiently.

**Decision:**  
Use React Query (TanStack Query) for server state.

**Rationale:**
1. **Cache Management** — Automatic caching and invalidation
2. **Loading States** — Built-in loading/error states
3. **Background Refresh** — Stale-while-revalidate pattern
4. **Pagination** — Easy infinite scroll support
5. **Devtools** — Great debugging experience

**Consequences:**
- ✅ Less custom loading logic
- ✅ Automatic refetching
- ✅ Optimistic updates
- ⚠️ Learning curve
- ⚠️ Separate from Zustand (clear separation)

---

### ADR-006: PWA Before Native App

**Status:** Accepted

**Context:**  
Need to launch quickly while supporting mobile users.

**Decision:**  
Ship as Progressive Web App first, native iOS in Phase 3.

**Rationale:**
1. **Speed** — 1 week to MVP vs 2+ months for native
2. **Cross-Platform** — Works on iOS, Android, Desktop
3. **Iteration** — Faster to update than App Store
4. **Testing** — Validate product-market fit before native investment
5. **Cost** — One codebase to maintain

**Consequences:**
- ✅ Launch in 1 week
- ✅ Single codebase
- ✅ Easy updates
- ⚠️ No native push notifications (in-app only)
- ⚠️ Less native feel
- ⚠️ No App Store visibility

---

### ADR-007: PostGIS Geography Type

**Status:** Accepted

**Context:**  
Need to store and query prayer locations efficiently.

**Decision:**  
Use PostGIS `GEOGRAPHY(Point, 4326)` type with GIST index.

**Rationale:**
1. **Accuracy** — Accounts for Earth's curvature
2. **Performance** — GIST index enables fast spatial queries
3. **SQL** — Native queries without external services
4. **Flexibility** — Easy to change radius, add polygons

**Query Performance:**
```
1M prayers, 30km radius: ~75ms
100k prayers, 30km radius: ~15ms
10k prayers, 30km radius: ~5ms
```

**Consequences:**
- ✅ Blazing fast queries
- ✅ Accurate distances
- ✅ No external geocoding service
- ⚠️ Requires PostGIS extension
- ⚠️ Slightly more complex schema

---

### ADR-008: Sign in with Apple Only (MVP)

**Status:** Accepted

**Context:**  
Need authentication for posting prayers and receiving notifications.

**Decision:**  
Support only Sign in with Apple for MVP.

**Rationale:**
1. **Privacy** — Apple's privacy-first approach aligns with PrayerMap values
2. **Trust** — Users trust Apple's authentication
3. **Required** — App Store requires it if any social login offered
4. **Simplicity** — One auth provider to maintain
5. **Hide Email** — Built-in email privacy feature

**Consequences:**
- ✅ Simple implementation
- ✅ Privacy-friendly
- ✅ High trust factor
- ⚠️ Android users need Apple ID or email/password (Phase 2)
- ⚠️ No social graph features

---

### ADR-009: 30-Mile Default Radius

**Status:** Accepted

**Context:**  
Need to determine default area for showing prayers.

**Decision:**  
Set default notification and viewing radius to 30 miles (48km).

**Rationale:**
1. **Community Scale** — Large enough to find prayers, small enough to feel local
2. **Performance** — Reasonable query size (typically <1000 prayers)
3. **Engagement** — Higher chance of seeing relevant prayers
4. **Configurable** — User can adjust in settings

**Consequences:**
- ✅ Good balance of relevance and quantity
- ✅ Reasonable database load
- ⚠️ May need adjustment based on user feedback
- ⚠️ Rural vs urban density differences

---

### ADR-010: Memorial Lines (1 Year Persistence)

**Status:** Accepted

**Context:**  
Need to visualize prayer connections between users.

**Decision:**  
Memorial lines persist for 1 year from creation.

**Rationale:**
1. **Meaning** — Year-long visibility honors the spiritual connection
2. **Performance** — Prevents infinite accumulation
3. **Visual** — Manageable number of lines on map
4. **Memory** — Users can revisit past connections

**Consequences:**
- ✅ Meaningful visual representation
- ✅ Bounded storage requirements
- ✅ Clean automatic expiration
- ⚠️ Need background job for cleanup
- ⚠️ Users may want to extend/delete

---

## Data Flow

### Prayer Creation Flow

```
User                Browser              Supabase             S3
  │                    │                    │                 │
  │ ─── Submit ─────▶ │                    │                 │
  │                    │ ─── Get URL ────▶ │                 │
  │                    │ ◀─── URL ─────── │                 │
  │                    │                    │                 │
  │                    │ ─────────── Upload Media ─────────▶ │
  │                    │ ◀───────────── OK ───────────────── │
  │                    │                    │                 │
  │                    │ ─── Insert ─────▶ │                 │
  │                    │ ◀─── Prayer ───── │                 │
  │                    │                    │                 │
  │ ◀── Confirmation ─ │                    │                 │
  │                    │                    │                 │
```

### Prayer Support Flow

```
User                Browser              Supabase
  │                    │                    │
  │ ─── "Pray" ──────▶ │                    │
  │                    │ ─── Insert ─────▶ │ (prayer_support)
  │ ◀── Animation ─── │                    │
  │                    │                    │ ─── Trigger ──▶ (update count)
  │                    │                    │ ─── Trigger ──▶ (notification)
  │                    │                    │
  │                    │ ◀─── Realtime ─── │ (WebSocket)
  │                    │                    │
```

---

## Security Model

### Row-Level Security Policies

```sql
-- Users can only read their own data
CREATE POLICY users_select ON users
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone can read active prayers
CREATE POLICY prayers_select ON prayers
  FOR SELECT USING (status = 'ACTIVE');

-- Users can only create prayers as themselves
CREATE POLICY prayers_insert ON prayers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only support prayers once
CREATE POLICY support_insert ON prayer_support
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM prayer_support
      WHERE prayer_id = NEW.prayer_id AND user_id = auth.uid()
    )
  );
```

### Authentication Flow

```
1. User clicks "Sign in with Apple"
2. Apple OAuth redirects with code
3. Supabase exchanges code for session
4. JWT token stored in browser
5. All API calls include JWT
6. RLS policies enforce access
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| FCP | < 1.5s | Lighthouse |
| TTI | < 3s | Lighthouse |
| LCP | < 2.5s | Lighthouse |
| Map Load | < 2s | Custom timing |
| API p95 | < 300ms | Supabase dashboard |
| Animation | 60fps | Chrome DevTools |
| Bundle | < 200KB | Vite build |

---

## Scalability Considerations

### Current Design (0-50k users)
- Single Supabase instance
- Free tier services
- No caching layer
- Simple deployment

### Future Scaling (50k+ users)
- Supabase Pro tier
- Redis for caching
- Read replicas
- CDN for static assets
- Background job queue

### Database Scaling Strategy
```
Phase 1: Single instance (up to 100k prayers)
Phase 2: Connection pooling (up to 500k prayers)
Phase 3: Read replica (up to 1M prayers)
Phase 4: Sharding by geography (1M+ prayers)
```

---

## Disaster Recovery

### Backup Strategy
- Supabase automatic backups (daily)
- S3 versioning enabled
- Point-in-time recovery (7 days)

### Recovery Time Objectives
- Database: < 1 hour
- Media: < 4 hours
- Full service: < 4 hours

---

## Future Considerations

### Potential Migrations
1. **Supabase → Custom Backend** — If needed for specific features
2. **S3 → CloudFlare R2** — Cost savings at scale
3. **Vercel → Cloudflare Pages** — Edge performance

### Technical Debt Tracking
- Monitor bundle size growth
- Track query performance degradation
- Review RLS policy complexity
- Audit third-party dependencies

---

*This document is a living record. Update it when architectural decisions change.*
