/**
 * process-ingestion Edge Function (Optimized)
 * 
 * High-throughput data ingestion pipeline with:
 * - Batch processing with configurable concurrency
 * - Exponential backoff retry logic
 * - Content deduplication
 * - Rate limiting for external APIs
 * - Comprehensive observability
 * - Dead Letter Queue for failed items
 * 
 * Can be triggered:
 * - By collect-data function after receiving new data
 * - By a scheduled cron job
 * - Manually via POST request
 * 
 * Endpoint: POST /functions/v1/process-ingestion
 * 
 * Request Body (optional):
 * {
 *   queue_id?: string       // Process specific item
 *   batch_size?: number     // Items per batch (default: 10, max: 50)
 *   priority_min?: number   // Only process items with priority >= this
 *   skip_dedup?: boolean    // Skip deduplication check
 * }
 * 
 * 💭 ➡️ 📈
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { chunkContent, getChunkStats, type Chunk, type ParentMetadata } from '../_shared/chunking.ts';
import { loadConfig, getEnvironmentInfo } from '../_shared/config.ts';
import { checkSystemHealth, healthStatusToHttpCode, getHealthSummary, type HealthCheckContext } from '../_shared/health-check.ts';
import { getFeatureFlagSummary } from '../_shared/feature-flags.ts';
import { 
  processBatch, 
  type BatchConfig, 
  type BatchResult 
} from '../_shared/batch-processor.ts';
import { 
  hashContent, 
  deduplicateItems,
  type DeduplicationResult 
} from '../_shared/deduplication.ts';
import { 
  OPENAI_RATE_LIMITER, 
  PINECONE_RATE_LIMITER, 
  ANTHROPIC_RATE_LIMITER 
} from '../_shared/rate-limiter.ts';
import { 
  metricsCollector,
  logProcessingEvent,
  logBatchSummary,
  collectMetrics,
  checkAlerts
} from '../_shared/ingestion-metrics.ts';
import {
  metrics as datadogMetrics,
  createRequestContext,
  finalizeRequestContext,
  logInfo,
  logError,
  flushMetrics,
} from '../_shared/datadog-metrics.ts';

// ============================================
// TYPES
// ============================================

interface IngestionQueueItem {
  id: string;
  source: string;
  data_type: string;
  content: string;
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
  priority?: number;
  retry_count?: number;
}

interface TaggingResult {
  domain: string;
  action: string;
  status: string;
  entities: string[];
  summary: string;
  importance: 'low' | 'medium' | 'high';
}

interface ProcessingResult {
  queue_id: string;
  pinecone_ids: string[];
  parent_pinecone_id: string;
  chunk_count: number;
  success: boolean;
  duration_ms: number;
  error?: string;
  deduplicated?: boolean;
}

interface ProcessingContext {
  supabase: SupabaseClient;
  anthropic: Anthropic;
  openai: OpenAI;
  pineconeIndex: ReturnType<Pinecone['index']>;
  skipDedup: boolean;
}

// ============================================
// CONFIGURATION
// ============================================

const BATCH_CONFIG: Partial<BatchConfig> = {
  batch_size: 5,           // Process 5 items at once
  max_concurrent: 2,       // 2 parallel batches
  retry_attempts: 3,       // 3 retries per item
  retry_delay_ms: 2000,    // 2s initial delay
  exponential_backoff: true,
  timeout_ms: 60000,       // 60s timeout per item
};

const MAX_BATCH_SIZE = 50;
const MAX_RETRIES_FOR_DLQ = 3;

// ============================================
// AUTO-TAGGER (Claude Haiku)
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
  // Rate limit check
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

    metricsCollector.recordApiCall('anthropic');

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
// EMBEDDER (OpenAI text-embedding-3-large)
// ============================================

async function generateEmbeddingsBatch(
  texts: string[],
  openai: OpenAI
): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const preparedBatch = batch.map(text =>
      text.replace(/\s+/g, ' ').trim().slice(0, 8000)
    );
    
    // Estimate tokens (rough: 4 chars per token)
    const estimatedTokens = preparedBatch.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);
    
    // Rate limit check
    await OPENAI_RATE_LIMITER.waitForCapacity(estimatedTokens);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: preparedBatch,
      dimensions: 3072,
    });
    
    metricsCollector.recordApiCall('openai', estimatedTokens);
    
    for (const item of response.data) {
      embeddings.push(item.embedding);
    }
  }
  
  return embeddings;
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
// PROCESS SINGLE ITEM
// ============================================

async function processItem(
  item: IngestionQueueItem,
  context: ProcessingContext
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const parentPineconeId = `${item.data_type}_${item.id}`;
  const { supabase, anthropic, openai, pineconeIndex, skipDedup } = context;

  logProcessingEvent({
    queue_id: item.id,
    status: 'started',
    attempt: (item.retry_count || 0) + 1,
  });

  try {
    // Step 0: Check for duplicate content (unless skipped)
    if (!skipDedup) {
      const contentHash = await hashContent(item.content);
      
      const { data: existing } = await supabase
        .from('document_content')
        .select('pinecone_id')
        .eq('content_hash', contentHash)
        .limit(1);
      
      if (existing && existing.length > 0) {
        console.log(`[${item.id}] Duplicate detected, skipping (hash: ${contentHash})`);
        
        // Mark as completed (duplicate)
        await supabase.rpc('complete_ingestion', {
          p_queue_id: item.id,
          p_pinecone_id: existing[0].pinecone_id,
        });
        
        metricsCollector.recordDuplicates(1);
        
        const duration = Date.now() - startTime;
        logProcessingEvent({
          queue_id: item.id,
          status: 'completed',
          duration_ms: duration,
        });
        
        return {
          queue_id: item.id,
          parent_pinecone_id: existing[0].pinecone_id,
          pinecone_ids: [],
          chunk_count: 0,
          success: true,
          deduplicated: true,
          duration_ms: duration,
        };
      }
    }

    // Step 1: Auto-tag content
    console.log(`[${item.id}] Auto-tagging content...`);
    const tags = await autoTag(item.content, item.source, item.data_type, anthropic);

    // Step 2: Prepare parent metadata
    const timestamp = item.created_at;
    const parentMetadata: ParentMetadata = {
      source: item.source,
      data_type: item.data_type,
      project: (item.metadata.project as string) || 'prayermap',
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

    // Step 3: Chunk the content
    console.log(`[${item.id}] Chunking content (data_type: ${item.data_type})...`);
    const chunks = chunkContent(item.content, parentPineconeId, parentMetadata);
    const stats = getChunkStats(chunks);
    console.log(`[${item.id}] Created ${stats.total_chunks} chunks (avg ${stats.avg_tokens_per_chunk} tokens)`);

    // Step 4: Generate embeddings for all chunks
    console.log(`[${item.id}] Generating embeddings for ${chunks.length} chunks...`);
    const chunkTexts = chunks.map(c => c.content);
    const embeddings = await generateEmbeddingsBatch(chunkTexts, openai);

    // Step 5: Prepare vectors for Pinecone
    const vectors = chunks.map((chunk, idx) => ({
      id: chunk.id,
      values: embeddings[idx],
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
        ...(item.metadata.files_changed && { files_changed: item.metadata.files_changed }),
        ...(item.metadata.commit_hash && { commit_hash: item.metadata.commit_hash }),
        ...(item.metadata.branch && { branch: item.metadata.branch }),
      },
    }));

    // Step 6: Store vectors in Pinecone (batch upsert with rate limiting)
    console.log(`[${item.id}] Storing ${vectors.length} vectors in Pinecone...`);
    
    const PINECONE_BATCH_SIZE = 100;
    for (let i = 0; i < vectors.length; i += PINECONE_BATCH_SIZE) {
      await PINECONE_RATE_LIMITER.waitForCapacity();
      const batch = vectors.slice(i, i + PINECONE_BATCH_SIZE);
      await pineconeIndex.upsert(batch);
      metricsCollector.recordApiCall('pinecone');
    }

    // Step 7: Generate and store content hash
    const contentHash = await hashContent(item.content);

    // Step 8: Store full content in Supabase
    console.log(`[${item.id}] Storing full content...`);
    const { error: contentError } = await supabase.from('document_content').upsert(
      {
        pinecone_id: parentPineconeId,
        full_content: item.content,
        content_hash: contentHash,
        chunk_count: chunks.length,
        data_type: item.data_type,
        source: item.source,
        created_by_queue_id: item.id,
        chunking_version: 1,
        metadata: {
          ...parentMetadata,
          chunk_ids: chunks.map(c => c.id),
          stats,
        },
      },
      { onConflict: 'pinecone_id' }
    );

    if (contentError) {
      console.warn(`[${item.id}] Failed to store full content:`, contentError);
    }

    // Step 9: Mark as completed
    const { error: updateError } = await supabase.rpc('complete_ingestion', {
      p_queue_id: item.id,
      p_pinecone_id: parentPineconeId,
    });

    if (updateError) {
      console.error(`[${item.id}] Failed to mark as completed:`, updateError);
      throw updateError;
    }

    const duration = Date.now() - startTime;
    console.log(`[${item.id}] Successfully processed (${chunks.length} chunks in ${duration}ms)`);
    
    logProcessingEvent({
      queue_id: item.id,
      status: 'completed',
      chunks: chunks.length,
      duration_ms: duration,
    });

    return {
      queue_id: item.id,
      parent_pinecone_id: parentPineconeId,
      pinecone_ids: chunks.map(c => c.id),
      chunk_count: chunks.length,
      success: true,
      duration_ms: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`[${item.id}] Processing failed:`, error);
    
    logProcessingEvent({
      queue_id: item.id,
      status: 'failed',
      duration_ms: duration,
      error: errorMessage,
      attempt: (item.retry_count || 0) + 1,
    });

    // Use the new retry function that handles DLQ
    await supabase.rpc('fail_ingestion_with_retry', {
      p_queue_id: item.id,
      p_error_message: errorMessage,
      p_max_retries: MAX_RETRIES_FOR_DLQ,
    });

    return {
      queue_id: item.id,
      parent_pinecone_id: parentPineconeId,
      pinecone_ids: [],
      chunk_count: 0,
      success: false,
      error: errorMessage,
      duration_ms: duration,
    };
  }
}

// ============================================
// HEALTH CHECK HANDLER
// ============================================

async function handleIngestionHealthCheck(): Promise<Response> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Build health check context
  const healthContext: HealthCheckContext = {};

  if (openaiApiKey) {
    healthContext.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  if (pineconeApiKey) {
    healthContext.pinecone = new Pinecone({ apiKey: pineconeApiKey });
  }

  if (supabaseUrl && supabaseServiceKey) {
    healthContext.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  const health = await checkSystemHealth(healthContext);
  const httpCode = healthStatusToHttpCode(health.overall);

  // Log health check results
  console.log(`Ingestion health check: ${getHealthSummary(health)}`);

  return new Response(JSON.stringify(health), {
    status: httpCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // Health check endpoint
  if (url.pathname.endsWith('/health') || url.searchParams.get('health') === 'true') {
    return handleIngestionHealthCheck();
  }

  // Config endpoint (for debugging)
  if (url.pathname.endsWith('/config') || url.searchParams.get('config') === 'true') {
    const config = loadConfig();
    const envInfo = getEnvironmentInfo();
    const flagSummary = getFeatureFlagSummary();

    return jsonResponse({
      environment: envInfo,
      features: config.features,
      feature_flags: flagSummary,
      ingestion: config.ingestion,
      chunking: config.chunking,
    });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  const requestStartTime = Date.now();
  const requestContext = createRequestContext('rag-ingestion');
  metricsCollector.reset(); // Reset per-request metrics

  try {
    // Parse request body
    let queueId: string | undefined;
    let batchSize = 10;
    let priorityMin = 0;
    let skipDedup = false;

    try {
      const body = await req.json();
      queueId = body.queue_id;
      batchSize = Math.min(body.batch_size || 10, MAX_BATCH_SIZE);
      priorityMin = body.priority_min || 0;
      skipDedup = body.skip_dedup || false;
    } catch {
      // No body is fine
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
    const pineconeIndexName = Deno.env.get('PINECONE_INDEX') || 'prayermap-memory';

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Missing Supabase configuration', 500);
    }
    if (!anthropicApiKey) {
      return errorResponse('Missing Anthropic API key', 500);
    }
    if (!openaiApiKey) {
      return errorResponse('Missing OpenAI API key', 500);
    }
    if (!pineconeApiKey) {
      return errorResponse('Missing Pinecone API key', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    const pineconeIndex = pinecone.index(pineconeIndexName);

    // Create processing context
    const context: ProcessingContext = {
      supabase,
      anthropic,
      openai,
      pineconeIndex,
      skipDedup,
    };

    // Reset stale processing items first
    const { data: resetCount } = await supabase.rpc('reset_stale_processing', {
      p_timeout_minutes: 30,
    });
    if (resetCount && resetCount > 0) {
      console.log(`Reset ${resetCount} stale processing items`);
    }

    // Get items to process
    let items: IngestionQueueItem[];

    if (queueId) {
      // Process specific item
      const { data, error } = await supabase
        .from('ingestion_queue')
        .select('*')
        .eq('id', queueId)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        return errorResponse('Queue item not found or not pending', 404);
      }

      items = [data as IngestionQueueItem];
    } else {
      // Get batch of pending items using the new function
      const { data, error } = await supabase.rpc('get_pending_batch', {
        p_limit: batchSize,
      });

      if (error) {
        console.error('Failed to get pending batch:', error);
        return errorResponse('Failed to get pending items', 500);
      }

      items = (data || []) as IngestionQueueItem[];
    }

    if (items.length === 0) {
      // Collect and log metrics even when idle
      const metrics = await collectMetrics(supabase);
      const alerts = checkAlerts(metrics);
      
      return jsonResponse({
        message: 'No pending items to process',
        processed: 0,
        results: [],
        metrics: {
          queue_health: metrics.queue.health,
          pending_count: metrics.queue.pending_count,
          alerts: alerts.length,
        },
      });
    }

    console.log(`Processing batch of ${items.length} items...`);

    // Process items using batch processor with retry logic
    const batchResult: BatchResult<ProcessingResult> = await processBatch(
      items,
      (item) => processItem(item, context),
      BATCH_CONFIG
    );

    const successfulResults = batchResult.successful;
    const failedResults = batchResult.failed;

    const totalChunks = successfulResults.reduce((sum, r) => sum + r.chunk_count, 0);
    const duplicates = successfulResults.filter(r => r.deduplicated).length;

    // Log batch summary
    logBatchSummary({
      batch_size: items.length,
      successful: successfulResults.length,
      failed: failedResults.length,
      total_chunks: totalChunks,
      duration_ms: batchResult.timing.total_ms,
      items_per_second: batchResult.summary.items_per_second,
    });

    // Emit Datadog metrics
    await datadogMetrics.itemsIngested(successfulResults.length);
    await datadogMetrics.ingestionLatency(batchResult.timing.total_ms);
    await datadogMetrics.chunkCount(totalChunks, 'mixed');
    if (duplicates > 0) {
      await datadogMetrics.duplicatesDetected(duplicates);
    }

    // Collect metrics and check alerts
    const collectedMetrics = await collectMetrics(supabase);
    const alerts = checkAlerts(collectedMetrics);
    
    // Emit queue depth to Datadog
    await datadogMetrics.queueDepth(collectedMetrics.queue.pending_count);
    await datadogMetrics.dlqCount(collectedMetrics.errors.in_dlq);

    if (alerts.length > 0) {
      logInfo(`[ALERTS] ${alerts.length} alert(s) triggered`, { alerts: alerts.length }, requestContext.traceId);
    }

    // Finalize request context
    await finalizeRequestContext(requestContext, failedResults.length === 0, {
      items_processed: items.length,
      chunks_created: totalChunks,
      duplicates,
    });

    const response = {
      message: `Processed ${items.length} items into ${totalChunks} chunks`,
      processed: items.length,
      successful: successfulResults.length,
      failed: failedResults.length,
      duplicates,
      total_chunks: totalChunks,
      timing: {
        total_ms: batchResult.timing.total_ms,
        avg_per_item_ms: batchResult.timing.avg_per_item_ms,
        items_per_second: batchResult.summary.items_per_second,
      },
      metrics: {
        queue_health: collectedMetrics.queue.health,
        pending_count: collectedMetrics.queue.pending_count,
        error_rate: collectedMetrics.errors.error_rate_percent,
        dlq_count: collectedMetrics.errors.in_dlq,
        alerts: alerts.map(a => ({ severity: a.severity, message: a.message })),
      },
      trace_id: requestContext.traceId,
      results: successfulResults.map(r => ({
        queue_id: r.queue_id,
        parent_id: r.parent_pinecone_id,
        chunks: r.chunk_count,
        deduplicated: r.deduplicated || false,
      })),
      failures: failedResults.map(f => ({
        queue_id: (f.item as IngestionQueueItem).id,
        error: f.error,
        attempts: f.attempts,
        retryable: f.retryable,
      })),
    };

    return jsonResponse(response);
  } catch (error) {
    logError('Unexpected error in process-ingestion', error, undefined, requestContext.traceId);
    await datadogMetrics.errorCount(error instanceof Error ? error.name : 'unknown', 'rag-ingestion');
    await finalizeRequestContext(requestContext, false, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
