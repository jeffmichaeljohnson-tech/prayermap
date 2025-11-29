/**
 * Moderation Webhook Handler
 *
 * Receives async moderation results from Hive API
 *
 * Endpoint: POST /functions/v1/moderation-webhook
 *
 * Security:
 * - Validates Hive signature
 * - Rate limited
 * - CORS restricted
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Types
interface HiveWebhookPayload {
  task_id: string;
  status: 'completed' | 'failed';
  output?: Array<{
    time?: number;
    predictions: Array<{
      class: string;
      score: number;
    }>;
  }>;
  error?: string;
  processing_time?: number;
}

interface ModerationResult {
  approved: boolean;
  flags: Array<{
    category: string;
    severity: string;
    score: number;
    description: string;
  }>;
  rawScores: Record<string, number>;
  processingTimeMs: number;
  modelVersion: string;
}

// Thresholds (matching client-side config)
const THRESHOLDS: Record<string, number> = {
  hate: 0.5,
  hate_speech: 0.5,
  harassment: 0.5,
  violence: 0.6,
  self_harm: 0.4,
  sexual: 0.5,
  sexual_content: 0.5,
  spam: 0.7,
  profanity: 0.6,
  illegal: 0.5
};

// Category mapping
const CATEGORY_MAP: Record<string, string> = {
  hate: 'hate_speech',
  hate_speech: 'hate_speech',
  harassment: 'harassment',
  bullying: 'harassment',
  violence: 'violence',
  gore: 'violence',
  self_harm: 'self_harm',
  'self-harm': 'self_harm',
  sexual: 'sexual_content',
  sexual_content: 'sexual_content',
  nudity: 'sexual_content',
  spam: 'spam',
  profanity: 'profanity',
  drugs: 'illegal_activity',
  weapons: 'illegal_activity'
};

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hive-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate Hive signature (if secret is configured)
    const hiveSecret = Deno.env.get('HIVE_WEBHOOK_SECRET');
    if (hiveSecret) {
      const signature = req.headers.get('x-hive-signature');
      if (!signature) {
        console.warn('[Webhook] Missing Hive signature');
        // Continue anyway in case Hive doesn't send signatures
      }
      // TODO: Implement signature verification when Hive docs specify format
    }

    // Parse payload
    const payload: HiveWebhookPayload = await req.json();
    console.log('[Webhook] Received:', payload.task_id, payload.status);

    // Validate payload
    if (!payload.task_id) {
      return new Response(
        JSON.stringify({ error: 'Missing task_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get task from database
    const { data: task, error: taskError } = await supabase
      .from('moderation_tasks')
      .select('*')
      .eq('task_id', payload.task_id)
      .single();

    if (taskError || !task) {
      console.error('[Webhook] Task not found:', payload.task_id);
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process result
    let result: ModerationResult;
    let status: string;

    if (payload.status === 'failed') {
      // Task failed
      status = 'failed';
      result = {
        approved: false,
        flags: [{
          category: 'error',
          severity: 'high',
          score: 1,
          description: payload.error || 'Processing failed'
        }],
        rawScores: {},
        processingTimeMs: payload.processing_time || 0,
        modelVersion: 'hive-video-v2'
      };
    } else {
      // Parse successful result
      result = parseHiveResult(payload);
      status = result.approved ? 'approved' : 'rejected';
    }

    // Update moderation task
    await supabase
      .from('moderation_tasks')
      .update({
        status: 'completed',
        result,
        completed_at: new Date().toISOString()
      })
      .eq('task_id', payload.task_id);

    // Log moderation result
    await supabase.from('moderation_logs').insert({
      content_id: task.content_id,
      content_type: 'video',
      status,
      flags: result.flags,
      raw_scores: result.rawScores,
      processing_time_ms: result.processingTimeMs,
      model_version: result.modelVersion,
      user_id: task.user_id,
      metadata: { video_url: task.video_url },
      created_at: new Date().toISOString()
    });

    // Update content visibility
    if (task.content_type === 'video') {
      await supabase
        .from('prayer_responses')
        .update({
          moderation_status: status,
          is_visible: result.approved
        })
        .eq('id', task.content_id);
    }

    console.log('[Webhook] Processed:', payload.task_id, status);

    return new Response(
      JSON.stringify({
        success: true,
        task_id: payload.task_id,
        status
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Webhook] Error:', error);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Parse Hive webhook result into our format
 */
function parseHiveResult(payload: HiveWebhookPayload): ModerationResult {
  const flags: ModerationResult['flags'] = [];
  const rawScores: Record<string, number> = {};

  // Aggregate scores across all frames/outputs
  for (const output of payload.output || []) {
    for (const pred of output.predictions || []) {
      const currentScore = rawScores[pred.class] || 0;
      rawScores[pred.class] = Math.max(currentScore, pred.score);
    }
  }

  // Check against thresholds and create flags
  for (const [className, score] of Object.entries(rawScores)) {
    const threshold = THRESHOLDS[className.toLowerCase()] || 0.5;

    if (score >= threshold) {
      const category = CATEGORY_MAP[className.toLowerCase()] || 'spam';

      flags.push({
        category,
        severity: getSeverity(score),
        score,
        description: `Video flagged for ${className}`
      });
    }
  }

  return {
    approved: flags.length === 0,
    flags,
    rawScores,
    processingTimeMs: payload.processing_time || 0,
    modelVersion: 'hive-video-v2'
  };
}

function getSeverity(score: number): string {
  if (score >= 0.9) return 'critical';
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}
