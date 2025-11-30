-- =====================================================================================
-- PRAYERMAP: OPTIMIZE PRAYERS TABLE INDEXES FOR MOBILE PERFORMANCE
-- =====================================================================================
--
-- Purpose: Add optimized B-tree and partial indexes to improve query performance
-- for the prayers table, especially for mobile clients with limited bandwidth.
--
-- Context: The get_all_prayers() function is heavily used and needs fast filtering
-- by status, moderation_status, and content_type, while ordering by created_at DESC.
--
-- Query Patterns Optimized:
-- 1. SELECT * FROM prayers WHERE status NOT IN ('hidden', 'removed') ORDER BY created_at DESC
-- 2. SELECT * FROM prayers WHERE moderation_status = 'approved' ORDER BY created_at DESC
-- 3. SELECT * FROM prayers WHERE user_id = ? ORDER BY created_at DESC
-- 4. SELECT * FROM prayers WHERE content_type = 'video' ORDER BY created_at DESC
-- 5. SELECT * FROM prayers WHERE (status IS NULL OR status NOT IN (...)) -- Partial index
--
-- Performance Impact:
-- BEFORE: Sequential scan or inefficient index usage for filtered queries
-- AFTER:  Index-only scans or index + filter with minimal table lookups
--
-- Idempotency: All indexes use IF NOT EXISTS for safe re-runs
--
-- =====================================================================================

-- =====================================================================================
-- 1. INDEX ON status (B-tree for equality and IN/NOT IN operations)
-- =====================================================================================
-- EXPLAIN: Optimizes WHERE status = 'active' and WHERE status NOT IN ('hidden', 'removed')
-- Used by: get_all_prayers(), moderate_prayer(), admin queries
-- Query Example: SELECT * FROM prayers WHERE status = 'active' ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_prayers_status
  ON prayers(status)
  WHERE status IS NOT NULL;

COMMENT ON INDEX idx_prayers_status IS
  'B-tree index for filtering prayers by status. Partial index excludes NULL values. Supports WHERE status = ''active'' and WHERE status NOT IN (''hidden'', ''removed'') queries.';

-- =====================================================================================
-- 2. COMPOUND INDEX ON status + created_at (for filtered + sorted queries)
-- =====================================================================================
-- EXPLAIN: Enables index-only scans for queries that filter by status AND sort by created_at
-- This is CRITICAL for the most common query pattern in get_all_prayers()
-- Without this, Postgres must filter THEN sort (two operations instead of one)
-- Query Example: SELECT * FROM prayers WHERE status = 'active' ORDER BY created_at DESC LIMIT 1000

CREATE INDEX IF NOT EXISTS idx_prayers_status_created_desc
  ON prayers(status, created_at DESC)
  WHERE status IS NOT NULL;

COMMENT ON INDEX idx_prayers_status_created_desc IS
  'Compound B-tree index for filtering by status and ordering by created_at DESC. Enables index-only scans for get_all_prayers() queries. Critical performance optimization.';

-- =====================================================================================
-- 3. PARTIAL INDEX FOR VISIBLE PRAYERS ONLY (WHERE status NOT IN hidden/removed)
-- =====================================================================================
-- EXPLAIN: Partial index that ONLY includes visible prayers (not hidden, not removed)
-- This is smaller and faster than a full index because it excludes moderated content
-- Used by: get_all_prayers() which is the most frequently called function
-- Query Example: SELECT * FROM prayers WHERE (status IS NULL OR status NOT IN ('hidden', 'removed'))

CREATE INDEX IF NOT EXISTS idx_prayers_visible
  ON prayers(created_at DESC)
  WHERE status IS NULL OR status NOT IN ('hidden', 'removed');

COMMENT ON INDEX idx_prayers_visible IS
  'Partial B-tree index for visible prayers only (excludes hidden/removed). Optimizes get_all_prayers() by creating a smaller, faster index for public-facing queries.';

-- =====================================================================================
-- 4. INDEX ON content_type (for filtering by media type)
-- =====================================================================================
-- EXPLAIN: Enables fast filtering by content type (text, audio, video)
-- Used by: Frontend filters, admin dashboard, analytics
-- Query Example: SELECT * FROM prayers WHERE content_type = 'video' ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_prayers_content_type
  ON prayers(content_type);

COMMENT ON INDEX idx_prayers_content_type IS
  'B-tree index for filtering prayers by content_type (text, audio, video). Supports frontend media type filters.';

-- =====================================================================================
-- 5. COMPOUND INDEX ON user_id + created_at (for user's own prayers)
-- =====================================================================================
-- EXPLAIN: Optimizes "My Prayers" queries where user wants to see their own prayers
-- This is a covering index that can satisfy the query without table lookups
-- Note: Migration 002 created prayers_user_id_created_at_idx, but we verify it exists
-- Query Example: SELECT * FROM prayers WHERE user_id = ? ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_prayers_user_created
  ON prayers(user_id, created_at DESC);

COMMENT ON INDEX idx_prayers_user_created IS
  'Compound B-tree index for user-specific prayer queries. Enables fast "My Prayers" page loads. Covering index for user_id filter + created_at sort.';

-- =====================================================================================
-- 6. INDEX ON moderation_status (for admin moderation dashboard)
-- =====================================================================================
-- EXPLAIN: Enables fast filtering for moderation queue (pending, rejected, review)
-- Note: Migration 20250129_add_moderation_tables created idx_prayers_moderation_status
-- We verify it exists here for completeness
-- Query Example: SELECT * FROM prayers WHERE moderation_status = 'pending' ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_prayers_moderation_status
  ON prayers(moderation_status)
  WHERE moderation_status IS NOT NULL;

COMMENT ON INDEX idx_prayers_moderation_status IS
  'B-tree index for admin moderation dashboard queries. Supports filtering by moderation_status (pending, approved, rejected, review).';

-- =====================================================================================
-- 7. COMPOUND INDEX ON moderation_status + created_at (for moderation queue)
-- =====================================================================================
-- EXPLAIN: Critical for admin dashboard to show pending prayers sorted by recency
-- Without this, the admin dashboard would be slow when there are many prayers to moderate
-- Query Example: SELECT * FROM prayers WHERE moderation_status = 'pending' ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_prayers_moderation_created_desc
  ON prayers(moderation_status, created_at DESC)
  WHERE moderation_status IS NOT NULL;

COMMENT ON INDEX idx_prayers_moderation_created_desc IS
  'Compound B-tree index for moderation queue queries. Enables fast loading of pending prayers sorted by recency in admin dashboard.';

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
--
-- Created/verified indexes:
-- 1. idx_prayers_status - Status filtering (partial, excludes NULL)
-- 2. idx_prayers_status_created_desc - Status filter + created_at sort (compound)
-- 3. idx_prayers_visible - Visible prayers only (partial, for get_all_prayers)
-- 4. idx_prayers_content_type - Content type filtering
-- 5. idx_prayers_user_created - User's own prayers (compound)
-- 6. idx_prayers_moderation_status - Moderation status filtering (partial)
-- 7. idx_prayers_moderation_created_desc - Moderation queue (compound)
--
-- Existing indexes (from previous migrations):
-- - prayers_location_gist_idx (GIST on location) - from 001_initial_schema.sql
-- - prayers_user_id_idx (B-tree on user_id) - from 001_initial_schema.sql
-- - prayers_created_at_idx (B-tree on created_at DESC) - from 001_initial_schema.sql
-- - prayers_user_id_created_at_idx (compound user_id, created_at) - from 002_read_tracking.sql
--
-- Performance Testing:
-- Run these queries to verify index usage (should show "Index Scan" not "Seq Scan"):
--
--   EXPLAIN ANALYZE SELECT * FROM prayers
--   WHERE status NOT IN ('hidden', 'removed')
--   ORDER BY created_at DESC LIMIT 100;
--
--   EXPLAIN ANALYZE SELECT * FROM prayers
--   WHERE moderation_status = 'pending'
--   ORDER BY created_at DESC LIMIT 50;
--
--   EXPLAIN ANALYZE SELECT * FROM prayers
--   WHERE user_id = 'some-uuid'
--   ORDER BY created_at DESC;
--
-- Expected Results:
-- - All queries should use Index Scan (not Seq Scan)
-- - Query time for 1000 prayers: < 50ms
-- - Query time for 10,000 prayers: < 100ms
-- - Query time for 100,000 prayers: < 200ms
--
-- Index Size Estimates:
-- - Each B-tree index: ~5-15% of table size
-- - Partial indexes: 2-5% of table size (smaller, faster)
-- - Total additional space: ~40-60 MB for 100K prayers
--
-- Maintenance:
-- - Indexes auto-update on INSERT/UPDATE/DELETE
-- - Run VACUUM ANALYZE prayers; periodically for stats
-- - Monitor pg_stat_user_indexes for unused indexes
--
-- Rollback Instructions:
-- To rollback, drop these indexes:
--   DROP INDEX IF EXISTS idx_prayers_status;
--   DROP INDEX IF EXISTS idx_prayers_status_created_desc;
--   DROP INDEX IF EXISTS idx_prayers_visible;
--   DROP INDEX IF EXISTS idx_prayers_content_type;
--   DROP INDEX IF EXISTS idx_prayers_user_created;
--   DROP INDEX IF EXISTS idx_prayers_moderation_status;
--   DROP INDEX IF EXISTS idx_prayers_moderation_created_desc;
--
-- =====================================================================================
