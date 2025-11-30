/**
 * Video Moderation Service for PrayerMap
 *
 * Handles moderation of:
 * - Video prayer responses
 *
 * Video moderation is ASYNC because:
 * - Frame-by-frame analysis takes longer
 * - Audio track is also analyzed
 * - Results delivered via webhook or polling
 *
 * Workflow:
 * 1. User uploads video → stored with status "pending_moderation"
 * 2. Submit to Hive for async processing
 * 3. Hive processes and calls webhook OR we poll
 * 4. Update content status based on result
 *
 * Supports: MP4, MOV, WEBM, AVI
 * Max duration: 3 minutes (prayer responses should be brief)
 */

import { getHiveClient, ModerationResult, ModerationFlag } from './hiveClient';
import { ModerationStatus, ContentType } from './types';
import { supabase } from '@/lib/supabase';

export interface VideoModerationInput {
  videoUrl: string;
  contentId: string;
  userId?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
}

export interface VideoModerationOutput {
  status: ModerationStatus;
  taskId?: string;
  result?: ModerationResult;
  shouldBlock: boolean;
  message?: string;
}

export interface VideoTaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ModerationResult;
  error?: string;
}

// Maximum video duration in seconds (3 minutes)
const MAX_VIDEO_DURATION = 180;

// Supported video formats
const SUPPORTED_FORMATS = ['mp4', 'mov', 'webm', 'avi', 'm4v'];

// Maximum file size (100MB)
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

/**
 * Submit video for moderation
 *
 * Video moderation is async - this returns a task ID
 * Use checkVideoTask() to poll for results or set up webhook
 *
 * @param input - Video content details
 * @returns Task ID for tracking
 *
 * @example
 * const submission = await submitVideoForModeration({
 *   videoUrl: "https://storage.example.com/video-response.mp4",
 *   contentId: "response-789"
 * });
 *
 * // Poll for result
 * const result = await checkVideoTask(submission.taskId);
 */
export async function submitVideoForModeration(
  input: VideoModerationInput
): Promise<VideoModerationOutput> {
  const client = getHiveClient();

  try {
    // Validate video format
    const format = getVideoFormat(input.videoUrl);
    if (!format || !SUPPORTED_FORMATS.includes(format)) {
      return {
        status: 'rejected',
        shouldBlock: true,
        message: `Please upload video in ${SUPPORTED_FORMATS.join(', ')} format.`
      };
    }

    // Validate duration
    if (input.durationSeconds && input.durationSeconds > MAX_VIDEO_DURATION) {
      return {
        status: 'rejected',
        shouldBlock: true,
        message: 'Video responses must be under 3 minutes. Please record a shorter video.'
      };
    }

    // Get webhook URL from env (Supabase Edge Function)
    const webhookUrl = import.meta.env.VITE_MODERATION_WEBHOOK_URL;

    // Submit to Hive for async processing
    const { taskId } = await client.moderateVideo(input.videoUrl, webhookUrl);

    // Store pending moderation task in database
    await createPendingTask({
      taskId,
      contentId: input.contentId,
      videoUrl: input.videoUrl,
      userId: input.userId
    });

    return {
      status: 'pending',
      taskId,
      shouldBlock: false, // Content hidden until moderation completes
      message: 'Your video is being reviewed. This usually takes less than a minute.'
    };
  } catch (error) {
    console.error('[VideoModeration] Submit error:', error);

    return {
      status: 'pending',
      shouldBlock: false,
      message: 'Video moderation temporarily unavailable. Your video will be reviewed shortly.'
    };
  }
}

/**
 * Check status of video moderation task
 *
 * Call this to poll for results if not using webhooks
 */
export async function checkVideoTask(taskId: string): Promise<VideoTaskStatus> {
  const client = getHiveClient();

  try {
    const result = await client.getTaskResult(taskId);

    if (result === null) {
      return {
        taskId,
        status: 'processing'
      };
    }

    // Update database with result
    await updateTaskResult(taskId, result);

    return {
      taskId,
      status: 'completed',
      result
    };
  } catch (error) {
    console.error('[VideoModeration] Check task error:', error);

    return {
      taskId,
      status: 'failed',
      error: 'Failed to check moderation status'
    };
  }
}

/**
 * Process webhook callback from Hive
 * Called by Supabase Edge Function when Hive completes processing
 */
export async function processWebhookResult(
  taskId: string,
  hiveResult: unknown
): Promise<{ success: boolean; contentId?: string }> {
  try {
    // Parse Hive response
    const result = parseHiveWebhookResult(hiveResult);

    // Get content ID from pending task
    const { data: task } = await supabase
      .from('moderation_tasks')
      .select('content_id, user_id, video_url')
      .eq('task_id', taskId)
      .single();

    if (!task) {
      console.error('[VideoModeration] Task not found:', taskId);
      return { success: false };
    }

    // Log moderation result
    await logModerationRecord({
      contentId: task.content_id,
      contentType: 'video',
      status: result.approved ? 'approved' : 'rejected',
      result,
      userId: task.user_id,
      videoUrl: task.video_url
    });

    // Update content status
    await updateContentStatus(task.content_id, result.approved);

    // Mark task complete
    await supabase
      .from('moderation_tasks')
      .update({
        status: 'completed',
        result: result,
        completed_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    return { success: true, contentId: task.content_id };
  } catch (error) {
    console.error('[VideoModeration] Webhook processing error:', error);
    return { success: false };
  }
}

/**
 * Validate video file before upload
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
    return {
      valid: false,
      error: `Please use: ${SUPPORTED_FORMATS.join(', ')}`
    };
  }

  if (file.size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: 'Video too large. Maximum size is 100MB.'
    };
  }

  return { valid: true };
}

/**
 * Get estimated moderation time based on duration
 */
export function getEstimatedModerationTime(durationSeconds: number): string {
  if (durationSeconds < 30) return 'less than 30 seconds';
  if (durationSeconds < 60) return 'about 30 seconds';
  if (durationSeconds < 120) return 'about 1 minute';
  return 'about 2 minutes';
}

// Helper functions

function getVideoFormat(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('.').pop()?.toLowerCase() || null;
  } catch {
    return null;
  }
}

function parseHiveWebhookResult(hiveResult: unknown): ModerationResult {
  // Parse Hive's webhook payload into our format
  // This will need adjustment based on actual Hive webhook format
  const data = hiveResult as {
    output?: Array<{
      predictions?: Array<{
        class: string;
        score: number;
      }>;
    }>;
    processing_time?: number;
  };

  const flags: ModerationFlag[] = [];
  const rawScores: Record<string, number> = {};

  for (const output of data.output || []) {
    for (const pred of output.predictions || []) {
      rawScores[pred.class] = Math.max(rawScores[pred.class] || 0, pred.score);
    }
  }

  // Check thresholds
  const thresholds: Record<string, number> = {
    hate: 0.5,
    violence: 0.6,
    sexual: 0.5,
    self_harm: 0.4
  };

  for (const [className, score] of Object.entries(rawScores)) {
    const threshold = thresholds[className] || 0.5;
    if (score >= threshold) {
      flags.push({
        category: mapToCategory(className),
        severity: score >= 0.9 ? 'critical' : score >= 0.75 ? 'high' : 'medium',
        score,
        description: `Video flagged for ${className}`
      });
    }
  }

  return {
    approved: flags.length === 0,
    flags,
    rawScores,
    processingTimeMs: data.processing_time || 0,
    modelVersion: 'hive-video-v2'
  };
}

function mapToCategory(hiveClass: string): ModerationFlag['category'] {
  const mapping: Record<string, ModerationFlag['category']> = {
    hate: 'hate_speech',
    violence: 'violence',
    sexual: 'sexual_content',
    self_harm: 'self_harm',
    harassment: 'harassment'
  };
  return mapping[hiveClass.toLowerCase()] || 'spam';
}

async function createPendingTask(task: {
  taskId: string;
  contentId: string;
  videoUrl: string;
  userId?: string;
}): Promise<void> {
  await supabase.from('moderation_tasks').insert({
    task_id: task.taskId,
    content_id: task.contentId,
    video_url: task.videoUrl,
    user_id: task.userId,
    status: 'pending',
    created_at: new Date().toISOString()
  });
}

async function updateTaskResult(taskId: string, result: ModerationResult): Promise<void> {
  await supabase
    .from('moderation_tasks')
    .update({
      status: 'completed',
      result,
      completed_at: new Date().toISOString()
    })
    .eq('task_id', taskId);
}

async function updateContentStatus(contentId: string, approved: boolean): Promise<void> {
  // Update the prayer response status
  await supabase
    .from('prayer_responses')
    .update({
      moderation_status: approved ? 'approved' : 'rejected',
      is_visible: approved
    })
    .eq('id', contentId);
}

async function logModerationRecord(record: {
  contentId: string;
  contentType: ContentType;
  status: ModerationStatus;
  result: ModerationResult;
  userId?: string;
  videoUrl?: string;
}): Promise<void> {
  await supabase.from('moderation_logs').insert({
    content_id: record.contentId,
    content_type: record.contentType,
    status: record.status,
    flags: record.result.flags,
    raw_scores: record.result.rawScores,
    processing_time_ms: record.result.processingTimeMs,
    model_version: record.result.modelVersion,
    user_id: record.userId,
    metadata: { video_url: record.videoUrl },
    created_at: new Date().toISOString()
  });
}

export const videoModerationService = {
  submit: submitVideoForModeration,
  checkTask: checkVideoTask,
  processWebhook: processWebhookResult,
  validateFile: validateVideoFile,
  getEstimatedTime: getEstimatedModerationTime
};
