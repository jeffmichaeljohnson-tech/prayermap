-- ============================================
-- SEMANTIC CHUNKING SUPPORT
-- Created: 2025-12-04
-- Purpose: Add support for semantic chunking in the ingestion pipeline
-- 
-- This migration adds:
--   1. New columns to document_content for chunk tracking
--   2. Updated helper functions for chunk-aware queries
--
-- NOTE: This migration is idempotent - safe to re-run
-- ============================================


-- ============================================
-- 1. ADD COLUMNS TO document_content FOR CHUNKING
-- ============================================

-- Track number of chunks created from this document
ALTER TABLE document_content 
  ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 1;

-- Track data type for filtering/analytics
ALTER TABLE document_content 
  ADD COLUMN IF NOT EXISTS data_type TEXT;

-- Track source system
ALTER TABLE document_content 
  ADD COLUMN IF NOT EXISTS source TEXT;

-- Reference to the original queue item
ALTER TABLE document_content 
  ADD COLUMN IF NOT EXISTS created_by_queue_id UUID;

-- Chunking version for migration tracking
-- Version 0 = original (no chunking, single vector per document)
-- Version 1 = first chunking implementation (multiple vectors per document)
ALTER TABLE document_content 
  ADD COLUMN IF NOT EXISTS chunking_version INTEGER DEFAULT 0;

-- Add comments for new columns
COMMENT ON COLUMN document_content.chunk_count IS 'Number of chunks this document was split into';
COMMENT ON COLUMN document_content.data_type IS 'Type of data (session, code, deployment, etc.)';
COMMENT ON COLUMN document_content.source IS 'Source system (claude_code, cursor, github, etc.)';
COMMENT ON COLUMN document_content.created_by_queue_id IS 'Reference to the ingestion queue item that created this document';
COMMENT ON COLUMN document_content.chunking_version IS 'Chunking algorithm version (0=none, 1=semantic chunking v1)';


-- ============================================
-- 2. ADD INDEX FOR CHUNK-RELATED QUERIES
-- ============================================

-- Index for finding documents by data type
CREATE INDEX IF NOT EXISTS idx_document_content_data_type
  ON document_content(data_type)
  WHERE data_type IS NOT NULL;

-- Index for finding documents by source
CREATE INDEX IF NOT EXISTS idx_document_content_source
  ON document_content(source)
  WHERE source IS NOT NULL;

-- Index for finding un-chunked documents (for migration)
CREATE INDEX IF NOT EXISTS idx_document_content_chunking_version
  ON document_content(chunking_version)
  WHERE chunking_version = 0;


-- ============================================
-- 3. HELPER FUNCTION: GET PARENT CONTENT FOR CHUNKS
-- ============================================
-- When querying returns chunk IDs, this function retrieves the parent content

CREATE OR REPLACE FUNCTION get_parent_content_for_chunks(p_chunk_ids TEXT[])
RETURNS TABLE (
  parent_id TEXT,
  full_content TEXT,
  chunk_count INTEGER,
  data_type TEXT,
  source TEXT,
  metadata JSONB
) AS $$
BEGIN
  -- Extract parent IDs from chunk IDs (format: {parent_id}_chunk_{index})
  -- and return unique parent documents
  RETURN QUERY
  SELECT DISTINCT ON (dc.pinecone_id)
    dc.pinecone_id AS parent_id,
    dc.full_content,
    dc.chunk_count,
    dc.data_type,
    dc.source,
    dc.metadata
  FROM document_content dc
  WHERE dc.pinecone_id = ANY(
    SELECT DISTINCT
      CASE 
        WHEN position('_chunk_' in unnest) > 0 THEN
          substring(unnest from 1 for position('_chunk_' in unnest) - 1)
        ELSE
          unnest
      END
    FROM unnest(p_chunk_ids)
  )
  ORDER BY dc.pinecone_id, dc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_parent_content_for_chunks(TEXT[]) IS 
  'Given an array of chunk IDs, returns the parent document content for each unique parent';


-- ============================================
-- 4. HELPER FUNCTION: GET CHUNKS STATS
-- ============================================
-- Returns statistics about chunking in the system

CREATE OR REPLACE FUNCTION get_chunking_stats()
RETURNS TABLE (
  total_documents BIGINT,
  chunked_documents BIGINT,
  unchunked_documents BIGINT,
  total_chunks BIGINT,
  avg_chunks_per_document NUMERIC,
  by_data_type JSONB,
  by_source JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_documents,
    COUNT(*) FILTER (WHERE dc.chunking_version > 0)::BIGINT AS chunked_documents,
    COUNT(*) FILTER (WHERE dc.chunking_version = 0)::BIGINT AS unchunked_documents,
    COALESCE(SUM(dc.chunk_count), 0)::BIGINT AS total_chunks,
    ROUND(AVG(dc.chunk_count), 2) AS avg_chunks_per_document,
    (
      SELECT jsonb_object_agg(data_type, cnt)
      FROM (
        SELECT dc2.data_type, COUNT(*) as cnt
        FROM document_content dc2
        WHERE dc2.data_type IS NOT NULL
        GROUP BY dc2.data_type
      ) sub
    ) AS by_data_type,
    (
      SELECT jsonb_object_agg(source, cnt)
      FROM (
        SELECT dc3.source, COUNT(*) as cnt
        FROM document_content dc3
        WHERE dc3.source IS NOT NULL
        GROUP BY dc3.source
      ) sub
    ) AS by_source
  FROM document_content dc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_chunking_stats() IS 
  'Returns statistics about document chunking in the system';


-- ============================================
-- 5. HELPER FUNCTION: LIST UNCHUNKED DOCUMENTS
-- ============================================
-- For migration: find documents that need to be re-processed with chunking

CREATE OR REPLACE FUNCTION list_unchunked_documents(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  pinecone_id TEXT,
  data_type TEXT,
  source TEXT,
  content_length INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.pinecone_id,
    dc.data_type,
    dc.source,
    LENGTH(dc.full_content) AS content_length,
    dc.created_at
  FROM document_content dc
  WHERE dc.chunking_version = 0
  ORDER BY dc.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION list_unchunked_documents(INTEGER) IS 
  'Lists documents that have not been processed with chunking (for migration)';


-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_parent_content_for_chunks(TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION get_chunking_stats() TO service_role;
GRANT EXECUTE ON FUNCTION list_unchunked_documents(INTEGER) TO service_role;


-- ============================================
-- 7. VALIDATION QUERY
-- ============================================
-- Run this after migration to verify columns exist

DO $$
BEGIN
  -- Check that all columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_content' AND column_name = 'chunk_count'
  ) THEN
    RAISE EXCEPTION 'Migration failed: chunk_count column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_content' AND column_name = 'chunking_version'
  ) THEN
    RAISE EXCEPTION 'Migration failed: chunking_version column not created';
  END IF;
  
  RAISE NOTICE 'Chunking support migration completed successfully';
END $$;

