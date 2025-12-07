-- ============================================
-- PINECONE INGESTION SYSTEM TABLES
-- Created: 2025-12-04
-- Purpose: Support the development memory RAG system
-- 
-- This migration adds:
--   1. ingestion_queue - Queue for async processing of development data
--   2. document_content - Full content storage (Pinecone only stores preview)
--   3. Indexes for efficient queue processing
--   4. RLS policies (service role only)
--
-- NOTE: This migration is idempotent - safe to re-run
-- ============================================


-- ============================================
-- 1. CREATE INGESTION_QUEUE TABLE
-- ============================================
-- Queue for incoming development data to be processed
-- and stored in Pinecone for semantic search

CREATE TABLE IF NOT EXISTS ingestion_queue (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source of the data
  -- Values: claude_code, cursor, claude_desktop, terminal, github, vercel, supabase, datadog, langsmith, automated
  source TEXT NOT NULL,
  CONSTRAINT valid_source CHECK (
    source IN ('claude_code', 'cursor', 'claude_desktop', 'terminal', 'github', 'vercel', 'supabase', 'datadog', 'langsmith', 'automated')
  ),
  
  -- Type of data
  -- Values: session, config, code, deployment, learning, system_snapshot, error, metric
  data_type TEXT NOT NULL,
  CONSTRAINT valid_data_type CHECK (
    data_type IN ('session', 'config', 'code', 'deployment', 'learning', 'system_snapshot', 'error', 'metric')
  ),
  
  -- Raw content to be processed
  content TEXT NOT NULL,
  CONSTRAINT content_not_empty CHECK (char_length(content) > 0),
  
  -- Additional metadata provided by the source
  -- May include pre-computed tags, file lists, etc.
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Processing status
  -- pending: Awaiting processing
  -- processing: Currently being processed
  -- completed: Successfully processed and stored in Pinecone
  -- failed: Processing failed (see error_message)
  status TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Error message if status is 'failed'
  error_message TEXT,
  
  -- ID of the document in Pinecone (set after successful processing)
  pinecone_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Add comments
COMMENT ON TABLE ingestion_queue IS 'Queue for development data to be processed and stored in Pinecone';
COMMENT ON COLUMN ingestion_queue.source IS 'System that generated this data (claude_code, github, vercel, etc.)';
COMMENT ON COLUMN ingestion_queue.data_type IS 'Type of development data (session, code, deployment, etc.)';
COMMENT ON COLUMN ingestion_queue.content IS 'Raw content to be processed, embedded, and stored';
COMMENT ON COLUMN ingestion_queue.metadata IS 'Pre-computed metadata from the source system';
COMMENT ON COLUMN ingestion_queue.pinecone_id IS 'Reference to the document ID in Pinecone after processing';


-- ============================================
-- 2. CREATE DOCUMENT_CONTENT TABLE
-- ============================================
-- Full content storage for documents that exceed Pinecone's
-- metadata size limits. Pinecone stores only a preview,
-- and this table stores the full content for retrieval.

CREATE TABLE IF NOT EXISTS document_content (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to the Pinecone document ID (unique)
  pinecone_id TEXT UNIQUE NOT NULL,
  
  -- Full content of the document
  full_content TEXT NOT NULL,
  CONSTRAINT content_not_empty CHECK (char_length(full_content) > 0),
  
  -- Full metadata as stored (for debugging/reference)
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE document_content IS 'Full content storage for documents in Pinecone (which only stores previews)';
COMMENT ON COLUMN document_content.pinecone_id IS 'Unique reference to the Pinecone vector ID';
COMMENT ON COLUMN document_content.full_content IS 'Complete content, not truncated like in Pinecone';


-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for queue processing: find pending items ordered by creation time
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_status_created
  ON ingestion_queue(status, created_at ASC)
  WHERE status = 'pending';

-- Index for monitoring: find items by status
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_status
  ON ingestion_queue(status);

-- Index for querying by source
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_source
  ON ingestion_queue(source);

-- Index for querying by data type
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_data_type
  ON ingestion_queue(data_type);

-- Index for finding recently processed items
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_processed_at
  ON ingestion_queue(processed_at DESC)
  WHERE processed_at IS NOT NULL;

-- Index for looking up full content by pinecone_id
CREATE INDEX IF NOT EXISTS idx_document_content_pinecone
  ON document_content(pinecone_id);


-- ============================================
-- 4. ENABLE ROW-LEVEL SECURITY
-- ============================================

ALTER TABLE ingestion_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_content ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 5. RLS POLICIES (SERVICE ROLE ONLY)
-- ============================================
-- These tables should only be accessed by Edge Functions
-- using the service_role key, not by frontend clients.

-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Service role full access to ingestion_queue" ON ingestion_queue;
DROP POLICY IF EXISTS "Service role full access to document_content" ON document_content;

-- Allow service role full access to ingestion_queue
CREATE POLICY "Service role full access to ingestion_queue"
  ON ingestion_queue
  FOR ALL
  USING (
    -- Allow access when authenticated with service_role
    -- Note: service_role bypasses RLS by default, but this is explicit
    auth.role() = 'service_role' OR
    -- Also allow if using a service role key (JWT check)
    (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- Allow service role full access to document_content
CREATE POLICY "Service role full access to document_content"
  ON document_content
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
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function: Get next pending item from queue
-- Used by the processor to claim the next item
CREATE OR REPLACE FUNCTION get_next_pending_ingestion()
RETURNS SETOF ingestion_queue AS $$
DECLARE
  v_item ingestion_queue;
BEGIN
  -- Lock and get the next pending item
  SELECT * INTO v_item
  FROM ingestion_queue
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If found, mark as processing
  IF v_item.id IS NOT NULL THEN
    UPDATE ingestion_queue
    SET status = 'processing'
    WHERE id = v_item.id;
    
    v_item.status := 'processing';
    RETURN NEXT v_item;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_next_pending_ingestion() IS 
  'Atomically claims the next pending ingestion item for processing';


-- Function: Mark item as completed
CREATE OR REPLACE FUNCTION complete_ingestion(
  p_queue_id UUID,
  p_pinecone_id TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE ingestion_queue
  SET 
    status = 'completed',
    pinecone_id = p_pinecone_id,
    processed_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_ingestion(UUID, TEXT) IS 
  'Marks an ingestion item as successfully completed';


-- Function: Mark item as failed
CREATE OR REPLACE FUNCTION fail_ingestion(
  p_queue_id UUID,
  p_error_message TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE ingestion_queue
  SET 
    status = 'failed',
    error_message = p_error_message,
    processed_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fail_ingestion(UUID, TEXT) IS 
  'Marks an ingestion item as failed with an error message';


-- Function: Get queue statistics
CREATE OR REPLACE FUNCTION get_ingestion_queue_stats()
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  oldest_created_at TIMESTAMPTZ,
  newest_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    iq.status,
    COUNT(*) as count,
    MIN(iq.created_at) as oldest_created_at,
    MAX(iq.created_at) as newest_created_at
  FROM ingestion_queue iq
  GROUP BY iq.status
  ORDER BY iq.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_ingestion_queue_stats() IS 
  'Returns statistics about the ingestion queue by status';


-- Function: Retry failed items
CREATE OR REPLACE FUNCTION retry_failed_ingestions(p_limit INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE ingestion_queue
    SET 
      status = 'pending',
      error_message = NULL,
      processed_at = NULL
    WHERE id IN (
      SELECT id FROM ingestion_queue
      WHERE status = 'failed'
      ORDER BY created_at DESC
      LIMIT p_limit
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION retry_failed_ingestions(INTEGER) IS 
  'Resets failed ingestion items to pending status for retry';


-- Function: Clean up old completed items
CREATE OR REPLACE FUNCTION cleanup_old_ingestions(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM ingestion_queue
    WHERE status = 'completed'
      AND processed_at < NOW() - (p_days_old || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_ingestions(INTEGER) IS 
  'Removes completed ingestion items older than specified days';


-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- Tables (service role will bypass RLS, but explicit grants for clarity)
GRANT ALL ON ingestion_queue TO service_role;
GRANT ALL ON document_content TO service_role;

-- Functions
GRANT EXECUTE ON FUNCTION get_next_pending_ingestion() TO service_role;
GRANT EXECUTE ON FUNCTION complete_ingestion(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION fail_ingestion(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_ingestion_queue_stats() TO service_role;
GRANT EXECUTE ON FUNCTION retry_failed_ingestions(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_ingestions(INTEGER) TO service_role;


-- ============================================
-- 8. TRIGGER: Auto-cleanup on successful processing
-- ============================================
-- Optionally, auto-archive completed items to keep queue table small
-- Commented out by default - enable if needed

-- CREATE OR REPLACE FUNCTION auto_archive_completed_ingestion()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Archive to a separate table if needed
--   -- For now, just let cleanup_old_ingestions handle it
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trigger_archive_completed_ingestion
--   AFTER UPDATE OF status ON ingestion_queue
--   FOR EACH ROW
--   WHEN (NEW.status = 'completed')
--   EXECUTE FUNCTION auto_archive_completed_ingestion();

