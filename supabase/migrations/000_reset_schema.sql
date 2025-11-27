-- ============================================================================
-- PrayerMap Schema Reset
-- Run this BEFORE 001_initial_schema.sql if tables already exist
-- WARNING: This will DELETE all existing data!
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_prayers_updated ON prayers;
DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;

-- Drop functions
DROP FUNCTION IF EXISTS get_prayers_within_radius;
DROP FUNCTION IF EXISTS get_active_connections;
DROP FUNCTION IF EXISTS handle_new_user;
DROP FUNCTION IF EXISTS update_updated_at;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS prayer_connections CASCADE;
DROP TABLE IF EXISTS prayer_responses CASCADE;
DROP TABLE IF EXISTS prayers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop types
DROP TYPE IF EXISTS content_type CASCADE;

-- Note: Don't drop extensions (postgis, uuid-ossp) as they may be used elsewhere

-- ============================================================================
-- Now you can run 001_initial_schema.sql
-- ============================================================================
