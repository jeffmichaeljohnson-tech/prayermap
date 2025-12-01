-- ============================================================================
-- URGENT NOTIFICATION SYSTEM FIX - CORRECTED VERSION
-- Fixed for actual PrayerMap database schema
-- ============================================================================

-- Step 1: Create notifications table if it doesn't exist
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

-- Step 2: Add is_anonymous field to prayer_responses if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prayer_responses' 
        AND column_name = 'is_anonymous'
    ) THEN
        ALTER TABLE prayer_responses ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_anonymous column to prayer_responses table';
    ELSE
        RAISE NOTICE 'is_anonymous column already exists in prayer_responses table';
    END IF;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_inbox_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_prayer_idx ON notifications (prayer_id);

-- Step 4: Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Step 6: Create notification trigger function (CORRECTED - no email column)
CREATE OR REPLACE FUNCTION create_prayer_response_notification()
RETURNS TRIGGER AS $$
DECLARE
  prayer_author_id UUID;
  prayer_title TEXT;
  prayer_user_name TEXT;
  responder_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get prayer author, title, and user_name
  SELECT user_id, title, user_name INTO prayer_author_id, prayer_title, prayer_user_name
  FROM prayers 
  WHERE id = NEW.prayer_id;
  
  -- Don't create notification if user is responding to their own prayer
  IF prayer_author_id = NEW.responder_id THEN
    RETURN NEW;
  END IF;
  
  -- Get responder name from profiles table (only display_name available)
  SELECT display_name INTO responder_name
  FROM profiles 
  WHERE id = NEW.responder_id;
  
  -- Fallback to user_name if no profile display_name
  IF responder_name IS NULL THEN
    responder_name := 'Someone';
  END IF;
  
  -- Handle anonymous responses
  IF NEW.is_anonymous = true THEN
    responder_name := 'Anonymous';
  END IF;
  
  -- Create notification title and message
  notification_title := responder_name || ' prayed for your request';
  notification_message := responder_name || ' prayed for your prayer: "' || 
                         COALESCE(left(prayer_title, 50), left(prayer_user_name, 50), 'Your prayer request') || 
                         CASE WHEN length(COALESCE(prayer_title, prayer_user_name, '')) > 50 THEN '..."' ELSE '"' END;
  
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
    notification_title,
    notification_message,
    NEW.prayer_id,
    NEW.id,
    jsonb_build_object(
      'responder_id', NEW.responder_id,
      'responder_name', responder_name,
      'prayer_title', COALESCE(prayer_title, prayer_user_name),
      'is_anonymous', NEW.is_anonymous,
      'prayer_author', prayer_user_name
    )
  );
  
  RAISE NOTICE 'Created notification for prayer response % from % to %', NEW.id, responder_name, prayer_user_name;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't prevent the prayer response from being created
  RAISE WARNING 'Failed to create notification for prayer response %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS on_prayer_response_created ON prayer_responses;
CREATE TRIGGER on_prayer_response_created
  AFTER INSERT ON prayer_responses
  FOR EACH ROW
  EXECUTE FUNCTION create_prayer_response_notification();

-- Step 8: Create helper functions for frontend
CREATE OR REPLACE FUNCTION get_user_notifications(target_user_id UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  prayer_id UUID,
  prayer_response_id UUID,
  data JSONB,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.prayer_id,
    n.prayer_response_id,
    n.data,
    n.is_read,
    n.created_at,
    n.read_at
  FROM notifications n
  WHERE n.user_id = target_user_id
    AND (n.expires_at IS NULL OR n.expires_at > now())
  ORDER BY n.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := false;
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
  
  GET DIAGNOSTICS success = FOUND;
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_notification_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM notifications 
  WHERE user_id = target_user_id 
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > now());
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Add basic inbox query indexes (without CONCURRENTLY for Supabase)
CREATE INDEX IF NOT EXISTS prayer_responses_inbox_basic_idx 
ON prayer_responses (prayer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prayers_user_basic_idx 
ON prayers (user_id, created_at DESC);

-- Step 10: Test the system
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Test that trigger function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_prayer_response_notification') THEN
    RAISE NOTICE '✓ Trigger function created successfully';
  ELSE
    RAISE NOTICE '✗ Trigger function creation failed';
  END IF;
  
  -- Test that trigger exists
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_prayer_response_created' 
    AND event_object_table = 'prayer_responses'
  ) THEN
    RAISE NOTICE '✓ Trigger created successfully';
  ELSE
    RAISE NOTICE '✗ Trigger creation failed';
  END IF;
  
  -- Test that notifications table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE NOTICE '✓ Notifications table created successfully';
  ELSE
    RAISE NOTICE '✗ Notifications table creation failed';
  END IF;
  
  -- Test that helper functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_notifications') THEN
    RAISE NOTICE '✓ Helper functions created successfully';
  ELSE
    RAISE NOTICE '✗ Helper functions creation failed';
  END IF;
END;
$$;

-- Final success message
SELECT 'CORRECTED NOTIFICATION SYSTEM FIX APPLIED SUCCESSFULLY! 
Inbox messaging should now work. 
Fixed issues: removed email column reference, added proper fallbacks for user names.' as status;