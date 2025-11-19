-- Verification queries for PrayerMap schema v2.0
-- Run these after applying docs/prayermap_schema_v2.sql

-- 1. Check PostGIS extension is enabled
SELECT * FROM pg_extension WHERE extname = 'postgis';

-- 2. Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 
    'prayers', 
    'prayer_responses', 
    'prayer_support', 
    'notifications', 
    'prayer_flags'
  )
ORDER BY table_name;

-- 3. Check RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 
    'prayers', 
    'prayer_responses', 
    'prayer_support', 
    'notifications', 
    'prayer_flags'
  )
ORDER BY tablename;

-- 4. Check RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Check critical indexes exist
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%location%' OR
    indexname LIKE '%prayer%' OR
    indexname LIKE '%user%'
  )
ORDER BY tablename, indexname;

-- 6. Check PostGIS function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_prayers_within_radius';

-- 7. Check custom types exist
SELECT typname 
FROM pg_type 
WHERE typname IN ('media_type', 'prayer_status', 'notification_type')
ORDER BY typname;

-- Expected Results:
-- ✅ PostGIS extension: 1 row
-- ✅ Tables: 6 tables (users, prayers, prayer_responses, prayer_support, notifications, prayer_flags)
-- ✅ RLS enabled: All 6 tables should show rls_enabled = true
-- ✅ RLS policies: Should have multiple policies per table
-- ✅ Indexes: Should include prayers_location_gist_idx (critical for performance)
-- ✅ Function: get_prayers_within_radius should exist
-- ✅ Types: 3 custom types should exist

