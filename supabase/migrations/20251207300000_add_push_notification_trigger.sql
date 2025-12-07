-- ============================================
-- PUSH NOTIFICATION WEBHOOK TRIGGER
-- Created: 2025-12-07
-- Purpose: Call Edge Function when prayer_response is created
-- 
-- This migration:
--   1. Enables pg_net extension for HTTP requests from PostgreSQL
--   2. Creates function to call send-push-notification Edge Function
--   3. Creates trigger on prayer_responses INSERT
--
-- NOTE: This migration is idempotent - safe to re-run
-- 
-- IMPORTANT: The service_role_key must be set in database settings:
--   ALTER DATABASE postgres SET "app.settings.service_role_key" = 'your-key';
--   (Done via Supabase Dashboard > Database > Extensions > pg_net)
--
-- 💭 ➡️ 📈
-- ============================================


-- ============================================
-- 1. ENABLE PG_NET EXTENSION
-- ============================================
-- pg_net allows making HTTP requests from PostgreSQL
-- This is already included in Supabase but needs to be enabled

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

COMMENT ON EXTENSION pg_net IS 'Async HTTP networking for PostgreSQL - used for calling Edge Functions from triggers';


-- ============================================
-- 2. CREATE HELPER FUNCTION FOR EDGE FUNCTION URL
-- ============================================
-- Gets the Edge Function URL based on the project reference
-- Falls back to environment-aware defaults

CREATE OR REPLACE FUNCTION get_edge_function_url(function_name TEXT)
RETURNS TEXT AS $$
DECLARE
  supabase_url TEXT;
  project_ref TEXT;
BEGIN
  -- Try to get from current_setting (set by Supabase)
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    supabase_url := NULL;
  END;
  
  -- If not set, use the project's known URL
  IF supabase_url IS NULL OR supabase_url = '' THEN
    -- PrayerMap project reference: oomrmfhvsxtxgqqthisz
    supabase_url := 'https://oomrmfhvsxtxgqqthisz.supabase.co';
  END IF;
  
  -- Return the full Edge Function URL
  RETURN supabase_url || '/functions/v1/' || function_name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_edge_function_url(TEXT) IS 
  'Returns the full URL for a Supabase Edge Function';


-- ============================================
-- 3. CREATE NOTIFICATION TRIGGER FUNCTION
-- ============================================
-- This function is called by the trigger and sends an HTTP POST
-- to the send-push-notification Edge Function

CREATE OR REPLACE FUNCTION notify_prayer_response()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  service_key TEXT;
  payload JSONB;
BEGIN
  -- Get the Edge Function URL
  edge_function_url := get_edge_function_url('send-push-notification');
  
  -- Try to get service role key from database settings
  -- This must be set via: ALTER DATABASE postgres SET "app.settings.service_role_key" = 'xxx';
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_key := NULL;
  END;
  
  -- If no service key, log warning and exit (don't block the INSERT)
  IF service_key IS NULL OR service_key = '' THEN
    RAISE WARNING 'app.settings.service_role_key not configured - push notification skipped';
    RETURN NEW;
  END IF;
  
  -- Build the webhook payload
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'prayer_responses',
    'schema', 'public',
    'record', jsonb_build_object(
      'id', NEW.id,
      'prayer_id', NEW.prayer_id,
      'responder_id', NEW.responder_id,
      'responder_name', COALESCE(NEW.responder_name, ''),
      'message', COALESCE(NEW.message, ''),
      'is_anonymous', COALESCE(NEW.is_anonymous, false),
      'content_type', COALESCE(NEW.content_type, 'text'),
      'created_at', NEW.created_at
    )
  );
  
  -- Make async HTTP POST to Edge Function
  -- pg_net.http_post is non-blocking - it won't delay the INSERT
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := payload
  );
  
  -- Return NEW to allow the INSERT to proceed
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the INSERT
  RAISE WARNING 'Push notification trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_prayer_response() IS 
  'Async webhook trigger to send push notification when prayer_response is created';


-- ============================================
-- 4. CREATE TRIGGER ON PRAYER_RESPONSES
-- ============================================
-- Drop existing trigger first for idempotency
DROP TRIGGER IF EXISTS trigger_notify_prayer_response ON prayer_responses;

-- Create new trigger that fires AFTER INSERT
-- AFTER ensures the row is committed before notification is sent
CREATE TRIGGER trigger_notify_prayer_response
  AFTER INSERT ON prayer_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_prayer_response();

COMMENT ON TRIGGER trigger_notify_prayer_response ON prayer_responses IS 
  'Sends push notification to prayer owner when someone responds to their prayer';


-- ============================================
-- 5. VERIFICATION QUERY (Optional)
-- ============================================
-- Run this to verify the trigger is set up correctly:
--
-- SELECT 
--   t.tgname as trigger_name,
--   t.tgenabled as enabled,
--   p.proname as function_name,
--   obj_description(t.oid) as description
-- FROM pg_trigger t
-- JOIN pg_proc p ON t.tgfoid = p.oid
-- WHERE t.tgrelid = 'prayer_responses'::regclass
--   AND t.tgname = 'trigger_notify_prayer_response';


-- ============================================
-- 6. SETUP INSTRUCTIONS (Manual Step Required)
-- ============================================
-- 
-- After running this migration, you need to configure the service role key:
--
-- Option A: Via SQL (requires superuser):
--   ALTER DATABASE postgres SET "app.settings.service_role_key" = 'eyJhb...your-key';
--
-- Option B: Via Supabase Dashboard:
--   1. Go to Database > Extensions
--   2. Enable pg_net if not already enabled
--   3. Go to Settings > Database
--   4. Add custom config: app.settings.service_role_key = your-service-key
--
-- You also need to set the FCM_SERVER_KEY in Supabase secrets:
--   supabase secrets set FCM_SERVER_KEY=your_fcm_server_key
--
-- 💭 ➡️ 📈

