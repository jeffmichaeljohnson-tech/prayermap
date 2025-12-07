-- Fix profiles table and handle_new_user trigger
-- This fixes the "Database error saving new user" signup error
--
-- Root cause: The handle_new_user() trigger tries to insert into profiles table
-- which may not exist, or looks for wrong metadata field (display_name vs name)

-- ============================================================================
-- 1. Create profiles table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Profile information
    display_name TEXT,
    avatar_url TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- ============================================================================
-- 2. Create or replace the handle_new_user function
-- Fixed: Uses 'name' from metadata (what signUp passes) instead of 'display_name'
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        -- Use 'name' field (from signUp) or 'display_name' or fallback to 'Anonymous'
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            'Anonymous'
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(
            EXCLUDED.display_name,
            profiles.display_name
        ),
        avatar_url = COALESCE(
            EXCLUDED.avatar_url,
            profiles.avatar_url
        ),
        updated_at = now();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Create trigger if it doesn't exist (drop and recreate to ensure correct setup)
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 4. Enable RLS on profiles table
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for manual creation)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 5. Create update timestamp trigger for profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;

CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================================================
-- 6. Backfill profiles for any existing users who don't have one
-- ============================================================================

INSERT INTO profiles (id, display_name, avatar_url)
SELECT
    u.id,
    COALESCE(
        u.raw_user_meta_data->>'name',
        u.raw_user_meta_data->>'display_name',
        'Anonymous'
    ),
    u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
