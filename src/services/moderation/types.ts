/**
 * Moderation Types for PrayerMap
 *
 * Shared types used across moderation services
 */

export type ModerationCategory =
  | 'hate_speech'
  | 'harassment'
  | 'violence'
  | 'self_harm'
  | 'sexual_content'
  | 'spam'
  | 'profanity'
  | 'illegal_activity';

export type ContentType = 'text' | 'audio' | 'video' | 'image';

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'review';

export type ModerationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ModerationFlag {
  category: ModerationCategory;
  severity: ModerationSeverity;
  score: number;
  description: string;
}

export interface ModerationResult {
  approved: boolean;
  flags: ModerationFlag[];
  rawScores: Record<string, number>;
  processingTimeMs: number;
  modelVersion: string;
}

export interface ModerationRecord {
  id: string;
  contentId: string;
  contentType: ContentType;
  status: ModerationStatus;
  result: ModerationResult;
  createdAt: Date;
  updatedAt: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface ModerationConfig {
  enabled: boolean;
  strictMode: boolean; // Low tolerance
  autoReject: boolean; // No humans
  thresholds: Record<ModerationCategory, number>;
  webhookUrl?: string;
}

export const DEFAULT_MODERATION_CONFIG: ModerationConfig = {
  enabled: true,
  strictMode: true,
  autoReject: true,
  thresholds: {
    hate_speech: 0.5,
    harassment: 0.5,
    violence: 0.6,
    self_harm: 0.4,
    sexual_content: 0.5,
    spam: 0.7,
    profanity: 0.6,
    illegal_activity: 0.5
  }
};
