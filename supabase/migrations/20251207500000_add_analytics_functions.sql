-- ============================================
-- ANALYTICS FUNCTIONS FOR ADMIN DASHBOARD
-- Created: 2025-12-07
-- Purpose: Provide aggregate statistics for admin analytics
-- 
-- This migration adds:
--   1. get_active_users_count - Count users who created prayers or responses
--   2. get_daily_activity - Daily prayer/response counts for charts
--
-- NOTE: These functions use SECURITY DEFINER to allow admin access
-- ============================================

-- ============================================
-- 1. GET ACTIVE USERS COUNT
-- ============================================
-- Returns the count of unique users who have created prayers or responses
-- within the specified time period.

CREATE OR REPLACE FUNCTION get_active_users_count(start_date TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id)::INTEGER INTO active_count
  FROM (
    -- Users who created prayers
    SELECT user_id 
    FROM prayers 
    WHERE created_at >= start_date
    
    UNION
    
    -- Users who responded to prayers
    SELECT responder_id AS user_id 
    FROM prayer_responses 
    WHERE created_at >= start_date
  ) AS active_users;
  
  RETURN COALESCE(active_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_active_users_count(TIMESTAMP WITH TIME ZONE) IS 
  'Returns count of unique users who created prayers or responses since start_date';

-- ============================================
-- 2. GET DAILY ACTIVITY
-- ============================================
-- Returns daily counts of prayers and responses for charting.
-- Generates a complete date series to ensure no gaps in the chart.

CREATE OR REPLACE FUNCTION get_daily_activity(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  date DATE,
  prayers BIGINT,
  responses BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    -- Generate a complete series of dates
    SELECT generate_series(
      start_date::date, 
      end_date::date, 
      '1 day'::interval
    )::date AS date
  ),
  prayer_counts AS (
    -- Count prayers per day
    SELECT 
      created_at::date AS date, 
      COUNT(*) AS count
    FROM prayers
    WHERE created_at >= start_date 
      AND created_at <= end_date
      AND archived_at IS NULL
    GROUP BY created_at::date
  ),
  response_counts AS (
    -- Count responses per day
    SELECT 
      created_at::date AS date, 
      COUNT(*) AS count
    FROM prayer_responses
    WHERE created_at >= start_date 
      AND created_at <= end_date
    GROUP BY created_at::date
  )
  SELECT
    d.date,
    COALESCE(p.count, 0) AS prayers,
    COALESCE(r.count, 0) AS responses
  FROM dates d
  LEFT JOIN prayer_counts p ON d.date = p.date
  LEFT JOIN response_counts r ON d.date = r.date
  ORDER BY d.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_daily_activity(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 
  'Returns daily prayer and response counts between start_date and end_date';

-- ============================================
-- 3. GRANT PERMISSIONS
-- ============================================
-- Grant execute permissions to authenticated users
-- (Admin check is done at application level)

GRANT EXECUTE ON FUNCTION get_active_users_count(TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_activity(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Also grant to anon for admin dashboard that may not have auth context in some cases
GRANT EXECUTE ON FUNCTION get_active_users_count(TIMESTAMP WITH TIME ZONE) TO anon;
GRANT EXECUTE ON FUNCTION get_daily_activity(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO anon;

