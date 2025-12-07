/**
 * Unified Ingestion Pipeline
 *
 * Orchestrates content ingestion into the RAG system:
 * - Content deduplication
 * - Semantic chunking
 * - Dense embedding generation
 * - Sparse embedding generation (for hybrid search)
 * - Pinecone vector upsert
 * - Supabase content storage
 *
 * Usage:
 *   import { executeIngestionPipeline } from './_shared/ingestion-pipeline.ts';
 *   const result = await executeIngestionPipeline(request, context);
 *
 * 💭 ➡️ 📈
 */

import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0';
import { loadConfig, type RAGConfig } from './config.ts';
import { isFeatureFlagEnabled } from './feature-flags.ts';
import { chunkContent, getChunkStats, type Chunk, type ParentMetadata } from './chunking.ts';
import { hashContent, deduplicateItems } from './deduplication.ts';
import {
  generateSparseEmbedding,
  type SparseValues,
} from './sparse-embedding.ts';
import {
  OPENAI_RATE_LIMITER,
  PINECONE_RATE_LIMITER,
  ANTHROPIC_RATE_LIMITER,
} from './rate-limiter.ts';

// ============================================
// TYPES
// ============================================

export interface IngestionRequest {
  content: string;
  data_type: string;
  source: string;
  metadata: Record<string, unknown>;
  options?: Partial<IngestionOptions>;
  queue_id?: string; // For tracking
}

export interface IngestionOptions {
  chunking_strategy: 'fixed' | 'semantic' | 'hybrid';
  generate_sparse: boolean;
  deduplicate: boolean;
  auto_tag: boolean;
  priority: number;
}

export interface IngestionContext {
  supabase: SupabaseClient;
  openai: OpenAI;
  pinecone: Pinecone;
  pinecone_index: string;
  anthropic?: Anthropic;
}

export interface IngestionResult {
  document_id: string;
  chunks_created: number;
  vectors_upserted: number;
  duplicates_skipped: number;
  tags?: TaggingResult;
  timing: {
    chunking_ms: number;
    tagging_ms: number;
    embedding_ms: number;
    sparse_ms: number;
    upsert_ms: number;
    storage_ms: number;
    total_ms: number;
  };
  success: boolean;
  error?: string;
}

export interface TaggingResult {
  domain: string;
  action: string;
  status: string;
  entities: string[];
  summary: string;
  importance: 'low' | 'medium' | 'high';
}

interface ChunkVector {
  id: string;
  values: number[];
  sparseValues?: SparseValues;
  metadata: Record<string, unknown>;
}

// ============================================
// AUTO-TAGGING
// ============================================

const TAGGING_PROMPT = `Analyze this development activity and extract metadata tags.

Content to analyze:
<content>
{content}
</content>

Source: {source}
Data Type: {data_type}

Extract the following in JSON format:
1. domain: one of [frontend, backend, database, infrastructure, design, research, debugging, testing, security, performance]
2. action: one of [create, update, delete, fix, research, deploy, configure, troubleshoot, document, refactor]
3. status: one of [success, failure, in_progress, abandoned, partial]
4. entities: array of specific names mentioned (files, functions, tables, features, technologies) - max 10 items
5. summary: one sentence summary (max 100 characters)
6. importance: one of [low, medium, high]

Return ONLY valid JSON, no other text. Example:
{"domain":"database","action":"fix","status":"success","entities":["prayer_support","RLS","policy"],"summary":"Fixed memorial lines by adding RLS policy","importance":"medium"}`;

async function autoTag(
  content: string,
  source: string,
  dataType: string,
  anthropic: Anthropic
): Promise<TaggingResult> {
  await ANTHROPIC_RATE_LIMITER.waitForCapacity();

  try {
    const prompt = TAGGING_PROMPT
      .replace('{content}', content.slice(0, 4000))
      .replace('{source}', source)
      .replace('{data_type}', dataType);

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        domain: parsed.domain || 'research',
        action: parsed.action || 'update',
        status: parsed.status || 'success',
        entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 10) : [],
        summary: (parsed.summary || content.slice(0, 100)).slice(0, 100),
        importance: parsed.importance || 'medium',
      };
    }

    throw new Error('No valid JSON in response');
  } catch (error) {
    console.warn('Auto-tagging failed, using defaults:', error);
    return {
      domain: 'research',
      action: 'update',
      status: 'success',
      entities: [],
      summary: content.slice(0, 100),
      importance: 'medium',
    };
  }
}

// ============================================
// EMBEDDING GENERATION
// ============================================

async function generateDenseEmbeddingsBatch(
  texts: string[],
  openai: OpenAI
): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const preparedBatch = batch.map((text) =>
      text.replace(/\s+/g, ' ').trim().slice(0, 8000)
    );

    // Estimate tokens
    const estimatedTokens = preparedBatch.reduce(
      (sum, t) => sum + Math.ceil(t.length / 4),
      0
    );

    await OPENAI_RATE_LIMITER.waitForCapacity(estimatedTokens);

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: preparedBatch,
      dimensions: 3072,
    });

    for (const item of response.data) {
      embeddings.push(item.embedding);
    }
  }

  return embeddings;
}

async function generateSparseEmbeddingsBatch(
  texts: string[],
  pinecone: Pinecone
): Promise<SparseValues[]> {
  const results: SparseValues[] = [];

  for (const text of texts) {
    try {
      const result = await generateSparseEmbedding(pinecone, text, {
        inputType: 'passage',
      });
      results.push(result.sparse_values);
    } catch (error) {
      console.warn('Sparse embedding failed for chunk:', error);
      // Return empty sparse vector on failure
      results.push({ indices: [], values: [] });
    }
  }

  return results;
}

// ============================================
// TEMPORAL HELPERS
// ============================================

function getSessionDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function getISOWeek(timestamp: string): string {
  const date = new Date(timestamp);
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

// ============================================
// MAIN PIPELINE
// ============================================

/**
 * Execute the unified ingestion pipeline
 *
 * Pipeline order:
 * 1. Deduplication check
 * 2. Auto-tagging (if enabled)
 * 3. Content chunking
 * 4. Dense embedding generation
 * 5. Sparse embedding generation (if hybrid enabled)
 * 6. Pinecone vector upsert
 * 7. Supabase content storage
 */
export async function executeIngestionPipeline(
  request: IngestionRequest,
  context: IngestionContext
): Promise<IngestionResult> {
  const config = loadConfig();
  const startTime = Date.now();
  const timing = {
    chunking_ms: 0,
    tagging_ms: 0,
    embedding_ms: 0,
    sparse_ms: 0,
    upsert_ms: 0,
    storage_ms: 0,
    total_ms: 0,
  };

  const documentId = crypto.randomUUID();
  const parentPineconeId = `${request.data_type}_${documentId}`;

  // Build effective options
  const options: IngestionOptions = {
    chunking_strategy:
      request.options?.chunking_strategy ?? config.chunking.default_strategy,
    generate_sparse:
      request.options?.generate_sparse ?? config.features.hybrid_search_enabled,
    deduplicate: request.options?.deduplicate ?? config.ingestion.deduplication_enabled,
    auto_tag: request.options?.auto_tag ?? true,
    priority: request.options?.priority ?? 0,
  };

  try {
    // ===== STEP 1: Deduplication Check =====
    if (options.deduplicate) {
      const contentHash = await hashContent(request.content);

      const { data: existing } = await context.supabase
        .from('document_content')
        .select('pinecone_id')
        .eq('content_hash', contentHash)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Duplicate detected for document (hash: ${contentHash})`);
        return {
          document_id: existing[0].pinecone_id,
          chunks_created: 0,
          vectors_upserted: 0,
          duplicates_skipped: 1,
          timing: { ...timing, total_ms: Date.now() - startTime },
          success: true,
        };
      }
    }

    // ===== STEP 2: Auto-Tagging =====
    let tags: TaggingResult | undefined;
    if (options.auto_tag && context.anthropic && isFeatureFlagEnabled('auto-tagging')) {
      const tagStart = Date.now();
      tags = await autoTag(
        request.content,
        request.source,
        request.data_type,
        context.anthropic
      );
      timing.tagging_ms = Date.now() - tagStart;
    } else {
      tags = {
        domain: 'research',
        action: 'update',
        status: 'success',
        entities: [],
        summary: request.content.slice(0, 100),
        importance: 'medium',
      };
    }

    // ===== STEP 3: Prepare Parent Metadata =====
    const timestamp = new Date().toISOString();
    const parentMetadata: ParentMetadata = {
      source: request.source,
      data_type: request.data_type,
      project: (request.metadata.project as string) || 'prayermap',
      domain: tags.domain,
      action: tags.action,
      status: tags.status,
      entities: tags.entities,
      summary: tags.summary,
      importance: tags.importance,
      timestamp,
      session_date: getSessionDate(timestamp),
      week: getISOWeek(timestamp),
    };

    // ===== STEP 4: Content Chunking =====
    const chunkStart = Date.now();
    const chunks = chunkContent(request.content, parentPineconeId, parentMetadata);
    timing.chunking_ms = Date.now() - chunkStart;

    const stats = getChunkStats(chunks);
    console.log(
      `Created ${stats.total_chunks} chunks (avg ${stats.avg_tokens_per_chunk} tokens)`
    );

    // ===== STEP 5: Dense Embedding Generation =====
    const embeddingStart = Date.now();
    const chunkTexts = chunks.map((c) => c.content);
    const denseEmbeddings = await generateDenseEmbeddingsBatch(chunkTexts, context.openai);
    timing.embedding_ms = Date.now() - embeddingStart;

    // ===== STEP 6: Sparse Embedding Generation (if hybrid enabled) =====
    let sparseEmbeddings: SparseValues[] | undefined;
    if (options.generate_sparse && isFeatureFlagEnabled('hybrid-search')) {
      const sparseStart = Date.now();
      sparseEmbeddings = await generateSparseEmbeddingsBatch(chunkTexts, context.pinecone);
      timing.sparse_ms = Date.now() - sparseStart;
    }

    // ===== STEP 7: Build Vectors =====
    const vectors: ChunkVector[] = chunks.map((chunk, idx) => {
      const vector: ChunkVector = {
        id: chunk.id,
        values: denseEmbeddings[idx],
        metadata: {
          id: chunk.id,
          parent_id: chunk.parent_id,
          data_type: chunk.metadata.data_type,
          source: chunk.metadata.source,
          project: chunk.metadata.project || 'prayermap',
          domain: chunk.metadata.domain,
          action: chunk.metadata.action,
          status: chunk.metadata.status,
          entities: chunk.metadata.entities,
          summary: chunk.metadata.summary,
          importance: chunk.metadata.importance,
          timestamp: chunk.metadata.timestamp,
          session_date: chunk.metadata.session_date,
          week: chunk.metadata.week,
          chunk_index: chunk.metadata.chunk_index,
          total_chunks: chunk.metadata.total_chunks,
          is_chunk: true,
          has_code_block: chunk.metadata.has_code_block,
          has_error: chunk.metadata.has_error,
          has_header: chunk.metadata.has_header,
          section_title: chunk.metadata.section_title,
          token_count: chunk.token_count,
          content_preview: chunk.metadata.content_preview,
          // Pass through additional metadata
          ...(request.metadata.files_changed && {
            files_changed: request.metadata.files_changed,
          }),
          ...(request.metadata.commit_hash && {
            commit_hash: request.metadata.commit_hash,
          }),
          ...(request.metadata.branch && { branch: request.metadata.branch }),
        },
      };

      // Add sparse values if available
      if (sparseEmbeddings?.[idx] && sparseEmbeddings[idx].indices.length > 0) {
        vector.sparseValues = sparseEmbeddings[idx];
      }

      return vector;
    });

    // ===== STEP 8: Upsert to Pinecone =====
    const upsertStart = Date.now();
    const index = context.pinecone.index(context.pinecone_index);

    const PINECONE_BATCH_SIZE = 100;
    for (let i = 0; i < vectors.length; i += PINECONE_BATCH_SIZE) {
      await PINECONE_RATE_LIMITER.waitForCapacity();
      const batch = vectors.slice(i, i + PINECONE_BATCH_SIZE);
      await index.upsert(batch);
    }
    timing.upsert_ms = Date.now() - upsertStart;

    // ===== STEP 9: Store Content in Supabase =====
    const storageStart = Date.now();
    const contentHash = await hashContent(request.content);

    const { error: contentError } = await context.supabase
      .from('document_content')
      .upsert(
        {
          pinecone_id: parentPineconeId,
          full_content: request.content,
          content_hash: contentHash,
          chunk_count: chunks.length,
          data_type: request.data_type,
          source: request.source,
          created_by_queue_id: request.queue_id,
          chunking_version: 1,
          metadata: {
            ...parentMetadata,
            chunk_ids: chunks.map((c) => c.id),
            stats,
          },
        },
        { onConflict: 'pinecone_id' }
      );

    if (contentError) {
      console.warn('Failed to store full content:', contentError);
    }
    timing.storage_ms = Date.now() - storageStart;

    timing.total_ms = Date.now() - startTime;

    return {
      document_id: parentPineconeId,
      chunks_created: chunks.length,
      vectors_upserted: vectors.length,
      duplicates_skipped: 0,
      tags,
      timing,
      success: true,
    };
  } catch (error) {
    timing.total_ms = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ingestion pipeline failed:', error);

    return {
      document_id: parentPineconeId,
      chunks_created: 0,
      vectors_upserted: 0,
      duplicates_skipped: 0,
      timing,
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// BATCH INGESTION
// ============================================

export interface BatchIngestionRequest {
  items: IngestionRequest[];
  options?: Partial<IngestionOptions>;
}

export interface BatchIngestionResult {
  successful: IngestionResult[];
  failed: Array<{
    request: IngestionRequest;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    total_chunks: number;
    total_vectors: number;
    duplicates_skipped: number;
    total_time_ms: number;
  };
}

/**
 * Execute batch ingestion with parallel processing
 */
export async function executeBatchIngestion(
  request: BatchIngestionRequest,
  context: IngestionContext,
  concurrency = 2
): Promise<BatchIngestionResult> {
  const startTime = Date.now();
  const successful: IngestionResult[] = [];
  const failed: Array<{ request: IngestionRequest; error: string }> = [];

  // Process in batches with limited concurrency
  for (let i = 0; i < request.items.length; i += concurrency) {
    const batch = request.items.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map((item) =>
        executeIngestionPipeline(
          { ...item, options: { ...request.options, ...item.options } },
          context
        )
      )
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled' && result.value.success) {
        successful.push(result.value);
      } else {
        const error =
          result.status === 'rejected'
            ? result.reason?.message || 'Unknown error'
            : result.value.error || 'Unknown error';
        failed.push({ request: batch[j], error });
      }
    }
  }

  const totalChunks = successful.reduce((sum, r) => sum + r.chunks_created, 0);
  const totalVectors = successful.reduce((sum, r) => sum + r.vectors_upserted, 0);
  const duplicatesSkipped = successful.reduce((sum, r) => sum + r.duplicates_skipped, 0);

  return {
    successful,
    failed,
    summary: {
      total: request.items.length,
      successful: successful.length,
      failed: failed.length,
      total_chunks: totalChunks,
      total_vectors: totalVectors,
      duplicates_skipped: duplicatesSkipped,
      total_time_ms: Date.now() - startTime,
    },
  };
}

