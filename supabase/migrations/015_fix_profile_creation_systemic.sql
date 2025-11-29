-- =====================================================================================
-- PRAYERMAP: SYSTEMIC FIX FOR PROFILE CREATION ISSUE
-- =====================================================================================
--
-- Root Cause: Frontend was passing user metadata as 'name' but database trigger 
-- was looking for 'display_name', causing all users to be created with 'Anonymous'
--
-- This migration:
-- 1. Updates the trigger to handle both 'name' and 'display_name' keys
-- 2. Migrates existing users with 'Anonymous' to use their actual names
-- 3. Ensures all prayers display correct user names going forward
--
-- =====================================================================================

-- =====================================================================================
-- 1. UPDATE PROFILE CREATION TRIGGER FOR BACKWARD COMPATIBILITY
-- =====================================================================================

-- Drop and recreate the trigger function to handle both metadata keys
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        -- Handle both 'display_name' (new) and 'name' (old) metadata keys
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',  -- New frontend format
            NEW.raw_user_meta_data->>'name',          -- Old frontend format
            'Anonymous'                               -- Fallback
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =====================================================================================
-- 2. MIGRATE EXISTING USERS WITH INCORRECT DISPLAY NAMES
-- =====================================================================================

-- Update existing profiles that have 'Anonymous' as display_name but have
-- actual names in their auth metadata
UPDATE profiles 
SET display_name = COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'name',
    'Anonymous'
)
FROM auth.users u
WHERE profiles.id = u.id
AND profiles.display_name = 'Anonymous'
AND (
    u.raw_user_meta_data->>'display_name' IS NOT NULL 
    OR u.raw_user_meta_data->>'name' IS NOT NULL
);

-- =====================================================================================
-- 3. CREATE MISSING PROFILES FOR USERS WITHOUT PROFILES
-- =====================================================================================

-- Create profiles for any auth users that don't have profile records
INSERT INTO profiles (id, display_name, avatar_url, created_at, updated_at)
SELECT 
    u.id,
    COALESCE(
        u.raw_user_meta_data->>'display_name',
        u.raw_user_meta_data->>'name',
        'Anonymous'
    ),
    u.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- =====================================================================================
-- 4. UPDATE EXISTING PRAYERS TO USE CORRECT USER NAMES
-- =====================================================================================

-- Update all prayers that have NULL or 'Anonymous' user_name but belong to users
-- with proper display names in their profiles
UPDATE prayers 
SET user_name = p.display_name
FROM profiles p
WHERE prayers.user_id = p.id
AND prayers.is_anonymous = false
AND (prayers.user_name IS NULL OR prayers.user_name = 'Anonymous')
AND p.display_name IS NOT NULL
AND p.display_name != 'Anonymous';

-- =====================================================================================
-- 5. UPDATE CREATE_PRAYER FUNCTION TO AUTO-POPULATE FROM PROFILES
-- =====================================================================================

-- Update the create_prayer function to always fetch user_name from profiles
DROP FUNCTION IF EXISTS create_prayer(UUID, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION create_prayer(
  p_user_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_content_type TEXT DEFAULT 'text',
  p_content_url TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT 0,
  p_lng DOUBLE PRECISION DEFAULT 0,
  p_user_name TEXT DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  location TEXT,
  user_name TEXT,
  is_anonymous BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_prayer_id UUID;
  user_display_name TEXT;
BEGIN
  -- Always fetch the user's display name from their profile
  SELECT display_name INTO user_display_name
  FROM profiles
  WHERE id = p_user_id;
  
  -- Use display_name from profile, fallback to provided name, then Anonymous
  p_user_name := COALESCE(user_display_name, p_user_name, 'Anonymous');

  -- Insert the prayer with proper PostGIS geography
  INSERT INTO prayers (
    user_id,
    title,
    content,
    content_type,
    media_url,
    location,
    user_name,
    is_anonymous,
    status
  )
  VALUES (
    p_user_id,
    NULLIF(p_title, ''),
    p_content,
    p_content_type::content_type,
    NULLIF(p_content_url, ''),
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_user_name,
    p_is_anonymous,
    'active'
  )
  RETURNING prayers.id INTO new_prayer_id;

  -- Return the created prayer with proper anonymous handling
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.content_type::TEXT,
    p.media_url,
    ST_AsText(p.location::geometry) as location,
    -- Respect anonymous flag: return NULL for user_name when anonymous
    CASE
      WHEN p.is_anonymous THEN NULL
      ELSE p.user_name
    END as user_name,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    p.status
  FROM prayers p
  WHERE p.id = new_prayer_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_prayer(UUID, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, BOOLEAN) TO authenticated;

-- =====================================================================================
-- 6. VERIFICATION QUERIES (FOR TESTING)
-- =====================================================================================

-- Check users without profiles (should be 0 after migration)
-- SELECT COUNT(*) as users_without_profiles 
-- FROM auth.users u 
-- WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- Check profiles with 'Anonymous' that could have real names (should be 0 after migration)
-- SELECT COUNT(*) as anonymous_profiles_with_metadata
-- FROM profiles p
-- JOIN auth.users u ON p.id = u.id
-- WHERE p.display_name = 'Anonymous'
-- AND (u.raw_user_meta_data->>'name' IS NOT NULL OR u.raw_user_meta_data->>'display_name' IS NOT NULL);

-- Check prayers with NULL user_name for non-anonymous prayers (should be 0 after migration)
-- SELECT COUNT(*) as prayers_missing_username
-- FROM prayers pr
-- JOIN profiles p ON pr.user_id = p.id
-- WHERE pr.is_anonymous = false
-- AND (pr.user_name IS NULL OR pr.user_name = 'Anonymous')
-- AND p.display_name != 'Anonymous';

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- This migration fixes the systemic profile creation issue by:
-- 1. ✅ Updated trigger handles both 'name' and 'display_name' metadata keys
-- 2. ✅ Migrated existing users to use their correct names from metadata
-- 3. ✅ Created missing profile records for users without profiles
-- 4. ✅ Updated existing prayers to show correct user names
-- 5. ✅ Enhanced create_prayer function to always use profile display_name
-- 
-- All new users will now have proper profiles with correct names
-- All existing prayers will show the correct user names
-- The anonymous toggle will work correctly for all users
-- =====================================================================================