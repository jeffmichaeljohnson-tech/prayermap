/**
 * Text Moderation Service for PrayerMap
 *
 * Handles moderation of:
 * - Prayer request titles and content
 * - Prayer responses
 * - Chat messages
 * - User profile bios
 *
 * Uses Hive Moderation API with <200ms response time
 */

import { getHiveClient, ModerationResult, ModerationFlag, ModerationCategory } from './hiveClient';
import { ModerationStatus, ContentType, ModerationRecord } from './types';
import { supabase } from '@/lib/supabase';

export interface TextModerationInput {
  text: string;
  contentId: string;
  contentType: 'prayer' | 'response' | 'chat' | 'profile';
  userId?: string;
}

export interface TextModerationOutput {
  status: ModerationStatus;
  result: ModerationResult;
  shouldBlock: boolean;
  message?: string;
}

/**
 * Moderate text content in real-time
 *
 * @param input - Text content to moderate
 * @returns Moderation result with approval status
 *
 * @example
 * const result = await moderateText({
 *   text: "Please pray for my family",
 *   contentId: "prayer-123",
 *   contentType: "prayer"
 * });
 *
 * if (result.shouldBlock) {
 *   // Content rejected
 * }
 */
export async function moderateText(input: TextModerationInput): Promise<TextModerationOutput> {
  const client = getHiveClient();

  try {
    // Pre-validation: Skip empty or very short text
    if (!input.text || input.text.trim().length < 3) {
      return {
        status: 'approved',
        result: {
          approved: true,
          flags: [],
          rawScores: {},
          processingTimeMs: 0,
          modelVersion: 'skip-validation'
        },
        shouldBlock: false
      };
    }

    // Call Hive API for text moderation
    const result = await client.moderateText(input.text);

    // Log moderation record to database
    await logModerationRecord({
      contentId: input.contentId,
      contentType: 'text',
      status: result.approved ? 'approved' : 'rejected',
      result,
      userId: input.userId
    });

    // Determine response
    const status: ModerationStatus = result.approved ? 'approved' : 'rejected';

    return {
      status,
      result,
      shouldBlock: !result.approved,
      message: result.approved
        ? undefined
        : getFriendlyMessage(result.flags)
    };
  } catch (error) {
    console.error('[TextModeration] Error:', error);

    // On API error, log and allow (fail-open for now)
    // In production, you might want fail-closed
    return {
      status: 'approved',
      result: {
        approved: true,
        flags: [],
        rawScores: {},
        processingTimeMs: 0,
        modelVersion: 'error-fallback'
      },
      shouldBlock: false,
      message: undefined
    };
  }
}

/**
 * Batch moderate multiple text items
 * Useful for moderating chat history or prayer lists
 */
export async function moderateTextBatch(
  items: TextModerationInput[]
): Promise<Map<string, TextModerationOutput>> {
  const results = new Map<string, TextModerationOutput>();

  // Process in parallel with concurrency limit
  const BATCH_SIZE = 10;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(item => moderateText(item))
    );

    batch.forEach((item, index) => {
      results.set(item.contentId, batchResults[index]);
    });
  }

  return results;
}

/**
 * Quick check if text contains obvious profanity
 * Used as a fast pre-filter before API call
 */
export function quickProfanityCheck(text: string): boolean {
  // Basic word list for immediate blocking
  // This is a pre-filter, Hive will do comprehensive checking
  const obviousProfanity = [
    // Add basic profanity list here (keeping empty for spiritual context)
  ];

  const normalizedText = text.toLowerCase();
  return obviousProfanity.some(word => normalizedText.includes(word));
}

/**
 * Get a user-friendly rejection message
 */
function getFriendlyMessage(flags: ModerationFlag[]): string {
  if (flags.length === 0) {
    return 'Your content could not be posted at this time.';
  }

  const primaryFlag = flags.sort((a, b) => b.score - a.score)[0];

  const messages: Record<ModerationCategory, string> = {
    hate_speech: 'Your message contains language that may be hurtful to others. Please rephrase with kindness.',
    harassment: 'Your message may come across as targeting someone. Please rephrase with compassion.',
    violence: 'Your message contains references that aren\'t appropriate for this space. Please revise.',
    self_harm: 'We care about you. If you\'re struggling, please reach out to a crisis helpline.',
    sexual_content: 'Your message contains content that isn\'t appropriate for this space. Please revise.',
    spam: 'Your message appears to be spam. Please share genuine prayer requests.',
    profanity: 'Please use respectful language in this sacred space.',
    illegal_activity: 'Your message contains references that aren\'t allowed. Please revise.'
  };

  return messages[primaryFlag.category] ||
    'Your content could not be posted. Please review our community guidelines.';
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
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // Don't fail the moderation if logging fails
    console.error('[TextModeration] Failed to log moderation record:', error);
  }
}

export const textModerationService = {
  moderate: moderateText,
  moderateBatch: moderateTextBatch,
  quickCheck: quickProfanityCheck
};
