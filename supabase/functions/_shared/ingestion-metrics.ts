/**
 * Ingestion Metrics & Observability
 * 
 * Comprehensive metrics collection and logging for the ingestion pipeline.
 * Enables monitoring, alerting, and debugging of the RAG system.
 * 
 * Features:
 * - Throughput tracking (items/minute, items/hour)
 * - Error categorization and tracking
 * - Processing time percentiles
 * - Queue health monitoring
 * - API usage tracking
 * - Structured JSON logging for observability platforms
 * 
 * 💭 ➡️ 📈
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// TYPES
// ============================================

export interface IngestionMetrics {
  /** Timestamp of metrics collection */
  collected_at: string;
  
  /** Throughput metrics */
  throughput: ThroughputMetrics;
  
  /** Error metrics */
  errors: ErrorMetrics;
  
  /** Queue health metrics */
  queue: QueueMetrics;
  
  /** API usage metrics */
  api_usage: ApiUsageMetrics;
  
  /** Processing time metrics */
  timing: TimingMetrics;
}

export interface ThroughputMetrics {
  /** Items processed in last hour */
  items_last_hour: number;
  /** Items processed in last minute */
  items_last_minute: number;
  /** Chunks created in last hour */
  chunks_last_hour: number;
  /** Average items per minute (last hour) */
  avg_items_per_minute: number;
  /** Peak items per minute (last hour) */
  peak_items_per_minute: number;
  /** Duplicate items detected (last hour) */
  duplicates_detected: number;
}

export interface ErrorMetrics {
  /** Total failed items in last hour */
  failed_last_hour: number;
  /** Error rate percentage */
  error_rate_percent: number;
  /** Breakdown by error category */
  by_category: Record<string, number>;
  /** Most common error message */
  most_common_error?: string;
  /** Items pending retry */
  pending_retry: number;
  /** Items in dead letter queue */
  in_dlq: number;
}

export interface QueueMetrics {
  /** Current pending items */
  pending_count: number;
  /** Currently processing items */
  processing_count: number;
  /** Items completed today */
  completed_today: number;
  /** Age of oldest pending item (minutes) */
  oldest_pending_age_minutes: number;
  /** Average wait time (minutes) */
  avg_wait_time_minutes: number;
  /** Queue depth trend (positive = growing) */
  depth_trend: number;
  /** Health status */
  health: 'healthy' | 'degraded' | 'critical';
}

export interface ApiUsageMetrics {
  /** OpenAI API calls */
  openai_requests: number;
  /** OpenAI tokens used */
  openai_tokens: number;
  /** Pinecone upserts */
  pinecone_upserts: number;
  /** Anthropic API calls (for tagging) */
  anthropic_requests: number;
  /** Cohere API calls (for reranking) */
  cohere_requests: number;
}

export interface TimingMetrics {
  /** Average processing time per item (ms) */
  avg_processing_ms: number;
  /** P50 processing time (ms) */
  p50_processing_ms: number;
  /** P95 processing time (ms) */
  p95_processing_ms: number;
  /** P99 processing time (ms) */
  p99_processing_ms: number;
  /** Max processing time (ms) */
  max_processing_ms: number;
}

export interface MetricEvent {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

// ============================================
// METRIC COLLECTOR
// ============================================

class MetricsCollector {
  private events: MetricEvent[] = [];
  private apiCounts: ApiUsageMetrics = {
    openai_requests: 0,
    openai_tokens: 0,
    pinecone_upserts: 0,
    anthropic_requests: 0,
    cohere_requests: 0,
  };
  private processingTimes: number[] = [];
  private duplicatesDetected = 0;
  
  /**
   * Record an event
   */
  recordEvent(type: string, data: Record<string, unknown> = {}): void {
    this.events.push({
      type,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
  
  /**
   * Record API usage
   */
  recordApiCall(service: 'openai' | 'pinecone' | 'anthropic' | 'cohere', tokens?: number): void {
    switch (service) {
      case 'openai':
        this.apiCounts.openai_requests++;
        if (tokens) this.apiCounts.openai_tokens += tokens;
        break;
      case 'pinecone':
        this.apiCounts.pinecone_upserts++;
        break;
      case 'anthropic':
        this.apiCounts.anthropic_requests++;
        break;
      case 'cohere':
        this.apiCounts.cohere_requests++;
        break;
    }
  }
  
  /**
   * Record processing time
   */
  recordProcessingTime(ms: number): void {
    this.processingTimes.push(ms);
  }
  
  /**
   * Record duplicate detection
   */
  recordDuplicates(count: number): void {
    this.duplicatesDetected += count;
  }
  
  /**
   * Get API usage counts
   */
  getApiUsage(): ApiUsageMetrics {
    return { ...this.apiCounts };
  }
  
  /**
   * Get timing metrics from recorded processing times
   */
  getTimingMetrics(): TimingMetrics {
    if (this.processingTimes.length === 0) {
      return {
        avg_processing_ms: 0,
        p50_processing_ms: 0,
        p95_processing_ms: 0,
        p99_processing_ms: 0,
        max_processing_ms: 0,
      };
    }
    
    const sorted = [...this.processingTimes].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    
    return {
      avg_processing_ms: Math.round(avg),
      p50_processing_ms: sorted[Math.floor(sorted.length * 0.5)],
      p95_processing_ms: sorted[Math.floor(sorted.length * 0.95)],
      p99_processing_ms: sorted[Math.floor(sorted.length * 0.99)],
      max_processing_ms: sorted[sorted.length - 1],
    };
  }
  
  /**
   * Get duplicates detected
   */
  getDuplicatesDetected(): number {
    return this.duplicatesDetected;
  }
  
  /**
   * Reset collector (for new batch)
   */
  reset(): void {
    this.events = [];
    this.apiCounts = {
      openai_requests: 0,
      openai_tokens: 0,
      pinecone_upserts: 0,
      anthropic_requests: 0,
      cohere_requests: 0,
    };
    this.processingTimes = [];
    this.duplicatesDetected = 0;
  }
}

// Singleton collector instance
export const metricsCollector = new MetricsCollector();

// ============================================
// METRICS COLLECTION FROM DATABASE
// ============================================

/**
 * Collect comprehensive ingestion metrics from database
 */
export async function collectMetrics(supabase: SupabaseClient): Promise<IngestionMetrics> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  const oneMinuteAgo = new Date(now.getTime() - 60000);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  // Query queue statistics
  const { data: queueData } = await supabase
    .from('ingestion_queue')
    .select('id, status, created_at, processed_at, error_message, retry_count')
    .gte('created_at', oneHourAgo.toISOString());
  
  const items = queueData || [];
  
  // Calculate throughput metrics
  const completedLastHour = items.filter(i => 
    i.status === 'completed' && 
    i.processed_at && 
    new Date(i.processed_at) >= oneHourAgo
  );
  
  const completedLastMinute = items.filter(i => 
    i.status === 'completed' && 
    i.processed_at && 
    new Date(i.processed_at) >= oneMinuteAgo
  );
  
  // Calculate per-minute breakdown for peak detection
  const minuteBuckets = new Map<string, number>();
  for (const item of completedLastHour) {
    if (item.processed_at) {
      const minute = item.processed_at.slice(0, 16); // YYYY-MM-DDTHH:MM
      minuteBuckets.set(minute, (minuteBuckets.get(minute) || 0) + 1);
    }
  }
  const peakPerMinute = Math.max(0, ...minuteBuckets.values());
  
  const throughput: ThroughputMetrics = {
    items_last_hour: completedLastHour.length,
    items_last_minute: completedLastMinute.length,
    chunks_last_hour: 0, // Would need document_content query
    avg_items_per_minute: Math.round(completedLastHour.length / 60 * 100) / 100,
    peak_items_per_minute: peakPerMinute,
    duplicates_detected: metricsCollector.getDuplicatesDetected(),
  };
  
  // Calculate error metrics
  const failedLastHour = items.filter(i => i.status === 'failed');
  const errorCategories: Record<string, number> = {};
  
  for (const item of failedLastHour) {
    const category = categorizeError(item.error_message || 'unknown');
    errorCategories[category] = (errorCategories[category] || 0) + 1;
  }
  
  // Find most common error
  const mostCommonError = Object.entries(errorCategories)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  // Query DLQ count
  const { count: dlqCount } = await supabase
    .from('ingestion_dlq')
    .select('*', { count: 'exact', head: true });
  
  const errors: ErrorMetrics = {
    failed_last_hour: failedLastHour.length,
    error_rate_percent: items.length > 0 
      ? Math.round((failedLastHour.length / items.length) * 100) 
      : 0,
    by_category: errorCategories,
    most_common_error: mostCommonError,
    pending_retry: items.filter(i => 
      i.status === 'pending' && 
      i.retry_count && 
      i.retry_count > 0
    ).length,
    in_dlq: dlqCount || 0,
  };
  
  // Calculate queue health metrics
  const pendingItems = items.filter(i => i.status === 'pending');
  const processingItems = items.filter(i => i.status === 'processing');
  
  // Get today's completed count
  const { count: completedToday } = await supabase
    .from('ingestion_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('processed_at', todayStart.toISOString());
  
  // Calculate oldest pending age
  const oldestPending = pendingItems
    .map(i => new Date(i.created_at))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  
  const oldestPendingAgeMinutes = oldestPending 
    ? Math.round((now.getTime() - oldestPending.getTime()) / 60000)
    : 0;
  
  // Calculate average wait time
  const waitTimes = completedLastHour
    .filter(i => i.processed_at)
    .map(i => 
      new Date(i.processed_at!).getTime() - new Date(i.created_at).getTime()
    );
  const avgWaitTime = waitTimes.length > 0
    ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length / 60000)
    : 0;
  
  // Determine queue health
  let queueHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (oldestPendingAgeMinutes > 30 || errors.error_rate_percent > 10) {
    queueHealth = 'degraded';
  }
  if (oldestPendingAgeMinutes > 60 || errors.error_rate_percent > 25 || pendingItems.length > 1000) {
    queueHealth = 'critical';
  }
  
  const queue: QueueMetrics = {
    pending_count: pendingItems.length,
    processing_count: processingItems.length,
    completed_today: completedToday || 0,
    oldest_pending_age_minutes: oldestPendingAgeMinutes,
    avg_wait_time_minutes: avgWaitTime,
    depth_trend: pendingItems.length - completedLastHour.length / 6, // vs 10-min avg
    health: queueHealth,
  };
  
  // Get timing and API metrics from collector
  const timing = metricsCollector.getTimingMetrics();
  const apiUsage = metricsCollector.getApiUsage();
  
  return {
    collected_at: now.toISOString(),
    throughput,
    errors,
    queue,
    api_usage: apiUsage,
    timing,
  };
}

// ============================================
// ERROR CATEGORIZATION
// ============================================

/**
 * Categorize error messages for aggregation
 */
function categorizeError(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  
  if (lower.includes('rate limit') || lower.includes('429')) {
    return 'rate_limit';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'timeout';
  }
  if (lower.includes('network') || lower.includes('connection') || lower.includes('econnreset')) {
    return 'network';
  }
  if (lower.includes('auth') || lower.includes('unauthorized') || lower.includes('403')) {
    return 'auth';
  }
  if (lower.includes('invalid') || lower.includes('validation')) {
    return 'validation';
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return 'not_found';
  }
  if (lower.includes('500') || lower.includes('server error')) {
    return 'server_error';
  }
  if (lower.includes('openai')) {
    return 'openai_error';
  }
  if (lower.includes('pinecone')) {
    return 'pinecone_error';
  }
  if (lower.includes('anthropic') || lower.includes('claude')) {
    return 'anthropic_error';
  }
  
  return 'unknown';
}

// ============================================
// STRUCTURED LOGGING
// ============================================

/**
 * Log metrics in structured JSON format for observability platforms
 */
export function logMetrics(metrics: IngestionMetrics): void {
  // Main metrics log
  console.log(JSON.stringify({
    type: 'ingestion_metrics',
    ...metrics,
  }));
}

/**
 * Log a processing event
 */
export function logProcessingEvent(event: {
  queue_id: string;
  status: 'started' | 'completed' | 'failed' | 'retrying';
  chunks?: number;
  duration_ms?: number;
  error?: string;
  attempt?: number;
}): void {
  console.log(JSON.stringify({
    type: 'ingestion_event',
    timestamp: new Date().toISOString(),
    ...event,
  }));
  
  metricsCollector.recordEvent(`processing_${event.status}`, event);
  
  if (event.duration_ms) {
    metricsCollector.recordProcessingTime(event.duration_ms);
  }
}

/**
 * Log a batch processing summary
 */
export function logBatchSummary(summary: {
  batch_size: number;
  successful: number;
  failed: number;
  total_chunks: number;
  duration_ms: number;
  items_per_second: number;
}): void {
  console.log(JSON.stringify({
    type: 'ingestion_batch_summary',
    timestamp: new Date().toISOString(),
    ...summary,
  }));
}

/**
 * Log a health check result
 */
export function logHealthCheck(health: {
  status: 'healthy' | 'degraded' | 'critical';
  checks: Record<string, boolean>;
  details?: Record<string, unknown>;
}): void {
  console.log(JSON.stringify({
    type: 'ingestion_health_check',
    timestamp: new Date().toISOString(),
    ...health,
  }));
}

// ============================================
// ALERTING HELPERS
// ============================================

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  threshold: number;
  message: string;
  severity: 'warning' | 'error' | 'critical';
}

const DEFAULT_ALERT_CONDITIONS: AlertCondition[] = [
  {
    metric: 'queue.oldest_pending_age_minutes',
    operator: 'gt',
    threshold: 30,
    message: 'Queue processing delayed - oldest item over 30 minutes old',
    severity: 'warning',
  },
  {
    metric: 'queue.oldest_pending_age_minutes',
    operator: 'gt',
    threshold: 60,
    message: 'Queue processing severely delayed - oldest item over 60 minutes old',
    severity: 'critical',
  },
  {
    metric: 'errors.error_rate_percent',
    operator: 'gt',
    threshold: 10,
    message: 'Error rate elevated - over 10% failures',
    severity: 'warning',
  },
  {
    metric: 'errors.error_rate_percent',
    operator: 'gt',
    threshold: 25,
    message: 'Error rate critical - over 25% failures',
    severity: 'critical',
  },
  {
    metric: 'queue.pending_count',
    operator: 'gt',
    threshold: 500,
    message: 'Queue backlog growing - over 500 pending items',
    severity: 'warning',
  },
  {
    metric: 'queue.pending_count',
    operator: 'gt',
    threshold: 1000,
    message: 'Queue backlog critical - over 1000 pending items',
    severity: 'critical',
  },
];

/**
 * Check metrics against alert conditions
 */
export function checkAlerts(
  metrics: IngestionMetrics,
  conditions: AlertCondition[] = DEFAULT_ALERT_CONDITIONS
): AlertCondition[] {
  const triggered: AlertCondition[] = [];
  
  for (const condition of conditions) {
    const value = getNestedValue(metrics, condition.metric);
    
    if (value === undefined) continue;
    
    let shouldTrigger = false;
    switch (condition.operator) {
      case 'gt':
        shouldTrigger = value > condition.threshold;
        break;
      case 'lt':
        shouldTrigger = value < condition.threshold;
        break;
      case 'eq':
        shouldTrigger = value === condition.threshold;
        break;
    }
    
    if (shouldTrigger) {
      triggered.push(condition);
      
      // Log the alert
      console.log(JSON.stringify({
        type: 'ingestion_alert',
        timestamp: new Date().toISOString(),
        severity: condition.severity,
        message: condition.message,
        metric: condition.metric,
        current_value: value,
        threshold: condition.threshold,
      }));
    }
  }
  
  return triggered;
}

/**
 * Get nested object value by dot-notation path
 */
function getNestedValue(obj: unknown, path: string): number | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return typeof current === 'number' ? current : undefined;
}

// ============================================
// EXPORTS
// ============================================

export default {
  metricsCollector,
  collectMetrics,
  logMetrics,
  logProcessingEvent,
  logBatchSummary,
  logHealthCheck,
  checkAlerts,
};

