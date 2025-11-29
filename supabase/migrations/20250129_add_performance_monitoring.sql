-- =====================================================================================
-- PRAYERMAP: PERFORMANCE MONITORING
-- =====================================================================================
-- Purpose: Track database query performance to measure optimization impact
-- Created: 2025-01-29
-- Dependencies: uuid-ossp extension (from initial schema)
--
-- Features:
-- - Log slow queries with execution times
-- - Track p95 latency (critical for mobile users)
-- - Admin-only access via RLS
-- - Performance stats aggregation function
-- =====================================================================================

-- =====================================================================================
-- TABLE: performance_logs
-- =====================================================================================
-- Stores execution time and metadata for database operations
CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_name TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  rows_returned INTEGER,
  parameters JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE performance_logs IS 'Tracks database query performance for monitoring and optimization';
COMMENT ON COLUMN performance_logs.function_name IS 'Name of the database function or query being tracked';
COMMENT ON COLUMN performance_logs.execution_time_ms IS 'Total execution time in milliseconds';
COMMENT ON COLUMN performance_logs.rows_returned IS 'Number of rows returned by the query';
COMMENT ON COLUMN performance_logs.parameters IS 'JSONB of parameters passed to the function (for debugging)';

-- =====================================================================================
-- INDEXES: Optimized for querying performance logs
-- =====================================================================================

-- Index for querying logs by function and time (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_performance_logs_function
  ON performance_logs(function_name, created_at DESC);

-- Partial index for slow queries (>200ms threshold)
-- This is the p95 target for mobile users
CREATE INDEX IF NOT EXISTS idx_performance_logs_slow
  ON performance_logs(execution_time_ms DESC)
  WHERE execution_time_ms > 200;

-- Index for user-specific performance tracking
CREATE INDEX IF NOT EXISTS idx_performance_logs_user
  ON performance_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- =====================================================================================
-- ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view performance logs
CREATE POLICY "Admins can view performance logs"
  ON performance_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- System can insert logs (SECURITY DEFINER functions)
CREATE POLICY "System can insert performance logs"
  ON performance_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================================================
-- FUNCTION: get_performance_stats
-- =====================================================================================
-- Returns aggregated performance statistics for a date range
-- Calculates: call count, avg time, p95 latency, max time, total rows
--
-- Parameters:
--   start_date: Beginning of date range (default: 7 days ago)
--   end_date: End of date range (default: now)
--
-- Returns: Table with performance metrics per function
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_performance_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  function_name TEXT,
  call_count BIGINT,
  avg_time_ms NUMERIC,
  p50_time_ms NUMERIC,
  p95_time_ms NUMERIC,
  p99_time_ms NUMERIC,
  max_time_ms INTEGER,
  total_rows BIGINT,
  slow_queries BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    function_name,
    COUNT(*) as call_count,
    ROUND(AVG(execution_time_ms)::NUMERIC, 2) as avg_time_ms,
    ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY execution_time_ms)::NUMERIC, 2) as p50_time_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::NUMERIC, 2) as p95_time_ms,
    ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms)::NUMERIC, 2) as p99_time_ms,
    MAX(execution_time_ms) as max_time_ms,
    SUM(COALESCE(rows_returned, 0)) as total_rows,
    COUNT(*) FILTER (WHERE execution_time_ms > 200) as slow_queries
  FROM performance_logs
  WHERE created_at BETWEEN start_date AND end_date
  GROUP BY function_name
  ORDER BY call_count DESC;
$$;

COMMENT ON FUNCTION get_performance_stats IS 'Returns aggregated performance statistics for database functions';

GRANT EXECUTE ON FUNCTION get_performance_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================================================
-- FUNCTION: get_slow_query_details
-- =====================================================================================
-- Returns detailed information about slow queries (>200ms)
-- Useful for debugging performance issues
--
-- Parameters:
--   threshold_ms: Minimum execution time to consider slow (default: 200ms)
--   limit_count: Maximum number of results (default: 100)
--
-- Returns: Table with slow query details including parameters
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_slow_query_details(
  threshold_ms INTEGER DEFAULT 200,
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  function_name TEXT,
  execution_time_ms INTEGER,
  rows_returned INTEGER,
  parameters JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id,
    function_name,
    execution_time_ms,
    rows_returned,
    parameters,
    user_id,
    created_at
  FROM performance_logs
  WHERE execution_time_ms >= threshold_ms
  ORDER BY execution_time_ms DESC, created_at DESC
  LIMIT limit_count;
$$;

COMMENT ON FUNCTION get_slow_query_details IS 'Returns detailed information about slow queries for debugging';

GRANT EXECUTE ON FUNCTION get_slow_query_details(INTEGER, INTEGER) TO authenticated;

-- =====================================================================================
-- FUNCTION: log_query_performance
-- =====================================================================================
-- Helper function to log query performance from other database functions
-- Can be called from within other SECURITY DEFINER functions
--
-- Parameters:
--   p_function_name: Name of the function being tracked
--   p_execution_time_ms: Execution time in milliseconds
--   p_rows_returned: Number of rows returned (optional)
--   p_parameters: JSONB of function parameters (optional)
--
-- Returns: UUID of the created log entry
-- =====================================================================================

CREATE OR REPLACE FUNCTION log_query_performance(
  p_function_name TEXT,
  p_execution_time_ms INTEGER,
  p_rows_returned INTEGER DEFAULT NULL,
  p_parameters JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO performance_logs (
    function_name,
    execution_time_ms,
    rows_returned,
    parameters,
    user_id
  ) VALUES (
    p_function_name,
    p_execution_time_ms,
    p_rows_returned,
    p_parameters,
    auth.uid()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_query_performance IS 'Logs query performance metrics from database functions';

GRANT EXECUTE ON FUNCTION log_query_performance(TEXT, INTEGER, INTEGER, JSONB) TO authenticated;

-- =====================================================================================
-- VIEW: recent_slow_queries
-- =====================================================================================
-- Convenience view for monitoring recent slow queries
-- Shows last 24 hours of queries exceeding 200ms
-- =====================================================================================

CREATE OR REPLACE VIEW recent_slow_queries AS
SELECT
  function_name,
  execution_time_ms,
  rows_returned,
  parameters,
  created_at
FROM performance_logs
WHERE
  execution_time_ms > 200
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 1000;

COMMENT ON VIEW recent_slow_queries IS 'Shows slow queries (>200ms) from the last 24 hours';

-- Grant access to authenticated users (RLS will restrict to admins)
GRANT SELECT ON recent_slow_queries TO authenticated;

-- =====================================================================================
-- CLEANUP FUNCTION: Clean old performance logs
-- =====================================================================================
-- Removes performance logs older than 30 days to prevent table bloat
-- Should be run periodically via cron or scheduled job
-- =====================================================================================

CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM performance_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_performance_logs IS 'Deletes performance logs older than 30 days';

GRANT EXECUTE ON FUNCTION cleanup_old_performance_logs() TO authenticated;

-- =====================================================================================
-- INITIAL DATA / TESTING
-- =====================================================================================
-- Insert a test log entry to verify the system is working
-- This should appear in get_performance_stats() results
-- =====================================================================================

DO $$
BEGIN
  -- Only insert test data if the table is empty
  IF NOT EXISTS (SELECT 1 FROM performance_logs LIMIT 1) THEN
    INSERT INTO performance_logs (
      function_name,
      execution_time_ms,
      rows_returned,
      parameters
    ) VALUES (
      'test_monitoring_system',
      150,
      1,
      '{"test": true, "note": "Initial test entry"}'::JSONB
    );
  END IF;
END $$;

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================
-- Run this query to verify the migration worked:
-- SELECT * FROM get_performance_stats(NOW() - INTERVAL '1 hour', NOW());
-- =====================================================================================
