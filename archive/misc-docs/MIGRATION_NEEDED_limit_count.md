# Database Migration Required: Add limit_count Parameter to get_all_prayers

## Summary
The `get_all_prayers` RPC function needs to be updated to accept an optional `limit_count` parameter for server-side result limiting, improving mobile performance.

## Current State
- Function signature: `get_all_prayers()` (no parameters)
- Returns all prayers, filtered by status
- Client-side limiting is applied in TypeScript after data transfer

## Proposed Change
- Function signature: `get_all_prayers(limit_count INTEGER DEFAULT 1000)`
- Server-side limiting with SQL `LIMIT` clause
- Backwards compatible via default parameter value

## Required SQL Migration

```sql
-- =====================================================================================
-- PRAYERMAP: ADD LIMIT PARAMETER TO get_all_prayers FUNCTION
-- =====================================================================================
--
-- Enhancement: Add optional limit_count parameter for server-side result limiting
-- This improves mobile performance by reducing data transfer.
--
-- Changes:
-- - Add limit_count parameter with default value of 1000
-- - Add LIMIT clause to SELECT query
-- - Maintains backwards compatibility (default parameter)
--
-- =====================================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_all_prayers();

-- Create updated function with limit_count parameter
CREATE OR REPLACE FUNCTION get_all_prayers(limit_count INTEGER DEFAULT 1000)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  location TEXT,
  user_name TEXT,
  is_anonymous BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.content_type::TEXT,
    p.media_url,
    ST_AsText(p.location::geometry) as location,
    -- Respect is_anonymous flag - return NULL for user_name when anonymous
    CASE
      WHEN p.is_anonymous THEN NULL
      ELSE p.user_name
    END as user_name,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    p.status
  FROM prayers p
  WHERE
    -- Filter out only hidden/removed prayers (moderated content)
    (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'))
    -- Users can see their own prayers regardless of status
    OR p.user_id = auth.uid()
  ORDER BY p.created_at DESC
  LIMIT limit_count;  -- NEW: Server-side limiting
$$;

-- Grant execute permissions to all users (authenticated and anonymous)
GRANT EXECUTE ON FUNCTION get_all_prayers(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers(INTEGER) TO anon;

-- Also grant for the no-parameter version (backwards compatibility)
GRANT EXECUTE ON FUNCTION get_all_prayers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers() TO anon;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- The get_all_prayers function now supports an optional limit_count parameter:
-- - Default: 1000 prayers (if no parameter provided)
-- - Backwards compatible: Can still call get_all_prayers() without parameters
-- - Performance: Reduces data transfer for mobile clients
--
-- Example usage:
--   SELECT * FROM get_all_prayers();         -- Returns up to 1000 prayers (default)
--   SELECT * FROM get_all_prayers(500);      -- Returns up to 500 prayers
--   SELECT * FROM get_all_prayers(100);      -- Returns up to 100 prayers
-- =====================================================================================
```

## TypeScript Changes (Already Implemented)

The TypeScript service (`/home/user/prayermap/src/services/prayerService.ts`) has been updated to:
1. Pass the `limit_count` parameter when calling the RPC function
2. Remove client-side `.slice()` limiting (server handles it now)
3. Maintain client-side filtering for moderated prayers (still needed for RLS edge cases)

## Performance Impact

**Before:**
- Database returns ALL prayers (potentially thousands)
- Data transferred over network (potentially hundreds of KB)
- Client-side slicing discards excess data

**After:**
- Database returns only requested number of prayers
- Minimal data transfer (only what's needed)
- Better mobile performance and battery life

## Backwards Compatibility

✅ **Fully backwards compatible**
- Default parameter value of 1000 means existing calls without parameters still work
- No breaking changes to existing code
- TypeScript service can immediately use the parameter once migration is applied

## Testing Plan

After applying this migration:

1. **Test without parameter:**
   ```sql
   SELECT * FROM get_all_prayers();
   -- Should return up to 1000 prayers (default)
   ```

2. **Test with parameter:**
   ```sql
   SELECT * FROM get_all_prayers(100);
   -- Should return exactly 100 prayers (or fewer if less exist)
   ```

3. **Test TypeScript integration:**
   - Verify `fetchAllPrayers(500)` returns at most 500 prayers
   - Verify mobile app loads faster with reduced data transfer
   - Check browser network tab for reduced payload size

## Related Files

- **TypeScript Service:** `/home/user/prayermap/src/services/prayerService.ts` (updated)
- **Current SQL Function:** `/home/user/prayermap/supabase/migrations/20251129150636_fix_anonymous_display_manual.sql`
- **Migration File to Create:** `supabase/migrations/[timestamp]_add_limit_to_get_all_prayers.sql`

## Approval Required

This migration needs approval before being applied to:
- [ ] Development database
- [ ] Staging database
- [ ] Production database

## Additional Consideration

The `get_all_connections` function could benefit from a similar enhancement:
```sql
CREATE OR REPLACE FUNCTION get_all_connections(limit_count INTEGER DEFAULT 500)
```

This is not critical but would provide the same performance benefits for prayer connections.
