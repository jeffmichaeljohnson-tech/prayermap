-- ============================================
-- INGESTION PIPELINE IMPROVEMENTS
-- Created: 2025-12-04
-- Purpose: Add priority queuing, retry tracking, DLQ, and deduplication support
-- 
-- This migration adds:
--   1. Priority and retry columns to ingestion_queue
--   2. Content hash column to document_content for deduplication
--   3. Dead Letter Queue (DLQ) table for permanently failed items
--   4. Updated indexes for efficient queue processing
--   5. New helper functions for queue management
--
-- NOTE: This migration is idempotent - safe to re-run
-- 💭 ➡️ 📈
-- ============================================


-- ============================================
-- 1. ADD PRIORITY AND RETRY COLUMNS TO INGESTION_QUEUE
-- ============================================

-- Priority: higher numbers = higher priority (0-100 scale)
ALTER TABLE ingestion_queue 
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Number of retry attempts made
ALTER TABLE ingestion_queue 
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Timestamp when processing started (for timeout detection)
ALTER TABLE ingestion_queue 
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Timestamp of last error (for exponential backoff)
ALTER TABLE ingestion_queue 
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;

-- Error history as JSONB array
ALTER TABLE ingestion_queue 
  ADD COLUMN IF NOT EXISTS error_history JSONB DEFAULT '[]'::jsonb;

-- Add comments for new columns
COMMENT ON COLUMN ingestion_queue.priority IS 'Processing priority (0-100, higher = more urgent)';
COMMENT ON COLUMN ingestion_queue.retry_count IS 'Number of processing retry attempts made';
COMMENT ON COLUMN ingestion_queue.processing_started_at IS 'When current processing attempt started (for timeout detection)';
COMMENT ON COLUMN ingestion_queue.last_error_at IS 'When the last error occurred (for exponential backoff)';
COMMENT ON COLUMN ingestion_queue.error_history IS 'Array of {timestamp, error, attempt} records';


-- ============================================
-- 2. ADD CONTENT_HASH TO DOCUMENT_CONTENT FOR DEDUPLICATION
-- ============================================

-- SHA-256 based content hash (first 16 chars)
ALTER TABLE document_content 
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Add comment
COMMENT ON COLUMN document_content.content_hash IS 'SHA-256 content hash for deduplication (first 16 chars)';


-- ============================================
-- 3. CREATE DEAD LETTER QUEUE (DLQ) TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ingestion_dlq (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to original queue item
  original_queue_id UUID NOT NULL,
  
  -- Original payload
  payload JSONB NOT NULL,
  
  -- Error history: [{attempt, error, timestamp}]
  error_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- When moved to DLQ
  moved_to_dlq_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- When/if retried from DLQ
  retried_at TIMESTAMPTZ,
  
  -- Number of times retried from DLQ
  retry_from_dlq_count INTEGER DEFAULT 0,
  
  -- Notes for manual review
  notes TEXT
);

-- Add comments
COMMENT ON TABLE ingestion_dlq IS 'Dead Letter Queue for permanently failed ingestion items';
COMMENT ON COLUMN ingestion_dlq.original_queue_id IS 'ID of the original ingestion_queue item';
COMMENT ON COLUMN ingestion_dlq.payload IS 'Original item data for retry';
COMMENT ON COLUMN ingestion_dlq.error_history IS 'Full history of all processing attempts';
COMMENT ON COLUMN ingestion_dlq.moved_to_dlq_at IS 'When the item was moved to DLQ';
COMMENT ON COLUMN ingestion_dlq.retried_at IS 'When the item was last retried from DLQ';


-- ============================================
-- 4. CREATE INDEXES FOR IMPROVED PERFORMANCE
-- ============================================

-- Priority-based queue processing index
-- Finds pending items ordered by priority (desc) then age (asc)
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_priority_pending
  ON ingestion_queue(priority DESC, created_at ASC)
  WHERE status = 'pending';

-- Retry tracking index
-- Finds items that have been retried
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_retry_count
  ON ingestion_queue(retry_count)
  WHERE retry_count > 0;

-- Stale processing detection index
-- Finds items stuck in "processing" state
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_processing_started
  ON ingestion_queue(processing_started_at)
  WHERE status = 'processing';

-- Content hash index for deduplication
CREATE INDEX IF NOT EXISTS idx_document_content_hash
  ON document_content(content_hash)
  WHERE content_hash IS NOT NULL;

-- DLQ indexes
CREATE INDEX IF NOT EXISTS idx_dlq_moved_at 
  ON ingestion_dlq(moved_to_dlq_at DESC);

CREATE INDEX IF NOT EXISTS idx_dlq_original_queue
  ON ingestion_dlq(original_queue_id);


-- ============================================
-- 5. ENABLE RLS ON DLQ
-- ============================================

ALTER TABLE ingestion_dlq ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS "Service role full access to ingestion_dlq" ON ingestion_dlq;

-- Allow service role full access to DLQ
CREATE POLICY "Service role full access to ingestion_dlq"
  ON ingestion_dlq
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.jwt() ->> 'role') = 'service_role'
  );


-- ============================================
-- 6. UPDATED HELPER FUNCTIONS
-- ============================================

-- Function: Get next pending item with priority ordering
-- Updates get_next_pending_ingestion to use priority
CREATE OR REPLACE FUNCTION get_next_pending_ingestion()
RETURNS SETOF ingestion_queue AS $$
DECLARE
  v_item ingestion_queue;
BEGIN
  -- Lock and get the next pending item (highest priority, oldest first)
  SELECT * INTO v_item
  FROM ingestion_queue
  WHERE status = 'pending'
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If found, mark as processing
  IF v_item.id IS NOT NULL THEN
    UPDATE ingestion_queue
    SET 
      status = 'processing',
      processing_started_at = NOW()
    WHERE id = v_item.id;
    
    v_item.status := 'processing';
    v_item.processing_started_at := NOW();
    RETURN NEXT v_item;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Get batch of pending items with priority
CREATE OR REPLACE FUNCTION get_pending_batch(p_limit INTEGER DEFAULT 10)
RETURNS SETOF ingestion_queue AS $$
BEGIN
  -- Update status to processing and return
  RETURN QUERY
  WITH to_process AS (
    SELECT id
    FROM ingestion_queue
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE ingestion_queue q
  SET 
    status = 'processing',
    processing_started_at = NOW()
  FROM to_process t
  WHERE q.id = t.id
  RETURNING q.*;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pending_batch(INTEGER) IS 
  'Atomically claims a batch of pending items for processing';


-- Function: Mark item as failed with retry tracking
CREATE OR REPLACE FUNCTION fail_ingestion_with_retry(
  p_queue_id UUID,
  p_error_message TEXT,
  p_max_retries INTEGER DEFAULT 3
)
RETURNS TABLE (moved_to_dlq BOOLEAN, new_retry_count INTEGER) AS $$
DECLARE
  v_current_retry_count INTEGER;
  v_error_history JSONB;
BEGIN
  -- Get current state
  SELECT retry_count, COALESCE(error_history, '[]'::jsonb)
  INTO v_current_retry_count, v_error_history
  FROM ingestion_queue
  WHERE id = p_queue_id;
  
  -- Add to error history
  v_error_history := v_error_history || jsonb_build_object(
    'attempt', v_current_retry_count + 1,
    'error', p_error_message,
    'timestamp', NOW()
  );
  
  IF v_current_retry_count >= p_max_retries - 1 THEN
    -- Max retries exceeded - move to DLQ
    INSERT INTO ingestion_dlq (original_queue_id, payload, error_history)
    SELECT 
      p_queue_id,
      jsonb_build_object(
        'source', source,
        'data_type', data_type,
        'content', content,
        'metadata', metadata,
        'created_at', created_at
      ),
      v_error_history
    FROM ingestion_queue
    WHERE id = p_queue_id;
    
    -- Delete from main queue
    DELETE FROM ingestion_queue WHERE id = p_queue_id;
    
    RETURN QUERY SELECT TRUE, v_current_retry_count + 1;
  ELSE
    -- Update for retry
    UPDATE ingestion_queue
    SET 
      status = 'pending',
      retry_count = retry_count + 1,
      error_message = p_error_message,
      error_history = v_error_history,
      last_error_at = NOW(),
      processing_started_at = NULL
    WHERE id = p_queue_id;
    
    RETURN QUERY SELECT FALSE, v_current_retry_count + 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fail_ingestion_with_retry(UUID, TEXT, INTEGER) IS 
  'Records failure, increments retry count, moves to DLQ if max retries exceeded';


-- Function: Reset stale processing items
CREATE OR REPLACE FUNCTION reset_stale_processing(p_timeout_minutes INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH reset AS (
    UPDATE ingestion_queue
    SET 
      status = 'pending',
      processing_started_at = NULL,
      error_message = 'Processing timeout - reset to pending',
      error_history = COALESCE(error_history, '[]'::jsonb) || jsonb_build_object(
        'attempt', retry_count,
        'error', 'Processing timeout after ' || p_timeout_minutes || ' minutes',
        'timestamp', NOW()
      )
    WHERE status = 'processing'
      AND processing_started_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM reset;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_stale_processing(INTEGER) IS 
  'Resets items stuck in processing state beyond timeout to pending';


-- Function: Retry item from DLQ
CREATE OR REPLACE FUNCTION retry_from_dlq(p_dlq_id UUID)
RETURNS UUID AS $$
DECLARE
  v_dlq_item ingestion_dlq;
  v_new_queue_id UUID;
BEGIN
  -- Get DLQ item
  SELECT * INTO v_dlq_item
  FROM ingestion_dlq
  WHERE id = p_dlq_id;
  
  IF v_dlq_item.id IS NULL THEN
    RAISE EXCEPTION 'DLQ item not found: %', p_dlq_id;
  END IF;
  
  -- Insert back into main queue
  INSERT INTO ingestion_queue (
    source,
    data_type,
    content,
    metadata,
    status,
    retry_count,
    error_history
  )
  VALUES (
    v_dlq_item.payload->>'source',
    v_dlq_item.payload->>'data_type',
    v_dlq_item.payload->>'content',
    COALESCE(v_dlq_item.payload->'metadata', '{}'::jsonb),
    'pending',
    0,  -- Reset retry count
    v_dlq_item.error_history  -- Keep error history for reference
  )
  RETURNING id INTO v_new_queue_id;
  
  -- Update DLQ item
  UPDATE ingestion_dlq
  SET 
    retried_at = NOW(),
    retry_from_dlq_count = retry_from_dlq_count + 1
  WHERE id = p_dlq_id;
  
  RETURN v_new_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION retry_from_dlq(UUID) IS 
  'Re-queues an item from the DLQ for another processing attempt';


-- Function: Get queue health summary
CREATE OR REPLACE FUNCTION get_queue_health()
RETURNS TABLE (
  total_pending BIGINT,
  total_processing BIGINT,
  total_completed_24h BIGINT,
  total_failed_24h BIGINT,
  total_in_dlq BIGINT,
  oldest_pending_minutes INTEGER,
  avg_processing_time_minutes NUMERIC,
  error_rate_percent NUMERIC,
  items_with_retries BIGINT,
  health_status TEXT
) AS $$
DECLARE
  v_oldest_pending TIMESTAMPTZ;
  v_total_processed BIGINT;
  v_total_failed BIGINT;
BEGIN
  -- Get counts
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'processing'),
    COUNT(*) FILTER (WHERE status = 'completed' AND processed_at > NOW() - INTERVAL '24 hours'),
    COUNT(*) FILTER (WHERE status = 'failed' AND processed_at > NOW() - INTERVAL '24 hours'),
    MIN(CASE WHEN status = 'pending' THEN created_at END)
  INTO 
    total_pending,
    total_processing,
    total_completed_24h,
    total_failed_24h,
    v_oldest_pending
  FROM ingestion_queue;
  
  -- DLQ count
  SELECT COUNT(*) INTO total_in_dlq FROM ingestion_dlq;
  
  -- Calculate oldest pending age
  oldest_pending_minutes := EXTRACT(EPOCH FROM (NOW() - v_oldest_pending)) / 60;
  IF oldest_pending_minutes IS NULL THEN
    oldest_pending_minutes := 0;
  END IF;
  
  -- Average processing time
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) / 60), 2)
  INTO avg_processing_time_minutes
  FROM ingestion_queue
  WHERE status = 'completed'
    AND processed_at > NOW() - INTERVAL '24 hours';
  
  IF avg_processing_time_minutes IS NULL THEN
    avg_processing_time_minutes := 0;
  END IF;
  
  -- Error rate
  v_total_processed := total_completed_24h + total_failed_24h;
  IF v_total_processed > 0 THEN
    error_rate_percent := ROUND((total_failed_24h::NUMERIC / v_total_processed) * 100, 2);
  ELSE
    error_rate_percent := 0;
  END IF;
  
  -- Items with retries
  SELECT COUNT(*) INTO items_with_retries
  FROM ingestion_queue
  WHERE retry_count > 0;
  
  -- Determine health status
  IF total_in_dlq > 100 OR oldest_pending_minutes > 60 OR error_rate_percent > 25 THEN
    health_status := 'critical';
  ELSIF total_in_dlq > 20 OR oldest_pending_minutes > 30 OR error_rate_percent > 10 THEN
    health_status := 'degraded';
  ELSE
    health_status := 'healthy';
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_queue_health() IS 
  'Returns comprehensive health metrics for the ingestion queue';


-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- DLQ table
GRANT ALL ON ingestion_dlq TO service_role;

-- Functions
GRANT EXECUTE ON FUNCTION get_pending_batch(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION fail_ingestion_with_retry(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION reset_stale_processing(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION retry_from_dlq(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_queue_health() TO service_role;


-- ============================================
-- 8. BACKFILL CONTENT HASHES (Optional)
-- ============================================
-- Uncomment and run if you want to generate hashes for existing content
-- This uses PostgreSQL's built-in SHA-256 and is safe to run

-- UPDATE document_content
-- SET content_hash = LEFT(encode(sha256(full_content::bytea), 'hex'), 16)
-- WHERE content_hash IS NULL;


-- ============================================
-- 9. VALIDATION
-- ============================================

DO $$
BEGIN
  -- Verify new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ingestion_queue' AND column_name = 'priority'
  ) THEN
    RAISE EXCEPTION 'Migration failed: priority column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ingestion_queue' AND column_name = 'retry_count'
  ) THEN
    RAISE EXCEPTION 'Migration failed: retry_count column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_content' AND column_name = 'content_hash'
  ) THEN
    RAISE EXCEPTION 'Migration failed: content_hash column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ingestion_dlq'
  ) THEN
    RAISE EXCEPTION 'Migration failed: ingestion_dlq table not created';
  END IF;
  
  RAISE NOTICE 'Ingestion improvements migration completed successfully 💭 ➡️ 📈';
END $$;

