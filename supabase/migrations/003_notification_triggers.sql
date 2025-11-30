-- ============================================================================
-- Notification Triggers Migration
-- Automatically sends push notifications when database records are created
-- ============================================================================

-- Note: This requires the pg_net extension for making HTTP requests from Postgres
-- Enable pg_net extension (Supabase enables this by default)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- Trigger Function: Send Push Notification on Prayer Support
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_prayer_support()
RETURNS TRIGGER AS $$
DECLARE
  prayer_author_id UUID;
  supporter_name TEXT;
  prayer_title TEXT;
  request_id BIGINT;
BEGIN
  -- Get the prayer author's user_id and prayer title
  SELECT user_id, title INTO prayer_author_id, prayer_title
  FROM prayers
  WHERE id = NEW.prayer_id;

  -- Get supporter's name
  SELECT display_name INTO supporter_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Don't notify if user is supporting their own prayer
  IF prayer_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Create notification record
  INSERT INTO notifications (
    user_id,
    type,
    payload,
    is_read,
    created_at
  ) VALUES (
    prayer_author_id,
    'SUPPORT_RECEIVED',
    jsonb_build_object(
      'prayer_id', NEW.prayer_id,
      'supporter_name', COALESCE(supporter_name, 'Someone'),
      'message', COALESCE(supporter_name, 'Someone') || ' prayed for you'
    ),
    false,
    now()
  )
  RETURNING notification_id INTO request_id;

  -- Send push notification via edge function (async, don't block)
  -- Using pg_net to make HTTP request
  PERFORM net.http_post(
    url := current_setting('app.edge_function_url', true) || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object(
      'notification_id', request_id,
      'user_id', prayer_author_id,
      'type', 'SUPPORT_RECEIVED',
      'payload', jsonb_build_object(
        'prayer_id', NEW.prayer_id,
        'supporter_name', COALESCE(supporter_name, 'Someone'),
        'message', COALESCE(supporter_name, 'Someone') || ' prayed for you'
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger Function: Send Push Notification on Prayer Response
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_prayer_response()
RETURNS TRIGGER AS $$
DECLARE
  prayer_author_id UUID;
  responder_name TEXT;
  prayer_title TEXT;
  response_preview TEXT;
  request_id BIGINT;
BEGIN
  -- Get the prayer author's user_id and prayer title
  SELECT user_id, title INTO prayer_author_id, prayer_title
  FROM prayers
  WHERE id = NEW.prayer_id;

  -- Get responder's name
  SELECT display_name INTO responder_name
  FROM profiles
  WHERE id = NEW.responder_id;

  -- Don't notify if user is responding to their own prayer
  IF prayer_author_id = NEW.responder_id THEN
    RETURN NEW;
  END IF;

  -- Create response preview (first 100 chars)
  IF NEW.content_type = 'text' THEN
    response_preview := LEFT(NEW.message, 100);
    IF LENGTH(NEW.message) > 100 THEN
      response_preview := response_preview || '...';
    END IF;
  ELSIF NEW.content_type = 'audio' THEN
    response_preview := COALESCE(responder_name, 'Someone') || ' sent you an audio message';
  ELSIF NEW.content_type = 'video' THEN
    response_preview := COALESCE(responder_name, 'Someone') || ' sent you a video message';
  END IF;

  -- Create notification record
  INSERT INTO notifications (
    user_id,
    type,
    payload,
    is_read,
    created_at
  ) VALUES (
    prayer_author_id,
    'RESPONSE_RECEIVED',
    jsonb_build_object(
      'prayer_id', NEW.prayer_id,
      'response_id', NEW.id,
      'responder_name', COALESCE(responder_name, 'Someone'),
      'response_preview', response_preview
    ),
    false,
    now()
  )
  RETURNING notification_id INTO request_id;

  -- Send push notification via edge function (async, don't block)
  PERFORM net.http_post(
    url := current_setting('app.edge_function_url', true) || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object(
      'notification_id', request_id,
      'user_id', prayer_author_id,
      'type', 'RESPONSE_RECEIVED',
      'payload', jsonb_build_object(
        'prayer_id', NEW.prayer_id,
        'response_id', NEW.id,
        'responder_name', COALESCE(responder_name, 'Someone'),
        'response_preview', response_preview
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create Triggers
-- ============================================================================

-- Note: You'll need to create the prayer_support table if it doesn't exist
-- This assumes you have a table tracking when users "pray" for a prayer

-- Trigger on prayer support (when someone taps "I'm Praying")
-- CREATE TRIGGER on_prayer_support_created
--   AFTER INSERT ON prayer_support
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_on_prayer_support();

-- Trigger on prayer response (when someone responds with text/audio/video)
CREATE TRIGGER on_prayer_response_created
  AFTER INSERT ON prayer_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_prayer_response();

-- ============================================================================
-- Configuration Setup
-- ============================================================================

-- These settings need to be configured in your Supabase project
-- Run these commands via Supabase CLI or SQL editor:

-- Set edge function URL (replace with your project URL)
-- ALTER DATABASE postgres SET app.edge_function_url = 'https://your-project.supabase.co';

-- Set service role key (use secrets management, not SQL!)
-- ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';

-- Alternative: Use environment variables in edge function triggers
-- and configure via Supabase dashboard → Settings → API

-- ============================================================================
-- Manual Notification Example
-- ============================================================================

-- To manually trigger a notification, insert into notifications table:
--
-- INSERT INTO notifications (user_id, type, payload, is_read)
-- VALUES (
--   'target-user-uuid',
--   'SUPPORT_RECEIVED',
--   '{"prayer_id": 123, "supporter_name": "Marcus"}',
--   false
-- );
--
-- Then call the edge function:
-- SELECT net.http_post(
--   url := 'https://your-project.supabase.co/functions/v1/send-notification',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer service-key"}',
--   body := '{"notification_id": 1, "user_id": "uuid", "type": "SUPPORT_RECEIVED", "payload": {...}}'
-- );

-- ============================================================================
-- Performance Notes
-- ============================================================================

-- 1. pg_net makes async HTTP requests, so it won't block the transaction
-- 2. If edge function fails, the notification record is still created
-- 3. Can implement retry logic by querying unsent notifications
-- 4. Monitor pg_net queue: SELECT * FROM net.http_request_queue;
