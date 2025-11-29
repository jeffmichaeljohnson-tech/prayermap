-- ============================================================================
-- SIMPLE SCHEMA FIX - Direct approach without complex loops
-- ============================================================================

-- First, let's see what we're working with
SELECT 'Current prayer_responses columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'prayer_responses' 
ORDER BY ordinal_position;

-- Add missing columns to prayer_responses if they don't exist
DO $$
BEGIN
    -- Add prayer_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prayer_responses' AND column_name = 'prayer_id'
    ) THEN
        ALTER TABLE prayer_responses ADD COLUMN prayer_id UUID;
        RAISE NOTICE '✓ Added prayer_id column';
    ELSE
        RAISE NOTICE '✓ prayer_id column already exists';
    END IF;
    
    -- Add is_anonymous if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prayer_responses' AND column_name = 'is_anonymous'
    ) THEN
        ALTER TABLE prayer_responses ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
        RAISE NOTICE '✓ Added is_anonymous column';
    ELSE
        RAISE NOTICE '✓ is_anonymous column already exists';
    END IF;
END $$;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'prayer_response',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    prayer_id UUID,
    prayer_response_id UUID,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Create super simple notification function
CREATE OR REPLACE FUNCTION create_prayer_response_notification()
RETURNS TRIGGER AS $$
DECLARE
    prayer_author_id UUID;
BEGIN
    -- Get prayer author
    SELECT user_id INTO prayer_author_id
    FROM prayers 
    WHERE id = NEW.prayer_id;
    
    -- Skip if responding to own prayer
    IF prayer_author_id = NEW.responder_id THEN
        RETURN NEW;
    END IF;
    
    -- Create simple notification
    INSERT INTO notifications (
        user_id,
        title,
        message,
        prayer_id,
        prayer_response_id
    ) VALUES (
        prayer_author_id,
        'New Prayer Response',
        'Someone prayed for your prayer request',
        NEW.prayer_id,
        NEW.id
    );
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    -- Don't break prayer response creation if notification fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_prayer_response_created ON prayer_responses;
CREATE TRIGGER on_prayer_response_created
    AFTER INSERT ON prayer_responses
    FOR EACH ROW
    EXECUTE FUNCTION create_prayer_response_notification();

-- Test that everything exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prayer_responses' AND column_name = 'prayer_id') 
        THEN '✓ prayer_responses.prayer_id exists'
        ELSE '✗ prayer_responses.prayer_id missing'
    END as prayer_id_check;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
        THEN '✓ notifications table exists'
        ELSE '✗ notifications table missing'
    END as notifications_check;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_prayer_response_created') 
        THEN '✓ notification trigger exists'
        ELSE '✗ notification trigger missing'
    END as trigger_check;

SELECT 'SIMPLE SCHEMA FIX COMPLETED - Check results above' as final_status;