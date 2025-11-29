/**
 * Audio Moderation Service for PrayerMap
 *
 * Handles moderation of:
 * - Audio prayer recordings
 * - Voice prayer responses
 *
 * Uses Hive Moderation API which:
 * 1. Transcribes audio in real-time
 * 2. Moderates the transcription
 * 3. Analyzes audio for harmful sounds
 *
 * Supports: MP3, WAV, M4A, OGG, WEBM
 * Max duration: 10 minutes
 */

import { getHiveClient, ModerationResult, ModerationFlag } from './hiveClient';
import { ModerationStatus, ContentType } from './types';
import { supabase } from '@/lib/supabase';

export interface AudioModerationInput {
  audioUrl: string;
  contentId: string;
  contentType: 'audio_prayer' | 'audio_response';
  userId?: string;
  durationSeconds?: number;
}

export interface AudioModerationOutput {
  status: ModerationStatus;
  result: ModerationResult;
  shouldBlock: boolean;
  transcription?: string;
  message?: string;
}

// Maximum audio duration in seconds (10 minutes)
const MAX_AUDIO_DURATION = 600;

// Supported audio formats
const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac'];

/**
 * Moderate audio content
 *
 * Hive's audio moderation:
 * - Transcribes speech to text
 * - Moderates transcribed text
 * - Detects harmful audio patterns
 *
 * @param input - Audio content details
 * @returns Moderation result with transcription
 *
 * @example
 * const result = await moderateAudio({
 *   audioUrl: "https://storage.example.com/prayer-audio.mp3",
 *   contentId: "prayer-456",
 *   contentType: "audio_prayer"
 * });
 */
export async function moderateAudio(input: AudioModerationInput): Promise<AudioModerationOutput> {
  const client = getHiveClient();

  try {
    // Validate audio format
    const format = getAudioFormat(input.audioUrl);
    if (!format || !SUPPORTED_FORMATS.includes(format)) {
      return {
        status: 'rejected',
        result: {
          approved: false,
          flags: [{
            category: 'spam',
            severity: 'low',
            score: 1,
            description: 'Unsupported audio format'
          }],
          rawScores: {},
          processingTimeMs: 0,
          modelVersion: 'format-validation'
        },
        shouldBlock: true,
        message: 'Please upload audio in MP3, WAV, M4A, or OGG format.'
      };
    }

    // Validate duration if provided
    if (input.durationSeconds && input.durationSeconds > MAX_AUDIO_DURATION) {
      return {
        status: 'rejected',
        result: {
          approved: false,
          flags: [{
            category: 'spam',
            severity: 'low',
            score: 1,
            description: 'Audio too long'
          }],
          rawScores: {},
          processingTimeMs: 0,
          modelVersion: 'duration-validation'
        },
        shouldBlock: true,
        message: 'Audio prayers must be under 10 minutes. Please record a shorter prayer.'
      };
    }

    // Call Hive API for audio moderation
    const result = await client.moderateAudio(input.audioUrl);

    // Log moderation record
    await logModerationRecord({
      contentId: input.contentId,
      contentType: 'audio',
      status: result.approved ? 'approved' : 'rejected',
      result,
      userId: input.userId,
      audioUrl: input.audioUrl
    });

    return {
      status: result.approved ? 'approved' : 'rejected',
      result,
      shouldBlock: !result.approved,
      message: result.approved
        ? undefined
        : getFriendlyAudioMessage(result.flags)
    };
  } catch (error) {
    console.error('[AudioModeration] Error:', error);

    // Fail-open on API error
    return {
      status: 'approved',
      result: {
        approved: true,
        flags: [],
        rawScores: {},
        processingTimeMs: 0,
        modelVersion: 'error-fallback'
      },
      shouldBlock: false
    };
  }
}

/**
 * Validate audio file before upload
 * Call this before uploading to storage to save bandwidth
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported format. Please use: ${SUPPORTED_FORMATS.join(', ')}`
    };
  }

  // Check file size (max 50MB)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: 'Audio file too large. Maximum size is 50MB.'
    };
  }

  return { valid: true };
}

/**
 * Extract audio format from URL
 */
function getAudioFormat(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extension = pathname.split('.').pop()?.toLowerCase();
    return extension || null;
  } catch {
    return null;
  }
}

/**
 * Get friendly rejection message for audio
 */
function getFriendlyAudioMessage(flags: ModerationFlag[]): string {
  if (flags.length === 0) {
    return 'Your audio prayer could not be posted at this time.';
  }

  const primaryFlag = flags.sort((a, b) => b.score - a.score)[0];

  // Audio-specific messages
  const messages: Record<string, string> = {
    hate_speech: 'Your audio contains language that may be hurtful. Please re-record with kindness.',
    harassment: 'Your audio may contain targeting language. Please re-record with compassion.',
    violence: 'Your audio contains content not appropriate for this space. Please re-record.',
    self_harm: 'We care about you. If you\'re struggling, please reach out to someone who can help.',
    sexual_content: 'Your audio contains content not appropriate for this space. Please re-record.',
    spam: 'Your audio appears to be spam. Please share genuine prayer requests.',
    profanity: 'Please use respectful language in this sacred space.',
    illegal_activity: 'Your audio contains references that aren\'t allowed. Please re-record.'
  };

  return messages[primaryFlag.category] ||
    'Your audio prayer could not be posted. Please review our community guidelines.';
}

/**
 * Log moderation record to database
 */
async function logModerationRecord(record: {
  contentId: string;
  contentType: ContentType;
  status: ModerationStatus;
  result: ModerationResult;
  userId?: string;
  audioUrl?: string;
}): Promise<void> {
  try {
    await supabase.from('moderation_logs').insert({
      content_id: record.contentId,
      content_type: record.contentType,
      status: record.status,
      flags: record.result.flags,
      raw_scores: record.result.rawScores,
      processing_time_ms: record.result.processingTimeMs,
      model_version: record.result.modelVersion,
      user_id: record.userId,
      metadata: { audio_url: record.audioUrl },
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[AudioModeration] Failed to log:', error);
  }
}

export const audioModerationService = {
  moderate: moderateAudio,
  validateFile: validateAudioFile
};
