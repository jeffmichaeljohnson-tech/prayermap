-- Verify Datadog User Permissions
-- Run this in Supabase SQL Editor to check if datadog user is set up correctly

-- 1. Check if user exists
SELECT 
    usename,
    usecreatedb,
    usesuper,
    userepl
FROM pg_user 
WHERE usename = 'datadog';

-- 2. Check granted roles
SELECT 
    r.rolname as role,
    m.rolname as member
FROM pg_roles r
JOIN pg_auth_members am ON r.oid = am.roleid
JOIN pg_roles m ON am.member = m.oid
WHERE m.rolname = 'datadog';

-- 3. Test if user can read statistics (this is what Datadog needs)
-- Note: You need to run this as the datadog user to fully test,
-- but this shows what permissions should exist
SELECT 
    has_database_privilege('datadog', 'postgres', 'CONNECT') as can_connect,
    has_schema_privilege('datadog', 'public', 'USAGE') as can_use_schema;

-- 4. Check table permissions
SELECT 
    schemaname,
    tablename,
    has_table_privilege('datadog', schemaname||'.'||tablename, 'SELECT') as can_select
FROM pg_tables 
WHERE schemaname = 'public'
LIMIT 5;

