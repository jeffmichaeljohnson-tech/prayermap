/**
 * Datadog Monitor Configuration for RAG Pipeline
 * 
 * This file contains monitor definitions that can be used to create
 * Datadog monitors via API or CLI.
 * 
 * To create these monitors, use the Datadog API or MCP tool:
 *   await mcp__datadog__datadog_create_monitor(monitor)
 * 
 * Or use the Datadog CLI:
 *   dog monitor create --config monitor.json
 * 
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export interface DatadogMonitor {
  name: string;
  type: 'metric alert' | 'query alert' | 'service check' | 'event alert' | 'log alert';
  query: string;
  message: string;
  options: {
    thresholds: {
      critical?: number;
      warning?: number;
      ok?: number;
    };
    notify_no_data?: boolean;
    no_data_timeframe?: number;
    renotify_interval?: number;
    require_full_window?: boolean;
    include_tags?: boolean;
    evaluation_delay?: number;
    new_host_delay?: number;
  };
  tags: string[];
  priority?: number;
}

// ============================================
// MONITOR DEFINITIONS
// ============================================

/**
 * Monitor 1: Query Latency
 * 
 * Alerts when RAG query latency exceeds acceptable thresholds.
 * P95 target: <500ms
 */
export const QUERY_LATENCY_MONITOR: DatadogMonitor = {
  name: 'PrayerMap RAG - Query Latency High',
  type: 'metric alert',
  query: 'avg(last_5m):avg:prayermap.rag.query_latency{env:production} > 500',
  message: `
RAG query latency is above 500ms threshold.

Current P95: {{value}}ms
Threshold: 500ms (warning: 300ms)

**Possible Causes:**
- Pinecone index performance degradation
- OpenAI embedding API slowdown
- High query complexity (large top_k or decomposition enabled)
- Rerank provider timeout

**Investigation Steps:**
1. Check Pinecone dashboard for index health
2. Review OpenAI status page
3. Check Cohere status (if rerank enabled)
4. Look at query patterns in logs

@slack-agent-updates-prayermap
  `.trim(),
  options: {
    thresholds: {
      critical: 500,
      warning: 300,
    },
    notify_no_data: false,
    renotify_interval: 60,
    evaluation_delay: 60,
    include_tags: true,
  },
  tags: ['service:prayermap', 'component:rag', 'env:production', 'team:engineering'],
  priority: 2,
};

/**
 * Monitor 2: Error Rate
 * 
 * Alerts when error rate exceeds acceptable thresholds.
 * Target: <5% error rate
 */
export const ERROR_RATE_MONITOR: DatadogMonitor = {
  name: 'PrayerMap RAG - Error Rate High',
  type: 'metric alert',
  query: 'avg(last_5m):sum:prayermap.rag.errors{env:production}.as_count() / sum:prayermap.rag.queries{env:production}.as_count() * 100 > 5',
  message: `
RAG error rate exceeded 5% threshold.

Current error rate: {{value}}%
Threshold: 5% (warning: 2%)

**Possible Causes:**
- External API failures (OpenAI, Cohere, Pinecone)
- Rate limiting
- Invalid queries
- Database connectivity issues

**Investigation Steps:**
1. Check Edge Function logs for error patterns
2. Review API status pages
3. Check for rate limit errors
4. Verify Supabase connectivity

@slack-agent-updates-prayermap
  `.trim(),
  options: {
    thresholds: {
      critical: 5,
      warning: 2,
    },
    notify_no_data: false,
    renotify_interval: 60,
    include_tags: true,
  },
  tags: ['service:prayermap', 'component:rag', 'env:production', 'team:engineering'],
  priority: 1,
};

/**
 * Monitor 3: Ingestion Queue Depth
 * 
 * Alerts when ingestion queue has too many pending items.
 * Target: <100 pending items
 */
export const QUEUE_DEPTH_MONITOR: DatadogMonitor = {
  name: 'PrayerMap RAG - Ingestion Queue Backlog',
  type: 'metric alert',
  query: 'avg(last_10m):avg:prayermap.rag.queue_depth{env:production} > 100',
  message: `
Ingestion queue has grown beyond 100 items.

Current depth: {{value}}
Threshold: 100 (warning: 50)

**This indicates:**
- Ingestion is not keeping up with incoming content
- Possible processing errors or slowdowns
- May need to scale ingestion concurrency

**Investigation Steps:**
1. Check process-ingestion Edge Function logs
2. Look for repeated failures
3. Check DLQ for failed items
4. Verify API rate limits haven't been hit

@slack-agent-updates-prayermap
  `.trim(),
  options: {
    thresholds: {
      critical: 100,
      warning: 50,
    },
    notify_no_data: false,
    no_data_timeframe: 30,
    renotify_interval: 30,
    include_tags: true,
  },
  tags: ['service:prayermap', 'component:rag-ingestion', 'env:production', 'team:engineering'],
  priority: 2,
};

/**
 * Monitor 4: Rerank Fallback Rate
 * 
 * Alerts when reranking is falling back too frequently.
 * Target: <25% fallback rate
 */
export const RERANK_FALLBACK_MONITOR: DatadogMonitor = {
  name: 'PrayerMap RAG - Rerank Fallback High',
  type: 'metric alert',
  query: 'avg(last_15m):sum:prayermap.rag.rerank_fallback{env:production}.as_count() / sum:prayermap.rag.rerank_attempts{env:production}.as_count() * 100 > 25',
  message: `
Rerank is falling back to secondary provider more than 25% of the time.

Current fallback rate: {{value}}%
Threshold: 25% (warning: 10%)

**Possible Causes:**
- Cohere API issues or rate limiting
- Cohere API key problems
- Network connectivity issues

**Investigation Steps:**
1. Check Cohere status page
2. Review API key validity
3. Check for rate limit errors in logs
4. Verify Pinecone fallback is working

@slack-agent-updates-prayermap
  `.trim(),
  options: {
    thresholds: {
      critical: 25,
      warning: 10,
    },
    notify_no_data: false,
    renotify_interval: 60,
    include_tags: true,
  },
  tags: ['service:prayermap', 'component:rag-rerank', 'env:production', 'team:engineering'],
  priority: 3,
};

/**
 * Monitor 5: Dead Letter Queue Growth
 * 
 * Alerts when DLQ has items that need attention.
 * Target: 0 items in DLQ
 */
export const DLQ_MONITOR: DatadogMonitor = {
  name: 'PrayerMap RAG - Dead Letter Queue Not Empty',
  type: 'metric alert',
  query: 'avg(last_10m):avg:prayermap.rag.dlq_count{env:production} > 0',
  message: `
Dead Letter Queue contains failed items that need attention.

Current DLQ count: {{value}}

**Action Required:**
1. Review failed items in ingestion_dlq table
2. Identify root cause of failures
3. Fix issues and retry items
4. Consider increasing retry limits if appropriate

**Query to check DLQ:**
\`\`\`sql
SELECT * FROM ingestion_dlq ORDER BY moved_at DESC LIMIT 10;
\`\`\`

@slack-agent-updates-prayermap
  `.trim(),
  options: {
    thresholds: {
      critical: 5,
      warning: 1,
    },
    notify_no_data: false,
    renotify_interval: 120,
    include_tags: true,
  },
  tags: ['service:prayermap', 'component:rag-ingestion', 'env:production', 'team:engineering'],
  priority: 3,
};

/**
 * Monitor 6: Embedding Latency
 * 
 * Alerts when embedding generation is slow.
 * Target: <200ms per embedding
 */
export const EMBEDDING_LATENCY_MONITOR: DatadogMonitor = {
  name: 'PrayerMap RAG - Embedding Latency High',
  type: 'metric alert',
  query: 'avg(last_5m):avg:prayermap.rag.embedding_latency{env:production} > 200',
  message: `
Embedding generation latency is above 200ms threshold.

Current latency: {{value}}ms
Threshold: 200ms (warning: 150ms)

**Possible Causes:**
- OpenAI API slowdown
- Large batch sizes
- Network issues

**Investigation Steps:**
1. Check OpenAI status page
2. Review batch sizes in recent requests
3. Monitor API rate limits

@slack-agent-updates-prayermap
  `.trim(),
  options: {
    thresholds: {
      critical: 200,
      warning: 150,
    },
    notify_no_data: false,
    renotify_interval: 60,
    include_tags: true,
  },
  tags: ['service:prayermap', 'component:rag', 'env:production', 'team:engineering'],
  priority: 3,
};

// ============================================
// ALL MONITORS
// ============================================

export const ALL_MONITORS: DatadogMonitor[] = [
  QUERY_LATENCY_MONITOR,
  ERROR_RATE_MONITOR,
  QUEUE_DEPTH_MONITOR,
  RERANK_FALLBACK_MONITOR,
  DLQ_MONITOR,
  EMBEDDING_LATENCY_MONITOR,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get monitor configuration as JSON for export
 */
export function exportMonitorsAsJson(): string {
  return JSON.stringify(ALL_MONITORS, null, 2);
}

/**
 * Get a specific monitor by name pattern
 */
export function getMonitorByName(namePattern: string): DatadogMonitor | undefined {
  return ALL_MONITORS.find(m => m.name.toLowerCase().includes(namePattern.toLowerCase()));
}

export default {
  QUERY_LATENCY_MONITOR,
  ERROR_RATE_MONITOR,
  QUEUE_DEPTH_MONITOR,
  RERANK_FALLBACK_MONITOR,
  DLQ_MONITOR,
  EMBEDDING_LATENCY_MONITOR,
  ALL_MONITORS,
  exportMonitorsAsJson,
  getMonitorByName,
};

