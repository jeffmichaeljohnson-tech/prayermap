/**
 * collect-data Edge Function
 * 
 * Receives development activity data from various sources and queues
 * it for processing and storage in Pinecone.
 * 
 * Endpoint: POST /functions/v1/collect-data
 * 
 * Request Body:
 * {
 *   source: 'claude_code' | 'cursor' | 'github' | etc.
 *   data_type: 'session' | 'code' | 'deployment' | etc.
 *   content: string
 *   metadata?: Record<string, unknown>
 *   timestamp?: string // ISO8601
 * }
 * 
 * Response:
 * {
 *   success: true
 *   queue_id: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { loadConfig, getEnvironmentInfo } from '../_shared/config.ts';
import { checkSupabase, checkQueueHealth, healthStatusToHttpCode, type ComponentHealth } from '../_shared/health-check.ts';
import { getFeatureFlagSummary } from '../_shared/feature-flags.ts';

// Valid enum values for validation
const VALID_SOURCES = [
  'claude_code',
  'cursor',
  'claude_desktop',
  'terminal',
  'github',
  'vercel',
  'supabase',
  'datadog',
  'langsmith',
  'automated',
] as const;

const VALID_DATA_TYPES = [
  'session',
  'config',
  'code',
  'deployment',
  'learning',
  'system_snapshot',
  'error',
  'metric',
] as const;

type Source = (typeof VALID_SOURCES)[number];
type DataType = (typeof VALID_DATA_TYPES)[number];

interface CollectorPayload {
  source: Source;
  data_type: DataType;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Validate the incoming payload
 */
function validatePayload(payload: unknown): { valid: true; data: CollectorPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const p = payload as Record<string, unknown>;

  // Check required fields
  if (!p.source || typeof p.source !== 'string') {
    return { valid: false, error: 'Missing or invalid required field: source' };
  }

  if (!VALID_SOURCES.includes(p.source as Source)) {
    return { valid: false, error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` };
  }

  if (!p.data_type || typeof p.data_type !== 'string') {
    return { valid: false, error: 'Missing or invalid required field: data_type' };
  }

  if (!VALID_DATA_TYPES.includes(p.data_type as DataType)) {
    return { valid: false, error: `Invalid data_type. Must be one of: ${VALID_DATA_TYPES.join(', ')}` };
  }

  if (!p.content || typeof p.content !== 'string') {
    return { valid: false, error: 'Missing or invalid required field: content' };
  }

  if (p.content.trim().length === 0) {
    return { valid: false, error: 'Content cannot be empty' };
  }

  // Validate optional fields
  if (p.metadata !== undefined && (typeof p.metadata !== 'object' || p.metadata === null)) {
    return { valid: false, error: 'metadata must be an object' };
  }

  if (p.timestamp !== undefined) {
    if (typeof p.timestamp !== 'string') {
      return { valid: false, error: 'timestamp must be a string' };
    }
    const date = new Date(p.timestamp);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'timestamp must be a valid ISO8601 date string' };
    }
  }

  return {
    valid: true,
    data: {
      source: p.source as Source,
      data_type: p.data_type as DataType,
      content: p.content as string,
      metadata: (p.metadata as Record<string, unknown>) || {},
      timestamp: p.timestamp as string | undefined,
    },
  };
}

// ============================================
// HEALTH CHECK HANDLER
// ============================================

async function handleCollectorHealthCheck(): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({
        overall: 'unhealthy',
        components: [
          {
            name: 'supabase',
            status: 'unhealthy',
            latency_ms: -1,
            error: 'Configuration missing',
          },
        ],
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check both Supabase connectivity and queue health
  const [supabaseHealth, queueHealth] = await Promise.all([
    checkSupabase(supabase),
    checkQueueHealth(supabase),
  ]);

  const components: ComponentHealth[] = [supabaseHealth, queueHealth];

  // Determine overall status
  const unhealthy = components.filter((c) => c.status === 'unhealthy').length;
  const degraded = components.filter((c) => c.status === 'degraded').length;

  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (unhealthy > 0) {
    overall = 'unhealthy';
  } else if (degraded > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  const health = {
    overall,
    components,
    timestamp: new Date().toISOString(),
  };

  console.log(`Collector health check: ${overall}`);

  return new Response(JSON.stringify(health), {
    status: healthStatusToHttpCode(overall),
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // Health check endpoint
  if (url.pathname.endsWith('/health') || url.searchParams.get('health') === 'true') {
    return handleCollectorHealthCheck();
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
      valid_sources: VALID_SOURCES,
      valid_data_types: VALID_DATA_TYPES,
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    // Parse request body
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate payload
    const validation = validatePayload(payload);
    if (!validation.valid) {
      return errorResponse(validation.error, 400);
    }

    const { source, data_type, content, metadata, timestamp } = validation.data;

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return errorResponse('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Insert into ingestion queue
    const { data, error } = await supabase
      .from('ingestion_queue')
      .insert({
        source,
        data_type,
        content,
        metadata: metadata || {},
        created_at: timestamp || new Date().toISOString(),
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to insert into ingestion queue:', error);
      return errorResponse('Failed to queue data for processing', 500, error.message);
    }

    // Optionally trigger async processing
    // This could invoke another function, but for MVP we'll rely on a cron
    // or the process-ingestion function being called separately
    try {
      // Fire and forget - don't wait for processing
      fetch(`${supabaseUrl}/functions/v1/process-ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ queue_id: data.id }),
      }).catch((e) => {
        // Log but don't fail - processing will happen via cron
        console.warn('Failed to trigger processing:', e);
      });
    } catch {
      // Ignore - processing will happen via cron or manual trigger
    }

    return jsonResponse({
      success: true,
      queue_id: data.id,
    });
  } catch (error) {
    console.error('Unexpected error in collect-data:', error);
    return errorResponse('Internal server error', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

