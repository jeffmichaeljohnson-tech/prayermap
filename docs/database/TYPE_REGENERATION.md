# Supabase Type Regeneration Guide

## Overview

This guide documents the process for regenerating TypeScript types from the Supabase database schema after adding new RPC functions, modifying table schemas, or making other database changes.

## Existing Type File Location

**Current Location:** `/home/user/prayermap/src/types/database.ts`

This file contains TypeScript definitions for:
- Database tables (prayers, prayer_responses, prayer_connections)
- RPC functions
- Insert/Update types
- Helper types (Json)

## When to Regenerate Types

Regenerate types after any of the following changes:

- ✅ Adding new RPC functions
- ✅ Modifying table schemas
- ✅ Adding new tables
- ✅ Changing function signatures
- ✅ Adding/modifying views
- ✅ Adding/modifying enums
- ✅ Changing column types

## Type Regeneration Methods

### Method 1: Automatic Generation (Recommended)

```bash
# Generate types from remote Supabase project
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

# Or generate from local database (if using Supabase CLI locally)
npx supabase gen types typescript --local > src/types/database.ts
```

**Prerequisites:**
- Supabase CLI installed: `npm install -g supabase`
- Authenticated with Supabase: `npx supabase login`
- Project ID from Supabase dashboard

### Method 2: Manual Type Addition

If automatic generation is not available, manually add new function signatures to `src/types/database.ts`.

## New Functions Added (Database Optimization Sprint - 2025-11-29)

### 1. get_all_prayers(limit_count)

**Purpose:** Optimized function to fetch all prayers with configurable limit

**TypeScript Signature:**
```typescript
get_all_prayers: {
  Args: {
    limit_count?: number
  }
  Returns: Array<{
    id: string
    user_id: string
    title: string | null
    content: string
    content_type: 'text' | 'audio' | 'video'
    content_url: string | null
    latitude: number
    longitude: number
    user_name: string | null
    is_anonymous: boolean
    created_at: string
    updated_at: string | null
  }>
}
```

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('get_all_prayers', {
  limit_count: 100
});
```

### 2. get_all_connections(limit_count)

**Purpose:** Optimized function to fetch prayer connections with limit

**TypeScript Signature:**
```typescript
get_all_connections: {
  Args: {
    limit_count?: number
  }
  Returns: Array<{
    id: string
    prayer_id: string
    prayer_response_id: string
    from_lat: number
    from_lng: number
    to_lat: number
    to_lng: number
    requester_name: string
    replier_name: string
    created_at: string
    expires_at: string
  }>
}
```

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('get_all_connections', {
  limit_count: 1000
});
```

### 3. get_prayers_paginated(page_size, cursor_id, cursor_created_at)

**Purpose:** Cursor-based pagination for efficient prayer fetching

**TypeScript Signature:**
```typescript
get_prayers_paginated: {
  Args: {
    page_size?: number
    cursor_id?: string
    cursor_created_at?: string
  }
  Returns: Array<{
    id: string
    user_id: string
    title: string | null
    content: string
    content_type: 'text' | 'audio' | 'video'
    content_url: string | null
    latitude: number
    longitude: number
    user_name: string | null
    is_anonymous: boolean
    created_at: string
    updated_at: string | null
    has_more: boolean
  }>
}
```

**Usage Example:**
```typescript
// First page
const { data, error } = await supabase.rpc('get_prayers_paginated', {
  page_size: 50
});

// Next page (using last item as cursor)
if (data && data.length > 0) {
  const lastItem = data[data.length - 1];
  const nextPage = await supabase.rpc('get_prayers_paginated', {
    page_size: 50,
    cursor_id: lastItem.id,
    cursor_created_at: lastItem.created_at
  });
}
```

### 4. get_performance_stats(start_date, end_date)

**Purpose:** Admin function for monitoring database performance metrics

**TypeScript Signature:**
```typescript
get_performance_stats: {
  Args: {
    start_date?: string
    end_date?: string
  }
  Returns: Array<{
    metric_name: string
    metric_value: number
    recorded_at: string
  }>
}
```

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('get_performance_stats', {
  start_date: '2025-11-01',
  end_date: '2025-11-30'
});
```

## Manual Type Definition Template

If you need to manually add these types to `src/types/database.ts`, add them to the `Functions` section:

```typescript
export interface Database {
  public: {
    Tables: {
      // ... existing tables
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // ... existing functions

      // NEW FUNCTIONS (Added 2025-11-29)
      get_all_prayers: {
        Args: { limit_count?: number }
        Returns: Array<{
          id: string
          user_id: string
          title: string | null
          content: string
          content_type: 'text' | 'audio' | 'video'
          content_url: string | null
          latitude: number
          longitude: number
          user_name: string | null
          is_anonymous: boolean
          created_at: string
          updated_at: string | null
        }>
      }
      get_all_connections: {
        Args: { limit_count?: number }
        Returns: Array<{
          id: string
          prayer_id: string
          prayer_response_id: string
          from_lat: number
          from_lng: number
          to_lat: number
          to_lng: number
          requester_name: string
          replier_name: string
          created_at: string
          expires_at: string
        }>
      }
      get_prayers_paginated: {
        Args: {
          page_size?: number
          cursor_id?: string
          cursor_created_at?: string
        }
        Returns: Array<{
          id: string
          user_id: string
          title: string | null
          content: string
          content_type: 'text' | 'audio' | 'video'
          content_url: string | null
          latitude: number
          longitude: number
          user_name: string | null
          is_anonymous: boolean
          created_at: string
          updated_at: string | null
          has_more: boolean
        }>
      }
      get_performance_stats: {
        Args: {
          start_date?: string
          end_date?: string
        }
        Returns: Array<{
          metric_name: string
          metric_value: number
          recorded_at: string
        }>
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
```

## Recommended NPM Scripts

Add these scripts to `package.json` for easier type regeneration:

```json
{
  "scripts": {
    "types:generate": "npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts",
    "types:generate:local": "npx supabase gen types typescript --local > src/types/database.ts",
    "types:verify": "npx tsc --noEmit"
  }
}
```

**Usage:**
```bash
# Generate types from remote database
npm run types:generate

# Generate types from local database
npm run types:generate:local

# Verify types are valid
npm run types:verify
```

## Type Safety Best Practices

### 1. Use Database Types in Services

```typescript
import { Database } from '@/types/database';

type Prayer = Database['public']['Tables']['prayers']['Row'];
type PrayerInsert = Database['public']['Tables']['prayers']['Insert'];
type PrayerUpdate = Database['public']['Tables']['prayers']['Update'];

// Use in function signatures
export async function createPrayer(prayer: PrayerInsert): Promise<Prayer> {
  // Implementation
}
```

### 2. RPC Function Type Safety

```typescript
import { Database } from '@/types/database';

type GetAllPrayersArgs = Database['public']['Functions']['get_all_prayers']['Args'];
type GetAllPrayersReturn = Database['public']['Functions']['get_all_prayers']['Returns'];

export async function getAllPrayers(args: GetAllPrayersArgs): Promise<GetAllPrayersReturn> {
  const { data, error } = await supabase.rpc('get_all_prayers', args);
  if (error) throw error;
  return data;
}
```

### 3. Supabase Client Type Inference

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Now all queries have type inference
const { data } = await supabase
  .from('prayers')  // ✅ Autocomplete available
  .select('*')      // ✅ Return type inferred
  .limit(10);
```

## Troubleshooting

### Issue: "Cannot find module '@/types/database'"

**Solution:** Ensure TypeScript path alias is configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: "Type 'unknown' is not assignable to type 'Geography'"

**Solution:** PostGIS geography types are represented as `unknown`. Create helper types:

```typescript
export type Geography = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};
```

### Issue: Types are out of sync with database

**Solution:** Always regenerate types after schema changes:

```bash
npm run types:generate
npm run types:verify
```

## Version History

| Date | Change | Functions Added |
|------|--------|----------------|
| 2025-11-29 | Database Optimization Sprint | get_all_prayers, get_all_connections, get_prayers_paginated, get_performance_stats |
| Previous | Initial Setup | get_nearby_prayers, create_prayer_connection, cleanup_expired_connections |

## Related Documentation

- [Database Schema](/docs/database/SCHEMA.md)
- [RPC Functions](/docs/database/RPC_FUNCTIONS.md)
- [Database Optimization](/docs/database/OPTIMIZATION_GUIDE.md)
- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/generating-types)

---

**Last Updated:** 2025-11-29
**Maintained By:** Database Optimization Sprint
**Next Review:** After next schema migration
