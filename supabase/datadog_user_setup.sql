-- ============================================================================
-- Datadog PostgreSQL Monitoring User Setup
-- ============================================================================
-- Purpose: Create read-only user for Datadog Agent to monitor Supabase PostgreSQL
-- 
-- Instructions:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Paste this entire script
-- 3. Replace <STRONG_PASSWORD_HERE> with a secure password
-- 4. Run the script
-- 5. Save the password securely (you'll need it for Datadog Agent config)
-- ============================================================================

-- Step 1: Create datadog user
-- Replace <STRONG_PASSWORD_HERE> with a strong password
CREATE USER datadog WITH PASSWORD '<STRONG_PASSWORD_HERE>';

-- Step 2: Grant monitoring permissions (PostgreSQL 10+)
-- Supabase uses PostgreSQL 15, so pg_monitor role is available
GRANT pg_monitor TO datadog;

-- Step 3: Grant access to database statistics
GRANT SELECT ON pg_stat_database TO datadog;

-- Step 4: Grant access to all existing tables in public schema
-- This allows Datadog to collect table-level metrics
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;

-- Step 5: Grant access to future tables (so new tables are automatically monitored)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datadog;

-- Step 6: Grant access to pg_stat_activity (for query monitoring)
-- This may require additional permissions depending on Supabase configuration
GRANT SELECT ON pg_stat_activity TO datadog;

-- Step 7: Verify user was created
SELECT 
    usename,
    usecreatedb,
    usesuper,
    userepl
FROM pg_user 
WHERE usename = 'datadog';

-- Step 8: Test permissions (should return 1 row)
-- Run this as the datadog user to verify permissions work
-- Note: You'll need to connect as datadog user to fully test
SELECT COUNT(*) as can_read_stats 
FROM pg_stat_database 
LIMIT 1;

-- ============================================================================
-- Verification Queries (Run these after setup)
-- ============================================================================

-- Check user exists
SELECT usename FROM pg_user WHERE usename = 'datadog';

-- Check granted roles
SELECT 
    r.rolname as role,
    m.rolname as member
FROM pg_roles r
JOIN pg_auth_members am ON r.oid = am.roleid
JOIN pg_roles m ON am.member = m.oid
WHERE m.rolname = 'datadog';

-- Check table permissions
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
LIMIT 10;

-- ============================================================================
-- Troubleshooting: If permissions don't work
-- ============================================================================

-- If pg_monitor role doesn't exist (PostgreSQL < 10), use this instead:
-- GRANT SELECT ON pg_stat_database TO datadog;
-- GRANT SELECT ON pg_stat_activity TO datadog;

-- For PostgreSQL 9.6 and below, create SECURITY DEFINER function:
-- CREATE FUNCTION pg_stat_activity() RETURNS SETOF pg_catalog.pg_stat_activity AS
-- $$ SELECT * from pg_catalog.pg_stat_activity; $$
-- LANGUAGE sql VOLATILE SECURITY DEFINER;
-- 
-- CREATE VIEW pg_stat_activity_dd AS SELECT * FROM pg_stat_activity();
-- GRANT SELECT ON pg_stat_activity_dd TO datadog;

-- ============================================================================
-- Security Notes
-- ============================================================================
-- ✅ This user has READ-ONLY access (SELECT only)
-- ✅ Cannot INSERT, UPDATE, DELETE, or DROP anything
-- ✅ Can only read statistics and table data
-- ✅ Safe for monitoring purposes
-- 
-- ⚠️ Remember to:
-- 1. Use a strong password (save it securely)
-- 2. Rotate password periodically
-- 3. Monitor for unusual access patterns
-- 4. Consider IP allowlisting if Supabase supports it
-- ============================================================================

