/**
 * Datadog Metrics Integration for RAG Pipeline
 * 
 * Provides structured metric emission and logging for observability.
 * Sends metrics to Datadog via REST API for monitoring dashboards and alerts.
 * 
 * Features:
 * - Metric emission (counters, gauges, rates)
 * - Structured JSON logging
 * - Trace context propagation
 * - Batch metric submission
 * - Error tracking
 * 
 * Environment Variables Required:
 * - DATADOG_API_KEY: Server-side Datadog API key
 * - DD_SITE: Datadog site (default: datadoghq.com)
 * - ENVIRONMENT: Current environment (production/development)
 * 
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export type MetricType = 'count' | 'gauge' | 'rate';

export interface MetricData {
  name: string;
  value: number;
  type: MetricType;
  tags?: string[];
  timestamp?: number;
}

export interface MetricSeries {
  metric: string;
  points: Array<{
    timestamp: number;
    value: number;
  }>;
  type: number; // 0 = count, 1 = rate, 2 = gauge
  tags: string[];
  host?: string;
}

export interface StructuredLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  service: string;
  component: 'rag-query' | 'rag-ingestion' | 'rag-rerank' | 'rag-chunking';
  trace_id?: string;
  span_id?: string;
  duration_ms?: number;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

// ============================================
// CONFIGURATION
// ============================================

const DD_SITE = Deno.env.get('DD_SITE') || 'datadoghq.com';
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'development';
const SERVICE_NAME = 'prayermap';

// Metric type mapping for Datadog API
const METRIC_TYPE_MAP: Record<MetricType, number> = {
  count: 0,
  rate: 1,
  gauge: 2,
};

// ============================================
// METRIC BUFFER
// ============================================

class MetricBuffer {
  private buffer: MetricSeries[] = [];
  private flushTimer: number | null = null;
  private readonly FLUSH_INTERVAL_MS = 10000; // 10 seconds
  private readonly MAX_BUFFER_SIZE = 100;

  /**
   * Add a metric to the buffer
   */
  add(series: MetricSeries): void {
    this.buffer.push(series);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    } else if (!this.flushTimer) {
      // Start flush timer if not running
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL_MS);
    }
  }

  /**
   * Flush buffered metrics to Datadog
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const metricsToSend = [...this.buffer];
    this.buffer = [];

    await submitMetricsBatch(metricsToSend);
  }

  /**
   * Get current buffer size
   */
  size(): number {
    return this.buffer.length;
  }
}

// Global metric buffer
const metricBuffer = new MetricBuffer();

// ============================================
// METRIC SUBMISSION
// ============================================

/**
 * Submit a batch of metrics to Datadog
 */
async function submitMetricsBatch(series: MetricSeries[]): Promise<void> {
  const apiKey = Deno.env.get('DATADOG_API_KEY');
  
  if (!apiKey) {
    // Log locally if Datadog isn't configured
    console.log(JSON.stringify({
      type: 'datadog_metrics_skipped',
      reason: 'DATADOG_API_KEY not configured',
      metrics_count: series.length,
    }));
    return;
  }

  try {
    const response = await fetch(`https://api.${DD_SITE}/api/v2/series`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': apiKey,
      },
      body: JSON.stringify({ series }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Datadog metrics submission failed:', response.status, errorText);
    }
  } catch (error) {
    console.error('Error submitting metrics to Datadog:', error);
  }
}

/**
 * Emit a single metric
 */
export async function emitMetric(metric: MetricData): Promise<void> {
  const timestamp = metric.timestamp || Math.floor(Date.now() / 1000);
  
  const series: MetricSeries = {
    metric: `prayermap.rag.${metric.name}`,
    points: [{ timestamp, value: metric.value }],
    type: METRIC_TYPE_MAP[metric.type],
    tags: [
      `service:${SERVICE_NAME}`,
      'component:rag',
      `env:${ENVIRONMENT}`,
      ...(metric.tags || []),
    ],
  };

  metricBuffer.add(series);
}

/**
 * Emit a metric and immediately flush (for critical metrics)
 */
export async function emitMetricImmediate(metric: MetricData): Promise<void> {
  const timestamp = metric.timestamp || Math.floor(Date.now() / 1000);
  
  const series: MetricSeries = {
    metric: `prayermap.rag.${metric.name}`,
    points: [{ timestamp, value: metric.value }],
    type: METRIC_TYPE_MAP[metric.type],
    tags: [
      `service:${SERVICE_NAME}`,
      'component:rag',
      `env:${ENVIRONMENT}`,
      ...(metric.tags || []),
    ],
  };

  await submitMetricsBatch([series]);
}

/**
 * Flush any buffered metrics
 */
export async function flushMetrics(): Promise<void> {
  await metricBuffer.flush();
}

// ============================================
// CONVENIENCE METRIC FUNCTIONS
// ============================================

export const metrics = {
  // Query metrics
  queryLatency: (ms: number, tags?: string[]) =>
    emitMetric({ name: 'query_latency', value: ms, type: 'gauge', tags }),

  queryCount: (tags?: string[]) =>
    emitMetric({ name: 'queries', value: 1, type: 'count', tags }),

  queryError: (errorType: string) =>
    emitMetric({ name: 'query_errors', value: 1, type: 'count', tags: [`error_type:${errorType}`] }),

  // Error metrics
  errorCount: (errorType: string, component?: string) =>
    emitMetric({ 
      name: 'errors', 
      value: 1, 
      type: 'count', 
      tags: [`error_type:${errorType}`, component ? `component:${component}` : ''].filter(Boolean) 
    }),

  // Ingestion metrics
  queueDepth: (depth: number) =>
    emitMetric({ name: 'queue_depth', value: depth, type: 'gauge' }),

  ingestionLatency: (ms: number, dataType?: string) =>
    emitMetric({ 
      name: 'ingestion_latency', 
      value: ms, 
      type: 'gauge', 
      tags: dataType ? [`data_type:${dataType}`] : [] 
    }),

  itemsIngested: (count: number, dataType?: string) =>
    emitMetric({ 
      name: 'items_ingested', 
      value: count, 
      type: 'count', 
      tags: dataType ? [`data_type:${dataType}`] : [] 
    }),

  // Chunking metrics
  chunkCount: (count: number, dataType: string) =>
    emitMetric({ name: 'chunks_created', value: count, type: 'count', tags: [`data_type:${dataType}`] }),

  avgChunkSize: (tokens: number, dataType: string) =>
    emitMetric({ name: 'avg_chunk_tokens', value: tokens, type: 'gauge', tags: [`data_type:${dataType}`] }),

  // Rerank metrics
  rerankLatency: (ms: number, provider: string) =>
    emitMetric({ name: 'rerank_latency', value: ms, type: 'gauge', tags: [`provider:${provider}`] }),

  rerankAttempt: (provider: string) =>
    emitMetric({ name: 'rerank_attempts', value: 1, type: 'count', tags: [`provider:${provider}`] }),

  rerankFallback: (fromProvider: string, toProvider: string) =>
    emitMetric({ 
      name: 'rerank_fallback', 
      value: 1, 
      type: 'count', 
      tags: [`from:${fromProvider}`, `to:${toProvider}`] 
    }),

  rerankSuccess: (provider: string, documentsReranked: number) =>
    emitMetric({ 
      name: 'rerank_success', 
      value: 1, 
      type: 'count', 
      tags: [`provider:${provider}`, `docs:${documentsReranked}`] 
    }),

  // Embedding metrics
  embeddingLatency: (ms: number) =>
    emitMetric({ name: 'embedding_latency', value: ms, type: 'gauge' }),

  embeddingTokens: (tokens: number) =>
    emitMetric({ name: 'embedding_tokens', value: tokens, type: 'count' }),

  // Hybrid search metrics
  hybridSearchAlpha: (alpha: number, source: string) =>
    emitMetric({ name: 'hybrid_alpha', value: alpha, type: 'gauge', tags: [`source:${source}`] }),

  sparseTermsCount: (count: number) =>
    emitMetric({ name: 'sparse_terms', value: count, type: 'gauge' }),

  // API usage metrics
  apiCallCount: (service: 'openai' | 'cohere' | 'pinecone' | 'anthropic') =>
    emitMetric({ name: 'api_calls', value: 1, type: 'count', tags: [`service:${service}`] }),

  apiCost: (service: string, costUsd: number) =>
    emitMetric({ name: 'api_cost_usd', value: costUsd, type: 'count', tags: [`service:${service}`] }),

  // Dead Letter Queue
  dlqCount: (count: number) =>
    emitMetric({ name: 'dlq_count', value: count, type: 'gauge' }),

  dlqAdded: () =>
    emitMetric({ name: 'dlq_added', value: 1, type: 'count' }),

  // Deduplication
  duplicatesDetected: (count: number) =>
    emitMetric({ name: 'duplicates_detected', value: count, type: 'count' }),
};

// ============================================
// STRUCTURED LOGGING
// ============================================

/**
 * Generate a trace ID for request correlation
 */
export function generateTraceId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

/**
 * Generate a span ID for operation tracking
 */
export function generateSpanId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 8);
}

/**
 * Log a structured event (Datadog-compatible format)
 */
export function log(entry: Partial<StructuredLog> & { message: string; level: StructuredLog['level'] }): void {
  const fullEntry: StructuredLog = {
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    component: entry.component || 'rag-query',
    ...entry,
  };

  // Console output (picked up by Supabase → Datadog log ingestion)
  console.log(JSON.stringify(fullEntry));
}

/**
 * Log debug level
 */
export function logDebug(message: string, metadata?: Record<string, unknown>, traceId?: string): void {
  log({ level: 'debug', message, metadata, trace_id: traceId });
}

/**
 * Log info level
 */
export function logInfo(message: string, metadata?: Record<string, unknown>, traceId?: string): void {
  log({ level: 'info', message, metadata, trace_id: traceId });
}

/**
 * Log warning level
 */
export function logWarn(message: string, metadata?: Record<string, unknown>, traceId?: string): void {
  log({ level: 'warn', message, metadata, trace_id: traceId });
}

/**
 * Log error level
 */
export function logError(
  message: string, 
  error?: Error | unknown, 
  metadata?: Record<string, unknown>,
  traceId?: string
): void {
  const errorInfo = error instanceof Error 
    ? { type: error.name, message: error.message, stack: error.stack }
    : error 
      ? { type: 'Unknown', message: String(error) }
      : undefined;

  log({ 
    level: 'error', 
    message, 
    error: errorInfo, 
    metadata,
    trace_id: traceId,
  });

  // Also emit error metric
  metrics.errorCount(errorInfo?.type || 'unknown');
}

// ============================================
// TIMING HELPERS
// ============================================

/**
 * Create a timer for measuring operation duration
 */
export function createTimer(): { elapsed: () => number } {
  const start = performance.now();
  return {
    elapsed: () => Math.round(performance.now() - start),
  };
}

/**
 * Measure and emit latency for an operation
 */
export async function measureLatency<T>(
  operation: string,
  metricEmitter: (ms: number) => Promise<void>,
  fn: () => Promise<T>,
  traceId?: string
): Promise<{ result: T; durationMs: number }> {
  const timer = createTimer();
  
  try {
    const result = await fn();
    const durationMs = timer.elapsed();
    
    await metricEmitter(durationMs);
    
    logDebug(`${operation} completed`, { duration_ms: durationMs }, traceId);
    
    return { result, durationMs };
  } catch (error) {
    const durationMs = timer.elapsed();
    logError(`${operation} failed`, error, { duration_ms: durationMs }, traceId);
    throw error;
  }
}

// ============================================
// REQUEST CONTEXT
// ============================================

export interface RequestContext {
  traceId: string;
  spanId: string;
  startTime: number;
  component: StructuredLog['component'];
}

/**
 * Create a request context for tracking
 */
export function createRequestContext(component: StructuredLog['component']): RequestContext {
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    startTime: performance.now(),
    component,
  };
}

/**
 * Finalize request context and emit metrics
 */
export async function finalizeRequestContext(
  context: RequestContext,
  success: boolean,
  additionalMetadata?: Record<string, unknown>
): Promise<void> {
  const durationMs = Math.round(performance.now() - context.startTime);
  
  // Emit request completion metric
  await emitMetric({
    name: 'request_duration',
    value: durationMs,
    type: 'gauge',
    tags: [
      `component:${context.component}`,
      `success:${success}`,
    ],
  });

  // Log completion
  log({
    level: success ? 'info' : 'error',
    message: `Request ${success ? 'completed' : 'failed'}`,
    component: context.component,
    trace_id: context.traceId,
    span_id: context.spanId,
    duration_ms: durationMs,
    metadata: additionalMetadata,
  });

  // Flush metrics at end of request
  await flushMetrics();
}

// ============================================
// EXPORTS
// ============================================

export default {
  emitMetric,
  emitMetricImmediate,
  flushMetrics,
  metrics,
  log,
  logDebug,
  logInfo,
  logWarn,
  logError,
  generateTraceId,
  generateSpanId,
  createTimer,
  measureLatency,
  createRequestContext,
  finalizeRequestContext,
};

