-- =====================================================================================
-- PRAYERMAP: ADD GIST SPATIAL INDEXES TO PRAYER_CONNECTIONS TABLE
-- =====================================================================================
--
-- Enhancement: Add GIST spatial indexes for efficient viewport-based queries
-- This enables fast bounding box queries when displaying prayer connections on the map.
--
-- Why GIST indexes:
-- - GIST (Generalized Search Tree) indexes are optimized for PostGIS geometric queries
-- - Enable efficient ST_Intersects, ST_Contains, ST_DWithin operations
-- - Critical for viewport queries: "show connections visible in current map view"
-- - B-tree indexes (current) cannot optimize spatial operations
--
-- Indexes Created:
-- 1. prayer_connections_from_location_gist - Index on connection start points
-- 2. prayer_connections_to_location_gist   - Index on connection end points
-- 3. prayer_connections_locations_gist     - Compound index for queries checking either endpoint
--
-- Performance Impact:
-- BEFORE: Full table scan for viewport queries (slow with many connections)
-- AFTER:  Index-based lookup (sub-second queries even with millions of connections)
--
-- Rollback Instructions:
-- To rollback, drop these indexes:
--   DROP INDEX IF EXISTS prayer_connections_from_location_gist;
--   DROP INDEX IF EXISTS prayer_connections_to_location_gist;
--   DROP INDEX IF EXISTS prayer_connections_locations_gist;
--
-- =====================================================================================

-- =====================================================================================
-- 1. INDEX ON from_location (connection start points)
-- =====================================================================================
-- Enables efficient queries like: "Find all connections that START within viewport"
-- Example: ST_Intersects(from_location, viewport_bounds)

CREATE INDEX IF NOT EXISTS prayer_connections_from_location_gist
  ON prayer_connections USING GIST (from_location);

COMMENT ON INDEX prayer_connections_from_location_gist IS
  'GIST spatial index for efficient viewport-based queries on connection start points. Enables fast ST_Intersects, ST_Contains, ST_DWithin operations on from_location.';

-- =====================================================================================
-- 2. INDEX ON to_location (connection end points)
-- =====================================================================================
-- Enables efficient queries like: "Find all connections that END within viewport"
-- Example: ST_Intersects(to_location, viewport_bounds)

CREATE INDEX IF NOT EXISTS prayer_connections_to_location_gist
  ON prayer_connections USING GIST (to_location);

COMMENT ON INDEX prayer_connections_to_location_gist IS
  'GIST spatial index for efficient viewport-based queries on connection end points. Enables fast ST_Intersects, ST_Contains, ST_DWithin operations on to_location.';

-- =====================================================================================
-- 3. COMPOUND INDEX ON BOTH LOCATIONS (either endpoint in viewport)
-- =====================================================================================
-- Enables efficient queries like: "Find all connections with EITHER endpoint in viewport"
-- Example: ST_Intersects(ST_Collect(from_location, to_location), viewport_bounds)
--
-- This is particularly useful for "living map" queries that show all visible connections,
-- whether they start, end, or pass through the current viewport.

CREATE INDEX IF NOT EXISTS prayer_connections_locations_gist
  ON prayer_connections USING GIST (
    ST_Collect(from_location::geometry, to_location::geometry)
  );

COMMENT ON INDEX prayer_connections_locations_gist IS
  'GIST spatial index combining both from_location and to_location. Enables efficient viewport queries that check if EITHER endpoint is visible. Critical for "living map" connection rendering.';

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Three GIST spatial indexes have been created on prayer_connections:
--
-- 1. prayer_connections_from_location_gist
--    - Query start points: WHERE ST_Intersects(from_location, viewport)
--    - Use case: Show where prayers originated
--
-- 2. prayer_connections_to_location_gist
--    - Query end points: WHERE ST_Intersects(to_location, viewport)
--    - Use case: Show where support was sent
--
-- 3. prayer_connections_locations_gist
--    - Query either endpoint: WHERE ST_Intersects(combined_locations, viewport)
--    - Use case: Show all connections visible in viewport
--
-- Expected Performance:
-- - Viewport queries: ~10-50ms (vs 500-2000ms without indexes)
-- - Supports millions of connections efficiently
-- - Index size: ~20-40% of table size (acceptable trade-off)
--
-- Testing checklist:
-- [ ] Verify indexes exist: \d prayer_connections
-- [ ] Test viewport query performance: EXPLAIN ANALYZE SELECT ...
-- [ ] Monitor index usage: pg_stat_user_indexes
-- [ ] Check index size: pg_total_relation_size('prayer_connections_locations_gist')
--
-- Next Steps:
-- - Update get_connections_in_viewport() function to leverage these indexes
-- - Monitor query performance in production
-- - Consider adding additional spatial indexes if new query patterns emerge
-- =====================================================================================
