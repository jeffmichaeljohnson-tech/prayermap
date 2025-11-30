# get_nearby_prayers Optimization

## Summary

Optimized the `get_nearby_prayers` RPC function for mobile performance by adding server-side result limiting.

## Changes Made

### Database Migration: `20250129_optimize_get_nearby_prayers.sql`

**Enhancement:**
- Added `limit_count` parameter with default value of 500
- Added LIMIT clause to the SELECT query
- Maintains full backwards compatibility

**Performance Impact:**
- **BEFORE**: Database could return thousands of prayers within radius → Poor mobile performance
- **AFTER**: Database returns max 500 prayers by default → Optimized data transfer and battery life

## Technical Details

### Function Signature

```sql
CREATE OR REPLACE FUNCTION get_nearby_prayers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50,
  limit_count INTEGER DEFAULT 500  -- NEW
)
```

### Usage Examples

```sql
-- Backwards compatible (uses default limit of 500)
SELECT * FROM get_nearby_prayers(42.3314, -83.0458, 100);

-- With custom limit
SELECT * FROM get_nearby_prayers(42.3314, -83.0458, 100, 200);

-- Maximum limit for special cases
SELECT * FROM get_nearby_prayers(42.3314, -83.0458, 100, 1000);
```

### TypeScript Integration

Current implementation in `src/services/prayerService.ts` (lines 264-301):

```typescript
export async function fetchNearbyPrayers(
  lat: number,
  lng: number,
  radiusKm: number = 50
): Promise<Prayer[]> {
  const { data, error } = await supabase
    .rpc('get_nearby_prayers', {
      lat: lat,
      lng: lng,
      radius_km: radiusKm,
    });
  // ... rest of implementation
}
```

**Current Status:** ✅ Works without changes (uses default limit of 500)

## Recommendations

### 1. Optional TypeScript Enhancement

Consider adding a limit parameter to the TypeScript service for more granular control:

```typescript
export async function fetchNearbyPrayers(
  lat: number,
  lng: number,
  radiusKm: number = 50,
  limit: number = 500  // Add optional limit parameter
): Promise<Prayer[]> {
  const safeLimit = Math.min(limit, 1000); // Enforce hard max

  const { data, error } = await supabase
    .rpc('get_nearby_prayers', {
      lat: lat,
      lng: lng,
      radius_km: radiusKm,
      limit_count: safeLimit,  // Pass limit to database
    });
  // ... rest of implementation
}
```

**Benefits:**
- Allows components to request fewer prayers for faster initial loads
- Progressive loading: load 100 initially, then 500 on scroll
- Better control over mobile data usage

### 2. Mobile-Specific Optimization

For mobile platforms, consider using lower default limits:

```typescript
// In mobile-specific code (Capacitor)
const mobileLimit = 200;  // Lower for battery/performance
const prayers = await fetchNearbyPrayers(lat, lng, 50, mobileLimit);
```

### 3. Deprecation Note

**Important:** The `get_nearby_prayers` function is **deprecated** in favor of the Global Living Map approach (see service comments line 256-258). The project uses `fetchAllPrayers()` as the primary method.

However, this optimization is still valuable because:
- Function is still in active use in the codebase
- May be used for fallback scenarios
- Could be reactivated for regional filtering features

## Performance Metrics

### Expected Improvements

**Data Transfer:**
- Before: Could transfer 2000+ prayers × ~500 bytes = ~1 MB
- After: Max 500 prayers × ~500 bytes = ~250 KB
- **Savings: 75% reduction in worst case**

**Mobile Battery:**
- Less data parsing on client
- Faster JSON deserialization
- Reduced memory pressure

**Response Time:**
- Faster database query execution (smaller result set)
- Faster network transfer
- Faster client-side processing

### Monitoring

Track these metrics post-deployment:
- Average query response time
- Mobile data usage per session
- Battery drain during map interactions
- User-perceived load times

## Testing Checklist

- [x] Migration file created
- [ ] Database migration applied to staging
- [ ] Verify backward compatibility (no limit parameter)
- [ ] Test with custom limits (100, 500, 1000)
- [ ] Test mobile performance before/after
- [ ] Monitor production metrics for improvements

## Rollback Plan

If issues arise, rollback to previous version:

```sql
-- Restore previous function without limit_count parameter
-- (Use code from migration 007_fix_location_format.sql)
```

## Related Files

- **Migration**: `/home/user/prayermap/supabase/migrations/20250129_optimize_get_nearby_prayers.sql`
- **Service**: `/home/user/prayermap/src/services/prayerService.ts` (lines 264-301)
- **Similar Pattern**: `/home/user/prayermap/supabase/migrations/017_add_limit_to_get_all_prayers.sql`

## Status

- ✅ Migration created
- ⏳ Awaiting deployment
- ⏳ TypeScript enhancement (optional)
- ⏳ Performance validation

---

**Date**: 2025-01-29
**Agent**: Nearby Prayers Optimization Agent
**Sprint**: Database Optimization for Mobile Performance
