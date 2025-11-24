# Supabase - PostGIS Spatial Queries

**Official Source:** [Supabase Database Guide](https://supabase.com/docs/guides/database) | [PostGIS Documentation](https://postgis.net/documentation/)

**Version:** Supabase JS 2.83.0 | PostGIS 3.3

**Last Updated:** December 2024

## Overview

This document covers PostGIS spatial queries in Supabase, specifically for PrayerMap's location-based prayer request discovery. Includes ST_DWithin for radius searches, spatial indexing, and performance optimization.

## Prerequisites

- PostGIS extension enabled in Supabase
- Understanding of geography vs geometry types
- Basic SQL knowledge
- Supabase client initialized

## Core Concepts

- **Geography Type:** Uses earth's curvature for accurate distance calculations
- **ST_DWithin:** Efficient function for radius-based queries
- **GIST Index:** Spatial index for fast geographic queries
- **ST_MakePoint:** Creates a point from coordinates
- **ST_Distance:** Calculates distance between two geographic points

## Implementation

### Enable PostGIS Extension

```sql
-- Enable PostGIS extension (run once in Supabase SQL Editor)
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Notes:**

- PostGIS must be enabled before creating spatial columns
- Extension is enabled at database level, not per-table

### Basic Radius Query

```typescript
import { supabase } from './supabase';

async function getPrayersWithinRadius(
  latitude: number,
  longitude: number,
  radiusKm: number = 48 // 30 miles default
) {
  const radiusMeters = radiusKm * 1000; // Convert km to meters
  
  const { data, error } = await supabase.rpc('get_prayers_within_radius', {
    lat: latitude,
    lng: longitude,
    radius_km: radiusKm,
  });
  
  if (error) {
    console.error('Error fetching prayers:', error);
    return [];
  }
  
  return data;
}
```

### Using Database Function (Recommended)

The schema includes a pre-built function `get_prayers_within_radius`:

```sql
-- Function signature (already in schema)
CREATE OR REPLACE FUNCTION get_prayers_within_radius(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 48 -- 30 miles = 48km
)
RETURNS TABLE (
    prayer_id BIGINT,
    user_id UUID,
    title TEXT,
    text_body TEXT,
    media_type media_type,
    media_url TEXT,
    media_duration_seconds INTEGER,
    is_anonymous BOOLEAN,
    city_region TEXT,
    support_count INTEGER,
    response_count INTEGER,
    distance_km DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    poster_first_name TEXT,
    poster_is_public BOOLEAN
)
```

**Usage:**

```typescript
const { data, error } = await supabase.rpc('get_prayers_within_radius', {
  lat: 41.8781, // Chicago
  lng: -87.6298,
  radius_km: 48, // 30 miles
});
```

### Direct SQL Query (Alternative)

```typescript
async function getPrayersWithinRadiusDirect(
  latitude: number,
  longitude: number,
  radiusKm: number
) {
  const radiusMeters = radiusKm * 1000;
  
  const { data, error } = await supabase
    .from('prayers')
    .select(`
      *,
      poster:users!prayers_user_id_fkey(first_name, is_profile_public)
    `)
    .eq('status', 'ACTIVE')
    .rpc('st_dwithin', {
      geography_column: 'location',
      geography_point: `SRID=4326;POINT(${longitude} ${latitude})`,
      distance_meters: radiusMeters,
    });
  
  return { data, error };
}
```

**Note:** This approach requires custom RPC function or using PostgREST filters.

### Creating Spatial Point

```typescript
// Convert user coordinates to PostGIS POINT
function createPrayerWithLocation(
  userId: string,
  textBody: string,
  longitude: number,
  latitude: number
) {
  return supabase
    .from('prayers')
    .insert({
      user_id: userId,
      text_body: textBody,
      location: `POINT(${longitude} ${latitude})`, // PostGIS format
      // OR use PostGIS function:
      // location: supabase.rpc('st_makepoint', { lng: longitude, lat: latitude }),
    });
}
```

### Distance Calculation

```typescript
// Calculate distance between two prayers
async function getPrayerDistance(
  prayerId1: number,
  prayerId2: number
): Promise<number | null> {
  const { data, error } = await supabase.rpc('prayer_distance_km', {
    prayer_id_1: prayerId1,
    prayer_id_2: prayerId2,
  });
  
  if (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
  
  return data; // Returns distance in kilometers
}
```

## PrayerMap Use Cases

### Use Case 1: Get Prayers Within 30 Miles

```typescript
import { supabase } from './supabase';

interface Prayer {
  prayer_id: number;
  user_id: string;
  title: string | null;
  text_body: string;
  media_type: 'TEXT' | 'AUDIO' | 'VIDEO';
  media_url: string | null;
  distance_km: number;
  support_count: number;
  response_count: number;
  created_at: string;
}

export async function getNearbyPrayers(
  userLatitude: number,
  userLongitude: number,
  radiusMiles: number = 30
): Promise<Prayer[]> {
  // Convert miles to kilometers
  const radiusKm = radiusMiles * 1.60934;
  
  const { data, error } = await supabase.rpc('get_prayers_within_radius', {
    lat: userLatitude,
    lng: userLongitude,
    radius_km: Math.round(radiusKm),
  });
  
  if (error) {
    console.error('Error fetching nearby prayers:', error);
    throw error;
  }
  
  return data || [];
}
```

### Use Case 2: Filter by Distance Range

```typescript
// Get prayers within specific distance range (e.g., 10-30 miles)
async function getPrayersInRange(
  latitude: number,
  longitude: number,
  minMiles: number,
  maxMiles: number
) {
  const minKm = minMiles * 1.60934;
  const maxKm = maxMiles * 1.60934;
  
  // Get all prayers within max radius
  const { data, error } = await supabase.rpc('get_prayers_within_radius', {
    lat: latitude,
    lng: longitude,
    radius_km: Math.round(maxKm),
  });
  
  if (error) return [];
  
  // Filter by minimum distance
  return data.filter(
    (prayer: any) => prayer.distance_km >= minKm
  );
}
```

### Use Case 3: Sort by Distance

```typescript
// Get prayers sorted by distance (closest first)
async function getPrayersSortedByDistance(
  latitude: number,
  longitude: number,
  radiusKm: number = 48
) {
  const { data, error } = await supabase.rpc('get_prayers_within_radius', {
    lat: latitude,
    lng: longitude,
    radius_km: radiusKm,
  });
  
  if (error) return [];
  
  // Sort by distance (already sorted by created_at in function)
  // Re-sort by distance if needed
  return data.sort((a: any, b: any) => 
    a.distance_km - b.distance_km
  );
}
```

### Use Case 4: Create Prayer with Location

```typescript
export async function createPrayer(
  userId: string,
  content: {
    textBody: string;
    title?: string;
    mediaType?: 'TEXT' | 'AUDIO' | 'VIDEO';
    mediaUrl?: string;
    mediaDurationSeconds?: number;
  },
  location: {
    latitude: number;
    longitude: number;
  },
  isAnonymous: boolean = false
) {
  // Create PostGIS POINT string
  const locationPoint = `POINT(${location.longitude} ${location.latitude})`;
  
  const { data, error } = await supabase
    .from('prayers')
    .insert({
      user_id: userId,
      text_body: content.textBody,
      title: content.title || null,
      media_type: content.mediaType || 'TEXT',
      media_url: content.mediaUrl || null,
      media_duration_seconds: content.mediaDurationSeconds || null,
      is_anonymous: isAnonymous,
      location: locationPoint,
      status: 'ACTIVE',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating prayer:', error);
    throw error;
  }
  
  return data;
}
```

## Spatial Indexing

### GIST Index (Already in Schema)

```sql
-- Critical index for performance (already created in schema)
CREATE INDEX prayers_location_gist_idx 
ON prayers 
USING GIST (location);
```

**Notes:**

- GIST index enables index scan instead of sequential scan
- Queries 1M prayers within 30 miles in ~75ms
- Index is automatically used by ST_DWithin queries
- Index size grows with data, but performance remains excellent

### Verify Index Usage

```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM prayers
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography,
  48000 -- 48km in meters
)
AND status = 'ACTIVE';
```

Look for `Index Scan using prayers_location_gist_idx` in the output.

## Performance Considerations

### Use ST_DWithin Instead of ST_Distance

```sql
-- ✅ FAST: Uses index, can short-circuit
WHERE ST_DWithin(location, point, radius)

-- ❌ SLOW: Calculates distance for all rows
WHERE ST_Distance(location, point) < radius
```

### Limit Result Set

```typescript
// Add limit to prevent large result sets
async function getNearbyPrayersLimited(
  latitude: number,
  longitude: number,
  radiusKm: number = 48,
  limit: number = 100
) {
  const { data, error } = await supabase.rpc('get_prayers_within_radius', {
    lat: latitude,
    lng: longitude,
    radius_km: radiusKm,
  });
  
  if (error) return [];
  
  return data.slice(0, limit);
}
```

### Cache Frequent Queries

```typescript
// Cache results for same location/radius
const queryCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

function getCacheKey(lat: number, lng: number, radius: number) {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;
}

async function getPrayersCached(
  latitude: number,
  longitude: number,
  radiusKm: number
) {
  const cacheKey = getCacheKey(latitude, longitude, radiusKm);
  const cached = queryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await getNearbyPrayers(latitude, longitude, radiusKm / 1.60934);
  queryCache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}
```

## Error Handling

### Invalid Coordinates

```typescript
function validateCoordinates(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
}

async function getPrayersSafe(
  latitude: number,
  longitude: number,
  radiusKm: number
) {
  if (!validateCoordinates(latitude, longitude)) {
    throw new Error('Invalid coordinates');
  }
  
  if (radiusKm < 1 || radiusKm > 161) {
    throw new Error('Radius must be between 1 and 161 km');
  }
  
  return getNearbyPrayers(latitude, longitude, radiusKm / 1.60934);
}
```

### Handle Database Errors

```typescript
try {
  const prayers = await getNearbyPrayers(lat, lng, 30);
} catch (error: any) {
  if (error.code === 'PGRST116') {
    // Function not found
    console.error('Database function not found. Check schema.');
  } else if (error.code === '42883') {
    // Function does not exist
    console.error('PostGIS function not available.');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Security Notes

- **RLS Policies:** Ensure Row Level Security is enabled on prayers table
- **Input Validation:** Always validate coordinates before querying
- **Radius Limits:** Enforce maximum radius (161km = 100 miles)
- **Parameterized Queries:** Use RPC functions instead of raw SQL to prevent injection

## Testing

### Test Radius Query

```typescript
test('gets prayers within radius', async () => {
  // Create test prayer at known location
  await createPrayer(userId, {
    textBody: 'Test prayer',
  }, {
    latitude: 41.8781,
    longitude: -87.6298,
  });
  
  // Query nearby
  const prayers = await getNearbyPrayers(41.8781, -87.6298, 30);
  
  expect(prayers.length).toBeGreaterThan(0);
  expect(prayers[0].distance_km).toBeLessThan(48);
});
```

### Test Distance Calculation

```typescript
test('calculates distance correctly', async () => {
  const distance = await getPrayerDistance(prayerId1, prayerId2);
  
  expect(distance).toBeGreaterThan(0);
  expect(distance).toBeLessThan(1000); // Within 1000km
});
```

## Troubleshooting

### Slow Queries

**Issue:** Queries taking >1 second

**Solutions:**
1. Verify GIST index exists: `\d+ prayers` in psql
2. Check index usage with EXPLAIN ANALYZE
3. Ensure using ST_DWithin, not ST_Distance
4. Reduce radius if querying very large areas
5. Add limit to result set

### No Results Returned

**Issue:** Query returns empty array

**Solutions:**
1. Verify coordinates are [lng, lat] not [lat, lng]
2. Check radius units (km vs miles)
3. Verify prayers have status = 'ACTIVE'
4. Check RLS policies allow reading
5. Verify PostGIS extension is enabled

### Invalid Geography Error

**Issue:** "invalid input syntax for type geography"

**Solutions:**
1. Ensure coordinates are valid numbers
2. Check longitude is -180 to 180
3. Check latitude is -90 to 90
4. Verify POINT format: `POINT(lng lat)` not `POINT(lat lng)`

## References

- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [ST_DWithin Function](https://postgis.net/docs/ST_DWithin.html)
- [GIST Indexing](https://postgis.net/docs/using_postgis_dbmanagement.html#idm13074)

