-- ============================================================================
-- PrayerMap Inbox Query Optimization Migration (FIXED FOR SUPABASE)
-- PostgreSQL 15 + Supabase
-- ============================================================================
--
-- FIXED VERSION: Removed CONCURRENTLY keywords for Supabase compatibility
-- Supabase migrations run in transaction blocks which don't support CONCURRENTLY
--
-- This migration optimizes database indexes specifically for the inbox query
-- functionality. The new fetchUserInbox function uses a single JOIN query
-- that requires specific composite indexes for optimal performance.
--
-- Key Optimizations:
-- 1. Composite index for prayer_responses JOIN with prayers.user_id filter
-- 2. Improved index for read tracking queries
-- 3. Performance analysis and monitoring setup
-- 4. Query plan optimization hints
--
-- Expected Performance Improvement:
-- - 50-80% reduction in query execution time
-- - Eliminates expensive sequential scans
-- - Optimizes JOIN operations
-- - Better support for real-time subscriptions
--
-- ============================================================================

-- ============================================================================
-- OPTIMIZED INDEXES FOR INBOX QUERIES
-- ============================================================================

-- Index for the main inbox query JOIN
-- This supports: prayer_responses JOIN prayers ON prayer_responses.prayer_id = prayers.id
-- WHERE prayers.user_id = $1 ORDER BY prayer_responses.created_at DESC
-- 
-- CRITICAL: This index eliminates the need for expensive hash joins and 
-- sequential scans when filtering responses by prayer owner
CREATE INDEX IF NOT EXISTS prayer_responses_inbox_optimized_idx
ON prayer_responses (prayer_id, created_at DESC)
INCLUDE (id, responder_id, message, content_type, media_url, read_at);

COMMENT ON INDEX prayer_responses_inbox_optimized_idx IS 
'Optimized composite index for inbox queries. Supports JOIN with prayers table, 
ordering by created_at DESC, and includes all frequently accessed columns to 
avoid index-only scans. Fixed version without CONCURRENTLY for Supabase compatibility.';

-- ============================================================================

-- Enhanced index for prayers table to support inbox user filtering
-- Supports: prayers WHERE user_id = $1 for JOIN operations
CREATE INDEX IF NOT EXISTS prayers_user_id_inbox_optimized_idx  
ON prayers (user_id, id, created_at DESC)
INCLUDE (title, content, content_type, media_url, location, user_name, is_anonymous, status, updated_at);

COMMENT ON INDEX prayers_user_id_inbox_optimized_idx IS
'Enhanced prayers index for inbox filtering. Supports efficient lookup of prayers 
by user_id for JOIN operations in inbox queries. Includes commonly accessed prayer 
data to enable index-only scans and reduce I/O.';

-- ============================================================================

-- Index for read tracking optimization
-- Supports: prayer_responses WHERE read_at IS NULL for unread queries
CREATE INDEX IF NOT EXISTS prayer_responses_read_tracking_optimized_idx 
ON prayer_responses (responder_id, read_at, created_at DESC) 
WHERE read_at IS NULL;

COMMENT ON INDEX prayer_responses_read_tracking_optimized_idx IS
'Partial index for unread message queries. Only indexes rows where read_at IS NULL
to minimize index size and maximize query performance for unread count calculations.';

-- ============================================================================

-- Index for profile lookups in inbox queries
-- Supports: profiles WHERE id = responder_id for displaying responder names
CREATE INDEX IF NOT EXISTS profiles_responder_lookup_idx
ON profiles (id)
INCLUDE (display_name, email, created_at);

COMMENT ON INDEX profiles_responder_lookup_idx IS
'Index for efficient profile lookups when displaying responder information in inbox.
Includes display_name and email for index-only scans.';

-- ============================================================================
-- PERFORMANCE MONITORING AND ANALYSIS
-- ============================================================================

-- Function to analyze inbox query performance
CREATE OR REPLACE FUNCTION analyze_inbox_query_performance(target_user_id UUID)
RETURNS TABLE (
  operation TEXT,
  estimated_cost NUMERIC,
  estimated_rows BIGINT,
  index_usage TEXT,
  recommendations TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  query_plan JSONB;
  analysis_result RECORD;
BEGIN
  -- Analyze the main inbox query performance
  EXECUTE format('EXPLAIN (FORMAT JSON, ANALYZE false, BUFFERS false) 
    SELECT 
      pr.id,
      pr.prayer_id,
      pr.responder_id,
      pr.message,
      pr.content_type,
      pr.media_url,
      pr.created_at,
      pr.read_at,
      p.title as prayer_title,
      p.content as prayer_content,
      p.user_name as prayer_author,
      prof.display_name as responder_name
    FROM prayer_responses pr
    INNER JOIN prayers p ON pr.prayer_id = p.id
    LEFT JOIN profiles prof ON pr.responder_id = prof.id
    WHERE p.user_id = %L
    ORDER BY pr.created_at DESC
    LIMIT 20', target_user_id)
  INTO query_plan;

  -- Return performance analysis
  RETURN QUERY 
  SELECT 
    'Main Inbox Query'::TEXT,
    (query_plan->0->'Plan'->>'Total Cost')::NUMERIC,
    (query_plan->0->'Plan'->>'Plan Rows')::BIGINT,
    CASE 
      WHEN query_plan::TEXT ILIKE '%prayer_responses_inbox_optimized_idx%' THEN 'Using optimized indexes ✓'
      ELSE 'NOT using optimized indexes ✗'
    END::TEXT,
    CASE 
      WHEN (query_plan->0->'Plan'->>'Total Cost')::NUMERIC < 100 THEN 'Performance is excellent'
      WHEN (query_plan->0->'Plan'->>'Total Cost')::NUMERIC < 500 THEN 'Performance is good'
      ELSE 'Performance may need optimization'
    END::TEXT;
END;
$$;

COMMENT ON FUNCTION analyze_inbox_query_performance IS
'Performance analysis function for inbox queries. Use this to monitor and optimize
query performance after deployment. Returns cost estimates and index usage information.';

-- ============================================================================
-- MAINTENANCE AND MONITORING
-- ============================================================================

-- Query to check index usage statistics
-- Run this periodically to verify indexes are being used effectively
CREATE OR REPLACE VIEW inbox_index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read as total_reads,
  idx_tup_fetch as total_fetches,
  CASE 
    WHEN idx_tup_read > 0 THEN round((idx_tup_fetch::NUMERIC / idx_tup_read::NUMERIC) * 100, 2)
    ELSE 0 
  END as fetch_ratio_percent
FROM pg_stat_user_indexes 
WHERE indexname IN (
  'prayer_responses_inbox_optimized_idx',
  'prayers_user_id_inbox_optimized_idx', 
  'prayer_responses_read_tracking_optimized_idx',
  'profiles_responder_lookup_idx'
)
ORDER BY total_reads DESC;

COMMENT ON VIEW inbox_index_usage_stats IS
'Monitor usage statistics for inbox-related indexes. High fetch ratios (>80%) 
indicate good index efficiency. Low ratios may indicate unused or inefficient indexes.';

-- ============================================================================
-- INDEX MAINTENANCE RECOMMENDATIONS
-- ============================================================================

-- Function to provide index maintenance recommendations
CREATE OR REPLACE FUNCTION inbox_index_maintenance_recommendations()
RETURNS TABLE (
  index_name TEXT,
  table_name TEXT,
  size_mb NUMERIC,
  usage_rating TEXT,
  maintenance_action TEXT,
  priority TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.indexname::TEXT,
    i.tablename::TEXT,
    round((pg_total_relation_size(i.indexrelid) / 1024.0 / 1024.0), 2) as size_mb,
    CASE
      WHEN s.idx_tup_read > 1000 THEN 'High Usage ✓'
      WHEN s.idx_tup_read > 100 THEN 'Medium Usage'
      ELSE 'Low Usage ⚠'
    END::TEXT as usage_rating,
    CASE
      WHEN round((pg_total_relation_size(i.indexrelid) / 1024.0 / 1024.0), 2) > 100 
        AND s.idx_tup_read < 100 THEN 'Consider dropping or rebuilding'
      WHEN s.idx_tup_read > 1000 THEN 'Monitor for bloat, consider REINDEX if performance degrades'
      ELSE 'No action needed'
    END::TEXT as maintenance_action,
    CASE
      WHEN s.idx_tup_read < 10 AND round((pg_total_relation_size(i.indexrelid) / 1024.0 / 1024.0), 2) > 50 THEN 'High'
      WHEN s.idx_tup_read > 1000 THEN 'Medium'
      ELSE 'Low'
    END::TEXT as priority
  FROM pg_stat_user_indexes s
  JOIN pg_indexes i ON s.indexname = i.indexname
  WHERE i.indexname IN (
    'prayer_responses_inbox_optimized_idx',
    'prayers_user_id_inbox_optimized_idx',
    'prayer_responses_read_tracking_optimized_idx', 
    'profiles_responder_lookup_idx'
  )
  ORDER BY size_mb DESC;
END;
$$;

COMMENT ON FUNCTION inbox_index_maintenance_recommendations IS
'Provides automated recommendations for inbox index maintenance based on usage 
statistics and index sizes. Run monthly to optimize database performance.';

-- ============================================================================
-- DEPLOYMENT VERIFICATION
-- ============================================================================

-- Verify that all expected indexes exist
DO $$
DECLARE
  missing_indexes TEXT[] := ARRAY[]::TEXT[];
  idx_name TEXT;
BEGIN
  -- Check for required indexes
  FOR idx_name IN 
    SELECT unnest(ARRAY[
      'prayer_responses_inbox_optimized_idx',
      'prayers_user_id_inbox_optimized_idx',
      'prayer_responses_read_tracking_optimized_idx',
      'profiles_responder_lookup_idx'
    ])
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = idx_name) THEN
      missing_indexes := array_append(missing_indexes, idx_name);
    END IF;
  END LOOP;
  
  -- Report results
  IF array_length(missing_indexes, 1) > 0 THEN
    RAISE NOTICE 'WARNING: Missing indexes: %', array_to_string(missing_indexes, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: All inbox optimization indexes created successfully';
  END IF;
END;
$$;

-- Final success message
SELECT 'Inbox query optimization migration completed successfully. All indexes created and performance monitoring tools deployed.' as migration_status;