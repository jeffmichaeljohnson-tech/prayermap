/**
 * Unified Moderation Service for PrayerMap
 *
 * Single entry point for all content moderation:
 * - Text (prayers, responses, chat)
 * - Audio (audio prayers)
 * - Video (video responses)
 *
 * Features:
 * - Automatic content type detection
 * - Consistent API across all content types
 * - Centralized logging and analytics
 * - Configurable thresholds
 */

import { textModerationService, TextModerationInput } from './textModerationService';
import { audioModerationService, AudioModerationInput } from './audioModerationService';
import { videoModerationService, VideoModerationInput } from './videoModerationService';
import { ModerationResult, ModerationConfig, DEFAULT_MODERATION_CONFIG, ModerationStatus } from './types';
import { supabase } from '@/lib/supabase';

export type ContentToModerate =
  | { type: 'text'; data: TextModerationInput }
  | { type: 'audio'; data: AudioModerationInput }
  | { type: 'video'; data: VideoModerationInput };

export interface ModerationResponse {
  contentId: string;
  contentType: 'text' | 'audio' | 'video';
  status: ModerationStatus;
  approved: boolean;
  taskId?: string; // For async video moderation
  message?: string;
  result?: ModerationResult;
  processingTimeMs: number;
}

/**
 * Main moderation function - routes to appropriate service
 *
 * @example
 * // Text moderation
 * await moderate({
 *   type: 'text',
 *   data: { text: 'Prayer content', contentId: '123', contentType: 'prayer' }
 * });
 *
 * // Audio moderation
 * await moderate({
 *   type: 'audio',
 *   data: { audioUrl: 'https://...', contentId: '456', contentType: 'audio_prayer' }
 * });
 *
 * // Video moderation (async)
 * await moderate({
 *   type: 'video',
 *   data: { videoUrl: 'https://...', contentId: '789' }
 * });
 */
export async function moderate(content: ContentToModerate): Promise<ModerationResponse> {
  const startTime = Date.now();

  // Check if moderation is enabled
  const config = await getModerationConfig();
  if (!config.enabled) {
    return {
      contentId: getContentId(content),
      contentType: content.type,
      status: 'approved',
      approved: true,
      processingTimeMs: Date.now() - startTime
    };
  }

  switch (content.type) {
    case 'text':
      return moderateTextContent(content.data, startTime);
    case 'audio':
      return moderateAudioContent(content.data, startTime);
    case 'video':
      return moderateVideoContent(content.data, startTime);
    default:
      throw new Error(`Unknown content type`);
  }
}

/**
 * Quick text check - use before full moderation for instant feedback
 */
export function quickCheck(text: string): boolean {
  return !textModerationService.quickCheck(text);
}

/**
 * Check video moderation task status
 */
export async function checkVideoStatus(taskId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ModerationResult;
}> {
  return videoModerationService.checkTask(taskId);
}

/**
 * Process webhook from Hive for video moderation
 */
export async function processVideoWebhook(taskId: string, payload: unknown): Promise<boolean> {
  const result = await videoModerationService.processWebhook(taskId, payload);
  return result.success;
}

/**
 * Get moderation statistics
 */
export async function getModerationStats(days: number = 30): Promise<{
  total: number;
  approved: number;
  rejected: number;
  approvalRate: number;
  avgProcessingTimeMs: number;
  byContentType: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .rpc('get_moderation_stats', {
      start_date: startDate.toISOString(),
      end_date: new Date().toISOString()
    });

  if (error || !data) {
    console.error('[Moderation] Stats error:', error);
    return {
      total: 0,
      approved: 0,
      rejected: 0,
      approvalRate: 0,
      avgProcessingTimeMs: 0,
      byContentType: {},
      byCategory: {}
    };
  }

  return {
    total: data.total_moderated || 0,
    approved: data.approved_count || 0,
    rejected: data.rejected_count || 0,
    approvalRate: data.approval_rate || 0,
    avgProcessingTimeMs: data.avg_processing_time_ms || 0,
    byContentType: data.by_content_type || {},
    byCategory: data.by_flag_category || {}
  };
}

/**
 * Update moderation thresholds
 * Only callable by admins
 */
export async function updateModerationConfig(
  updates: Partial<ModerationConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('moderation_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('config_name', 'default');

    if (error) throw error;

    // Clear cached config
    cachedConfig = null;

    return { success: true };
  } catch (error) {
    console.error('[Moderation] Config update error:', error);
    return {
      success: false,
      error: 'Failed to update moderation config'
    };
  }
}

// Helper functions

async function moderateTextContent(
  data: TextModerationInput,
  startTime: number
): Promise<ModerationResponse> {
  const result = await textModerationService.moderate(data);

  return {
    contentId: data.contentId,
    contentType: 'text',
    status: result.status,
    approved: !result.shouldBlock,
    message: result.message,
    result: result.result,
    processingTimeMs: Date.now() - startTime
  };
}

async function moderateAudioContent(
  data: AudioModerationInput,
  startTime: number
): Promise<ModerationResponse> {
  const result = await audioModerationService.moderate(data);

  return {
    contentId: data.contentId,
    contentType: 'audio',
    status: result.status,
    approved: !result.shouldBlock,
    message: result.message,
    result: result.result,
    processingTimeMs: Date.now() - startTime
  };
}

async function moderateVideoContent(
  data: VideoModerationInput,
  startTime: number
): Promise<ModerationResponse> {
  const result = await videoModerationService.submit(data);

  return {
    contentId: data.contentId,
    contentType: 'video',
    status: result.status,
    approved: result.status === 'pending' ? false : !result.shouldBlock, // Pending = not yet approved
    taskId: result.taskId,
    message: result.message,
    processingTimeMs: Date.now() - startTime
  };
}

function getContentId(content: ContentToModerate): string {
  return content.data.contentId;
}

// Config caching
let cachedConfig: ModerationConfig | null = null;
let configLastFetched = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute

async function getModerationConfig(): Promise<ModerationConfig> {
  const now = Date.now();

  if (cachedConfig && (now - configLastFetched) < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase
      .from('moderation_config')
      .select('*')
      .eq('config_name', 'default')
      .single();

    if (error || !data) {
      return DEFAULT_MODERATION_CONFIG;
    }

    cachedConfig = {
      enabled: data.enabled,
      strictMode: data.strict_mode,
      autoReject: data.auto_reject,
      thresholds: data.thresholds
    };
    configLastFetched = now;

    return cachedConfig;
  } catch {
    return DEFAULT_MODERATION_CONFIG;
  }
}

// Export unified service
export const moderationService = {
  moderate,
  quickCheck,
  checkVideoStatus,
  processVideoWebhook,
  getStats: getModerationStats,
  updateConfig: updateModerationConfig,

  // Direct access to specialized services
  text: textModerationService,
  audio: audioModerationService,
  video: videoModerationService
};
