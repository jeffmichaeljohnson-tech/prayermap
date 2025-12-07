/**
 * Health Check System
 *
 * Comprehensive health monitoring for all RAG pipeline components.
 * Checks connectivity, latency, and availability of external services.
 *
 * Usage:
 *   import { checkSystemHealth, checkComponentHealth } from './_shared/health-check.ts';
 *   const health = await checkSystemHealth(context);
 *
 * 💭 ➡️ 📈
 */

import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { loadConfig } from './config.ts';

// ============================================
// TYPES
// ============================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latency_ms: number;
  details?: string;
  error?: string;
  last_check?: string;
}

export interface SystemHealth {
  overall: HealthStatus;
  components: ComponentHealth[];
  timestamp: string;
  config_summary: {
    rerank_enabled: boolean;
    rerank_provider: string;
    hybrid_search_enabled: boolean;
    query_expansion_enabled: boolean;
    recency_enabled: boolean;
  };
  uptime_info?: {
    start_time: string;
    uptime_seconds: number;
  };
}

export interface HealthCheckContext {
  supabase?: SupabaseClient;
  pinecone?: Pinecone;
  openai?: OpenAI;
  cohere_api_key?: string;
  pinecone_api_key?: string;
}

// ============================================
// COMPONENT HEALTH CHECKS
// ============================================

/**
 * Check Pinecone health by describing index stats
 */
export async function checkPinecone(
  pinecone: Pinecone,
  indexName: string
): Promise<ComponentHealth> {
  const start = Date.now();
  const name = 'pinecone';

  try {
    const index = pinecone.index(indexName);
    const stats = await index.describeIndexStats();

    return {
      name,
      status: 'healthy',
      latency_ms: Date.now() - start,
      details: `${stats.totalRecordCount || 0} vectors, ${stats.namespaces ? Object.keys(stats.namespaces).length : 0} namespaces`,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Check OpenAI health by creating a small embedding
 */
export async function checkOpenAI(openai: OpenAI): Promise<ComponentHealth> {
  const start = Date.now();
  const name = 'openai';

  try {
    await openai.embeddings.create({
      model: 'text-embedding-3-small', // Use smaller model for health check
      input: 'health check',
    });

    return {
      name,
      status: 'healthy',
      latency_ms: Date.now() - start,
      details: 'Embeddings API responsive',
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a rate limit (degraded, not unhealthy)
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        name,
        status: 'degraded',
        latency_ms: Date.now() - start,
        details: 'Rate limited',
        error: errorMessage,
        last_check: new Date().toISOString(),
      };
    }

    return {
      name,
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      error: errorMessage,
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Check Cohere health by making a minimal rerank request
 */
export async function checkCohere(apiKey: string): Promise<ComponentHealth> {
  const start = Date.now();
  const name = 'cohere';

  try {
    const response = await fetch('https://api.cohere.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'rerank-v3.5',
        query: 'health check',
        documents: ['test document'],
        top_n: 1,
      }),
    });

    const latency = Date.now() - start;

    if (response.ok) {
      return {
        name,
        status: 'healthy',
        latency_ms: latency,
        details: 'Rerank API responsive',
        last_check: new Date().toISOString(),
      };
    }

    // Check for rate limit
    if (response.status === 429) {
      return {
        name,
        status: 'degraded',
        latency_ms: latency,
        details: 'Rate limited',
        error: `HTTP ${response.status}`,
        last_check: new Date().toISOString(),
      };
    }

    return {
      name,
      status: 'unhealthy',
      latency_ms: latency,
      error: `HTTP ${response.status}`,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Check Supabase health by querying the ingestion queue
 */
export async function checkSupabase(supabase: SupabaseClient): Promise<ComponentHealth> {
  const start = Date.now();
  const name = 'supabase';

  try {
    const { error } = await supabase
      .from('ingestion_queue')
      .select('id')
      .limit(1);

    if (error) {
      return {
        name,
        status: 'unhealthy',
        latency_ms: Date.now() - start,
        error: error.message,
        last_check: new Date().toISOString(),
      };
    }

    return {
      name,
      status: 'healthy',
      latency_ms: Date.now() - start,
      details: 'Database responsive',
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Check Anthropic health (for auto-tagging)
 */
export async function checkAnthropic(apiKey: string): Promise<ComponentHealth> {
  const start = Date.now();
  const name = 'anthropic';

  try {
    // Just check that we can reach the API without actually making a request
    // This avoids unnecessary token usage
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    const latency = Date.now() - start;

    // Any response (even error) means API is reachable
    if (response.ok || response.status === 400) {
      return {
        name,
        status: 'healthy',
        latency_ms: latency,
        details: 'API reachable',
        last_check: new Date().toISOString(),
      };
    }

    if (response.status === 429) {
      return {
        name,
        status: 'degraded',
        latency_ms: latency,
        details: 'Rate limited',
        last_check: new Date().toISOString(),
      };
    }

    return {
      name,
      status: 'unhealthy',
      latency_ms: latency,
      error: `HTTP ${response.status}`,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }
}

// ============================================
// QUEUE HEALTH CHECK
// ============================================

/**
 * Check ingestion queue health
 */
export async function checkQueueHealth(supabase: SupabaseClient): Promise<ComponentHealth> {
  const start = Date.now();
  const name = 'ingestion_queue';

  try {
    // Get queue statistics
    const [pendingResult, processingResult, failedResult, dlqResult] = await Promise.all([
      supabase.from('ingestion_queue').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('ingestion_queue').select('id', { count: 'exact' }).eq('status', 'processing'),
      supabase.from('ingestion_queue').select('id', { count: 'exact' }).eq('status', 'failed'),
      supabase.from('ingestion_dlq').select('id', { count: 'exact' }),
    ]);

    const pending = pendingResult.count || 0;
    const processing = processingResult.count || 0;
    const failed = failedResult.count || 0;
    const dlq = dlqResult.count || 0;

    // Determine health status
    let status: HealthStatus = 'healthy';
    const issues: string[] = [];

    if (pending > 100) {
      status = 'degraded';
      issues.push(`High pending count: ${pending}`);
    }

    if (processing > 50) {
      status = 'degraded';
      issues.push(`High processing count: ${processing}`);
    }

    if (failed > 10) {
      status = status === 'degraded' ? 'unhealthy' : 'degraded';
      issues.push(`Failed items: ${failed}`);
    }

    if (dlq > 0) {
      status = 'degraded';
      issues.push(`DLQ items: ${dlq}`);
    }

    return {
      name,
      status,
      latency_ms: Date.now() - start,
      details: `pending=${pending}, processing=${processing}, failed=${failed}, dlq=${dlq}`,
      error: issues.length > 0 ? issues.join('; ') : undefined,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }
}

// ============================================
// COMPREHENSIVE HEALTH CHECK
// ============================================

/**
 * Check health of all system components
 */
export async function checkSystemHealth(
  context: HealthCheckContext
): Promise<SystemHealth> {
  const config = loadConfig();
  const components: ComponentHealth[] = [];

  // Run health checks in parallel where possible
  const checks: Promise<ComponentHealth>[] = [];

  // Pinecone check
  if (context.pinecone) {
    const indexName = Deno.env.get('PINECONE_INDEX') || 'prayermap-memory';
    checks.push(checkPinecone(context.pinecone, indexName));
  }

  // OpenAI check
  if (context.openai) {
    checks.push(checkOpenAI(context.openai));
  }

  // Cohere check (only if rerank is enabled)
  if (context.cohere_api_key && config.features.rerank_enabled) {
    checks.push(checkCohere(context.cohere_api_key));
  }

  // Supabase check
  if (context.supabase) {
    checks.push(checkSupabase(context.supabase));
    checks.push(checkQueueHealth(context.supabase));
  }

  // Anthropic check (optional)
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    checks.push(checkAnthropic(anthropicKey));
  }

  // Wait for all checks
  const results = await Promise.all(checks);
  components.push(...results);

  // Add placeholder for missing components
  if (!context.pinecone) {
    components.push({
      name: 'pinecone',
      status: 'unhealthy',
      latency_ms: -1,
      error: 'Client not configured',
    });
  }

  if (!context.openai) {
    components.push({
      name: 'openai',
      status: 'unhealthy',
      latency_ms: -1,
      error: 'Client not configured',
    });
  }

  // Determine overall status
  const unhealthy = components.filter((c) => c.status === 'unhealthy').length;
  const degraded = components.filter((c) => c.status === 'degraded').length;

  let overall: HealthStatus;
  if (unhealthy > 0) {
    // Check if critical components are unhealthy
    const criticalComponents = ['pinecone', 'openai', 'supabase'];
    const criticalUnhealthy = components.filter(
      (c) => c.status === 'unhealthy' && criticalComponents.includes(c.name)
    ).length;

    overall = criticalUnhealthy > 0 ? 'unhealthy' : 'degraded';
  } else if (degraded > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return {
    overall,
    components,
    timestamp: new Date().toISOString(),
    config_summary: {
      rerank_enabled: config.features.rerank_enabled,
      rerank_provider: config.features.rerank_provider,
      hybrid_search_enabled: config.features.hybrid_search_enabled,
      query_expansion_enabled: config.features.query_expansion_enabled,
      recency_enabled: config.features.recency_weighting_enabled,
    },
  };
}

// ============================================
// SINGLE COMPONENT CHECK
// ============================================

/**
 * Check health of a specific component
 */
export async function checkComponentHealth(
  component: string,
  context: HealthCheckContext
): Promise<ComponentHealth> {
  switch (component) {
    case 'pinecone':
      if (!context.pinecone) {
        return {
          name: 'pinecone',
          status: 'unhealthy',
          latency_ms: -1,
          error: 'Client not configured',
        };
      }
      return checkPinecone(context.pinecone, Deno.env.get('PINECONE_INDEX') || 'prayermap-memory');

    case 'openai':
      if (!context.openai) {
        return {
          name: 'openai',
          status: 'unhealthy',
          latency_ms: -1,
          error: 'Client not configured',
        };
      }
      return checkOpenAI(context.openai);

    case 'cohere':
      if (!context.cohere_api_key) {
        return {
          name: 'cohere',
          status: 'unhealthy',
          latency_ms: -1,
          error: 'API key not configured',
        };
      }
      return checkCohere(context.cohere_api_key);

    case 'supabase':
      if (!context.supabase) {
        return {
          name: 'supabase',
          status: 'unhealthy',
          latency_ms: -1,
          error: 'Client not configured',
        };
      }
      return checkSupabase(context.supabase);

    case 'ingestion_queue':
      if (!context.supabase) {
        return {
          name: 'ingestion_queue',
          status: 'unhealthy',
          latency_ms: -1,
          error: 'Supabase client not configured',
        };
      }
      return checkQueueHealth(context.supabase);

    default:
      return {
        name: component,
        status: 'unhealthy',
        latency_ms: -1,
        error: `Unknown component: ${component}`,
      };
  }
}

// ============================================
// HEALTH CHECK UTILITIES
// ============================================

/**
 * Format health status for HTTP response code
 */
export function healthStatusToHttpCode(status: HealthStatus): number {
  switch (status) {
    case 'healthy':
      return 200;
    case 'degraded':
      return 200; // Still operational, just degraded
    case 'unhealthy':
      return 503;
  }
}

/**
 * Create a minimal health response for load balancers
 */
export function createMinimalHealthResponse(health: SystemHealth): {
  status: string;
  ok: boolean;
} {
  return {
    status: health.overall,
    ok: health.overall !== 'unhealthy',
  };
}

/**
 * Get health check summary for logging
 */
export function getHealthSummary(health: SystemHealth): string {
  const componentSummary = health.components
    .map((c) => `${c.name}:${c.status}(${c.latency_ms}ms)`)
    .join(', ');

  return `[${health.overall.toUpperCase()}] ${componentSummary}`;
}

