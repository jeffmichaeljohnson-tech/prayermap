-- ============================================================================
-- DIAGNOSTIC AND SCHEMA FIX FOR PRAYERMAP
-- This checks the actual database state and fixes missing columns/tables
-- ============================================================================

-- Step 1: Diagnostic - Check what columns actually exist in prayer_responses
DO $$
DECLARE
    col_exists BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Check if prayer_responses table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'prayer_responses'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✓ prayer_responses table exists';
        
        -- List all columns in prayer_responses
        RAISE NOTICE 'Columns in prayer_responses table:';
        FOR col_exists IN 
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'prayer_responses'
            ORDER BY ordinal_position
        LOOP
            NULL; -- This loop just exists to trigger the query
        END LOOP;
        
        -- Check specific columns
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'prayer_responses' AND column_name = 'prayer_id'
        ) INTO col_exists;
        
        IF col_exists THEN
            RAISE NOTICE '✓ prayer_id column exists in prayer_responses';
        ELSE
            RAISE NOTICE '✗ prayer_id column MISSING from prayer_responses - WILL FIX';
        END IF;
        
    ELSE
        RAISE NOTICE '✗ prayer_responses table does not exist - WILL CREATE';
    END IF;
END $$;

-- Step 2: Show actual table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'prayer_responses'
ORDER BY ordinal_position;

-- Step 3: Create/Fix prayer_responses table if needed
CREATE TABLE IF NOT EXISTS prayer_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'audio', 'video')),
    media_url TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_response_content CHECK (
        (content_type = 'text' AND message IS NOT NULL AND LENGTH(message) >= 1) OR
        (content_type IN ('audio', 'video') AND media_url IS NOT NULL)
    )
);

-- Step 4: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add prayer_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prayer_responses' AND column_name = 'prayer_id'
    ) THEN
        ALTER TABLE prayer_responses ADD COLUMN prayer_id UUID REFERENCES prayers(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added prayer_id column to prayer_responses';
    END IF;
    
    -- Add is_anonymous if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prayer_responses' AND column_name = 'is_anonymous'
    ) THEN
        ALTER TABLE prayer_responses ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_anonymous column to prayer_responses';
    END IF;
    
    -- Add read_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prayer_responses' AND column_name = 'read_at'
    ) THEN
        ALTER TABLE prayer_responses ADD COLUMN read_at TIMESTAMPTZ;
        RAISE NOTICE 'Added read_at column to prayer_responses';
    END IF;
END $$;

-- Step 5: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('prayer_response', 'prayer_support', 'prayer_answered', 'system_message')),
    title TEXT NOT NULL CHECK (length(title) <= 200),
    message TEXT NOT NULL CHECK (length(message) <= 1000),
    prayer_id UUID REFERENCES prayers(id) ON DELETE CASCADE,
    prayer_response_id UUID REFERENCES prayer_responses(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Step 6: Create basic indexes
CREATE INDEX IF NOT EXISTS prayer_responses_prayer_id_idx ON prayer_responses (prayer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prayer_responses_responder_id_idx ON prayer_responses (responder_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, is_read, created_at DESC);

-- Step 7: Enable RLS
ALTER TABLE prayer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 8: Create basic RLS policies
DROP POLICY IF EXISTS "Users can view responses to own prayers" ON prayer_responses;
DROP POLICY IF EXISTS "Users can insert own responses" ON prayer_responses;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view responses to own prayers" ON prayer_responses
    FOR SELECT USING (
        responder_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM prayers 
            WHERE prayers.id = prayer_responses.prayer_id 
            AND prayers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own responses" ON prayer_responses
    FOR INSERT WITH CHECK (responder_id = auth.uid());

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Step 9: Create simplified notification trigger
CREATE OR REPLACE FUNCTION create_prayer_response_notification()
RETURNS TRIGGER AS $$
DECLARE
    prayer_author_id UUID;
    prayer_title TEXT;
    prayer_user_name TEXT;
    responder_name TEXT;
    notification_message TEXT;
BEGIN
    -- Get prayer author info
    SELECT user_id, title, user_name INTO prayer_author_id, prayer_title, prayer_user_name
    FROM prayers 
    WHERE id = NEW.prayer_id;
    
    -- Skip if user responding to own prayer
    IF prayer_author_id = NEW.responder_id THEN
        RETURN NEW;
    END IF;
    
    -- Get responder name
    SELECT display_name INTO responder_name
    FROM profiles 
    WHERE id = NEW.responder_id;
    
    -- Use fallback names
    responder_name := COALESCE(responder_name, 'Someone');
    IF NEW.is_anonymous = true THEN
        responder_name := 'Anonymous';
    END IF;
    
    -- Create simple notification
    notification_message := responder_name || ' prayed for your prayer request';
    
    -- Insert notification
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        prayer_id,
        prayer_response_id,
        data
    ) VALUES (
        prayer_author_id,
        'prayer_response',
        responder_name || ' sent you a prayer',
        notification_message,
        NEW.prayer_id,
        NEW.id,
        jsonb_build_object('responder_name', responder_name)
    );
    
    RAISE NOTICE 'Created notification: % prayed for %', responder_name, COALESCE(prayer_user_name, 'someone');
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification creation failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create trigger
DROP TRIGGER IF EXISTS on_prayer_response_created ON prayer_responses;
CREATE TRIGGER on_prayer_response_created
    AFTER INSERT ON prayer_responses
    FOR EACH ROW
    EXECUTE FUNCTION create_prayer_response_notification();

-- Step 11: Final verification
DO $$
DECLARE
    schema_valid BOOLEAN := true;
    missing_items TEXT := '';
BEGIN
    -- Check prayer_responses columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prayer_responses' AND column_name = 'prayer_id') THEN
        schema_valid := false;
        missing_items := missing_items || 'prayer_responses.prayer_id ';
    END IF;
    
    -- Check notifications table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        schema_valid := false;
        missing_items := missing_items || 'notifications_table ';
    END IF;
    
    -- Check trigger
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_prayer_response_created') THEN
        schema_valid := false;
        missing_items := missing_items || 'notification_trigger ';
    END IF;
    
    IF schema_valid THEN
        RAISE NOTICE '✅ SUCCESS: Schema is now valid. Inbox notifications should work!';
    ELSE
        RAISE NOTICE '❌ STILL MISSING: %', missing_items;
    END IF;
END $$;

SELECT 'DIAGNOSTIC AND SCHEMA FIX COMPLETED' as status;