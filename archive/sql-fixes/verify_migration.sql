-- =====================================================================================
-- MIGRATION VERIFICATION QUERIES
-- Run these in Supabase SQL Editor after applying the migration
-- =====================================================================================

-- 1. Check users without profiles (should be 0 after migration)
SELECT COUNT(*) as users_without_profiles 
FROM auth.users u 
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- 2. Check profiles with 'Anonymous' that could have real names (should be 0 after migration)
SELECT COUNT(*) as anonymous_profiles_with_metadata
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.display_name = 'Anonymous'
AND (u.raw_user_meta_data->>'name' IS NOT NULL OR u.raw_user_meta_data->>'display_name' IS NOT NULL);

-- 3. Check prayers with NULL user_name for non-anonymous prayers (should be 0 after migration)
SELECT COUNT(*) as prayers_missing_username
FROM prayers pr
JOIN profiles p ON pr.user_id = p.id
WHERE pr.is_anonymous = false
AND (pr.user_name IS NULL OR pr.user_name = 'Anonymous')
AND p.display_name != 'Anonymous';

-- 4. Check the specific test prayer that was reported
SELECT 
    p.id,
    p.title,
    p.user_name,
    p.is_anonymous,
    prof.display_name as profile_name,
    u.raw_user_meta_data->>'name' as metadata_name,
    u.raw_user_meta_data->>'display_name' as metadata_display_name
FROM prayers p
JOIN profiles prof ON p.user_id = prof.id
JOIN auth.users u ON p.user_id = u.id
WHERE p.id = '09081464-157c-4813-97dd-a716c0724b36';

-- 5. Sample check: Show first 10 non-anonymous prayers with their names
SELECT 
    p.id,
    p.title,
    p.user_name,
    p.is_anonymous,
    prof.display_name as profile_name
FROM prayers p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.is_anonymous = false
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. Check if trigger function was updated correctly
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 7. Check if create_prayer function was updated correctly
SELECT proname, proargnames, prosrc 
FROM pg_proc 
WHERE proname = 'create_prayer';