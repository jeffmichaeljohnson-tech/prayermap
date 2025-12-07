/**
 * Datadog Dashboard Configuration for RAG Pipeline
 * 
 * This file contains dashboard widget definitions that can be used to create
 * a Datadog dashboard via API or exported as JSON for manual import.
 * 
 * Dashboard Name: PrayerMap RAG Pipeline
 * 
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export interface DashboardWidget {
  title: string;
  type: 'timeseries' | 'query_value' | 'toplist' | 'heatmap' | 'distribution' | 'group';
  definition: {
    type: string;
    requests?: Array<{
      q?: string;
      queries?: Array<{
        data_source: string;
        name: string;
        query: string;
      }>;
      response_format?: string;
      style?: Record<string, unknown>;
      display_type?: string;
    }>;
    title?: string;
    title_size?: string;
    title_align?: string;
    show_legend?: boolean;
    legend_layout?: string;
    precision?: number;
    autoscale?: boolean;
    custom_unit?: string;
    layout_type?: string;
    widgets?: DashboardWidget[];
  };
  layout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Dashboard {
  title: string;
  description: string;
  layout_type: 'ordered' | 'free';
  is_read_only: boolean;
  widgets: DashboardWidget[];
  template_variables?: Array<{
    name: string;
    default: string;
    prefix: string;
  }>;
  notify_list?: string[];
}

// ============================================
// WIDGET DEFINITIONS
// ============================================

const QUERY_LATENCY_WIDGET: DashboardWidget = {
  title: 'Query Latency (P50, P95, P99)',
  type: 'timeseries',
  definition: {
    type: 'timeseries',
    requests: [
      {
        q: 'p50:prayermap.rag.query_latency{$env}',
        display_type: 'line',
        style: { palette: 'dog_classic', line_type: 'solid', line_width: 'normal' },
      },
      {
        q: 'p95:prayermap.rag.query_latency{$env}',
        display_type: 'line',
        style: { palette: 'warm', line_type: 'solid', line_width: 'normal' },
      },
      {
        q: 'p99:prayermap.rag.query_latency{$env}',
        display_type: 'line',
        style: { palette: 'orange', line_type: 'solid', line_width: 'normal' },
      },
    ],
    title: 'Query Latency Distribution',
    show_legend: true,
    legend_layout: 'auto',
  },
  layout: { x: 0, y: 0, width: 6, height: 3 },
};

const QUERY_VOLUME_WIDGET: DashboardWidget = {
  title: 'Query Volume',
  type: 'timeseries',
  definition: {
    type: 'timeseries',
    requests: [
      {
        q: 'sum:prayermap.rag.queries{$env}.as_count().rollup(sum, 60)',
        display_type: 'bars',
        style: { palette: 'dog_classic' },
      },
    ],
    title: 'Queries per Minute',
    show_legend: false,
  },
  layout: { x: 6, y: 0, width: 6, height: 3 },
};

const ERROR_RATE_WIDGET: DashboardWidget = {
  title: 'Error Rate (%)',
  type: 'query_value',
  definition: {
    type: 'query_value',
    requests: [
      {
        q: 'sum:prayermap.rag.errors{$env}.as_count() / sum:prayermap.rag.queries{$env}.as_count() * 100',
        response_format: 'scalar',
      },
    ],
    title: 'Error Rate',
    precision: 2,
    autoscale: true,
    custom_unit: '%',
  },
  layout: { x: 0, y: 3, width: 3, height: 2 },
};

const AVG_LATENCY_WIDGET: DashboardWidget = {
  title: 'Avg Query Latency',
  type: 'query_value',
  definition: {
    type: 'query_value',
    requests: [
      {
        q: 'avg:prayermap.rag.query_latency{$env}',
        response_format: 'scalar',
      },
    ],
    title: 'Avg Latency',
    precision: 0,
    autoscale: true,
    custom_unit: 'ms',
  },
  layout: { x: 3, y: 3, width: 3, height: 2 },
};

const QUEUE_DEPTH_WIDGET: DashboardWidget = {
  title: 'Ingestion Queue Depth',
  type: 'timeseries',
  definition: {
    type: 'timeseries',
    requests: [
      {
        q: 'avg:prayermap.rag.queue_depth{$env}',
        display_type: 'area',
        style: { palette: 'purple' },
      },
    ],
    title: 'Queue Depth Over Time',
    show_legend: false,
  },
  layout: { x: 6, y: 3, width: 6, height: 2 },
};

const RERANK_LATENCY_WIDGET: DashboardWidget = {
  title: 'Rerank Latency by Provider',
  type: 'timeseries',
  definition: {
    type: 'timeseries',
    requests: [
      {
        q: 'avg:prayermap.rag.rerank_latency{$env} by {provider}',
        display_type: 'line',
        style: { palette: 'dog_classic', line_type: 'solid', line_width: 'normal' },
      },
    ],
    title: 'Rerank Latency by Provider',
    show_legend: true,
    legend_layout: 'auto',
  },
  layout: { x: 0, y: 5, width: 6, height: 3 },
};

const RERANK_FALLBACK_WIDGET: DashboardWidget = {
  title: 'Rerank Fallback Rate',
  type: 'timeseries',
  definition: {
    type: 'timeseries',
    requests: [
      {
        q: 'sum:prayermap.rag.rerank_fallback{$env}.as_count().rollup(sum, 300) / sum:prayermap.rag.rerank_attempts{$env}.as_count().rollup(sum, 300) * 100',
        display_type: 'line',
        style: { palette: 'orange', line_type: 'solid', line_width: 'normal' },
      },
    ],
    title: 'Fallback Rate (5-min rolling)',
    show_legend: false,
  },
  layout: { x: 6, y: 5, width: 6, height: 3 },
};

const CHUNKS_CREATED_WIDGET: DashboardWidget = {
  title: 'Chunks Created by Type',
  type: 'timeseries',
  definition: {
    type: 'timeseries',
    requests: [
      {
        q: 'sum:prayermap.rag.chunks_created{$env} by {data_type}.as_count()',
        display_type: 'bars',
        style: { palette: 'semantic' },
      },
    ],
    title: 'Chunks Created by Data Type',
    show_legend: true,
    legend_layout: 'auto',
  },
  layout: { x: 0, y: 8, width: 6, height: 3 },
};

const DLQ_WIDGET: DashboardWidget = {
  title: 'Dead Letter Queue',
  type: 'query_value',
  definition: {
    type: 'query_value',
    requests: [
      {
        q: 'avg:prayermap.rag.dlq_count{$env}',
        response_format: 'scalar',
      },
    ],
    title: 'DLQ Items',
    precision: 0,
    autoscale: true,
  },
  layout: { x: 6, y: 8, width: 3, height: 3 },
};

const API_CALLS_WIDGET: DashboardWidget = {
  title: 'API Calls by Service',
  type: 'toplist',
  definition: {
    type: 'toplist',
    requests: [
      {
        q: 'sum:prayermap.rag.api_calls{$env} by {service}.as_count()',
        response_format: 'scalar',
      },
    ],
    title: 'API Calls by Service (Last Hour)',
  },
  layout: { x: 9, y: 8, width: 3, height: 3 },
};

const HYBRID_ALPHA_WIDGET: DashboardWidget = {
  title: 'Hybrid Search Alpha Distribution',
  type: 'distribution',
  definition: {
    type: 'distribution',
    requests: [
      {
        q: 'avg:prayermap.rag.hybrid_alpha{$env}',
        response_format: 'scalar',
      },
    ],
    title: 'Alpha Values Used',
  },
  layout: { x: 0, y: 11, width: 6, height: 2 },
};

const EMBEDDING_LATENCY_WIDGET: DashboardWidget = {
  title: 'Embedding Latency',
  type: 'timeseries',
  definition: {
    type: 'timeseries',
    requests: [
      {
        q: 'avg:prayermap.rag.embedding_latency{$env}',
        display_type: 'line',
        style: { palette: 'green', line_type: 'solid', line_width: 'normal' },
      },
    ],
    title: 'Embedding Generation Latency',
    show_legend: false,
  },
  layout: { x: 6, y: 11, width: 6, height: 2 },
};

// ============================================
// DASHBOARD CONFIGURATION
// ============================================

export const RAG_PIPELINE_DASHBOARD: Dashboard = {
  title: 'PrayerMap RAG Pipeline',
  description: 'Monitoring for RAG query and ingestion performance. Includes latency, error rates, queue health, and reranking metrics.',
  layout_type: 'ordered',
  is_read_only: false,
  widgets: [
    // Row 1: Query Performance
    QUERY_LATENCY_WIDGET,
    QUERY_VOLUME_WIDGET,
    
    // Row 2: Key Metrics
    ERROR_RATE_WIDGET,
    AVG_LATENCY_WIDGET,
    QUEUE_DEPTH_WIDGET,
    
    // Row 3: Reranking
    RERANK_LATENCY_WIDGET,
    RERANK_FALLBACK_WIDGET,
    
    // Row 4: Ingestion
    CHUNKS_CREATED_WIDGET,
    DLQ_WIDGET,
    API_CALLS_WIDGET,
    
    // Row 5: Search Details
    HYBRID_ALPHA_WIDGET,
    EMBEDDING_LATENCY_WIDGET,
  ],
  template_variables: [
    {
      name: 'env',
      default: 'production',
      prefix: 'env',
    },
  ],
  notify_list: [],
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export dashboard as JSON for Datadog API or manual import
 */
export function exportDashboardAsJson(): string {
  return JSON.stringify(RAG_PIPELINE_DASHBOARD, null, 2);
}

/**
 * Get individual widget by title
 */
export function getWidgetByTitle(title: string): DashboardWidget | undefined {
  return RAG_PIPELINE_DASHBOARD.widgets.find(w => 
    w.title.toLowerCase().includes(title.toLowerCase())
  );
}

/**
 * Get all widgets
 */
export function getAllWidgets(): DashboardWidget[] {
  return RAG_PIPELINE_DASHBOARD.widgets;
}

export default {
  RAG_PIPELINE_DASHBOARD,
  exportDashboardAsJson,
  getWidgetByTitle,
  getAllWidgets,
};

