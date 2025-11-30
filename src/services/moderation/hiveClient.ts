/**
 * Hive Moderation API Client
 *
 * Hive provides <200ms content moderation with 99.6% precision
 * for text, audio, video, and images.
 *
 * API Docs: https://docs.thehive.ai/docs/api-reference
 */

import type { ModerationResult, ModerationFlag, ModerationCategory, ContentType } from './types';

interface HiveConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

interface HiveClassification {
  class: string;
  score: number;
}

interface HiveTextResponse {
  status: HiveStatus[];
  output: HiveTextOutput[];
}

interface HiveMediaResponse {
  status: HiveStatus[];
  output: HiveMediaOutput[];
}

interface HiveStatus {
  status: { code: number; message: string };
}

interface HiveTextOutput {
  text_data: {
    text: string;
  };
  predictions: HiveTextPrediction[];
}

interface HiveTextPrediction {
  class: string;
  score: number;
}

interface HiveMediaOutput {
  time?: number;
  predictions: HiveMediaPrediction[];
}

interface HiveMediaPrediction {
  class: string;
  score: number;
  bounding_box?: { x0: number; y0: number; x1: number; y1: number };
}

class HiveClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: HiveConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.thehive.ai/api/v2';
    this.timeout = config.timeout || 10000;
  }

  /**
   * Moderate text content
   * Endpoint: POST /task/sync/text_moderation
   */
  async moderateText(text: string): Promise<ModerationResult> {
    const startTime = Date.now();

    const response = await this.makeRequest('/task/sync/text_moderation', {
      text_data: text
    });

    return this.parseTextResponse(response, startTime);
  }

  /**
   * Moderate image from URL
   * Endpoint: POST /task/sync/image_moderation
   */
  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    const startTime = Date.now();

    const response = await this.makeRequest('/task/sync/image_moderation', {
      url: imageUrl
    });

    return this.parseMediaResponse(response, startTime);
  }

  /**
   * Moderate video from URL (async with webhook)
   * Endpoint: POST /task/async/video_moderation
   */
  async moderateVideo(videoUrl: string, webhookUrl?: string): Promise<{ taskId: string }> {
    const response = await this.makeRequest('/task/async/video_moderation', {
      url: videoUrl,
      callback_url: webhookUrl
    });

    return { taskId: response.task_id };
  }

  /**
   * Moderate audio from URL
   * Endpoint: POST /task/sync/audio_moderation
   */
  async moderateAudio(audioUrl: string): Promise<ModerationResult> {
    const startTime = Date.now();

    const response = await this.makeRequest('/task/sync/audio_moderation', {
      url: audioUrl
    });

    return this.parseMediaResponse(response, startTime);
  }

  /**
   * Get async task result (for video)
   */
  async getTaskResult(taskId: string): Promise<ModerationResult | null> {
    const startTime = Date.now();

    const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Hive API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'pending') {
      return null;
    }

    return this.parseMediaResponse(data, startTime);
  }

  private async makeRequest(endpoint: string, body: Record<string, unknown>): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hive API error ${response.status}: ${errorText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseTextResponse(response: HiveTextResponse, startTime: number): ModerationResult {
    const flags: ModerationFlag[] = [];
    const rawScores: Record<string, number> = {};

    const output = response.output?.[0];
    if (!output?.predictions) {
      return {
        approved: true,
        flags: [],
        rawScores: {},
        processingTimeMs: Date.now() - startTime,
        modelVersion: 'hive-text-v2'
      };
    }

    for (const prediction of output.predictions) {
      rawScores[prediction.class] = prediction.score;

      const mappedCategory = this.mapHiveClassToCategory(prediction.class);
      if (mappedCategory && prediction.score >= this.getThreshold(mappedCategory)) {
        flags.push({
          category: mappedCategory,
          severity: this.getSeverity(prediction.score),
          score: prediction.score,
          description: `Content flagged for ${prediction.class}`
        });
      }
    }

    return {
      approved: flags.length === 0,
      flags,
      rawScores,
      processingTimeMs: Date.now() - startTime,
      modelVersion: 'hive-text-v2'
    };
  }

  private parseMediaResponse(response: HiveMediaResponse, startTime: number): ModerationResult {
    const flags: ModerationFlag[] = [];
    const rawScores: Record<string, number> = {};

    for (const output of response.output || []) {
      for (const prediction of output.predictions || []) {
        // Track max score per class across all frames
        const currentScore = rawScores[prediction.class] || 0;
        rawScores[prediction.class] = Math.max(currentScore, prediction.score);
      }
    }

    // Check thresholds and create flags
    for (const [className, score] of Object.entries(rawScores)) {
      const mappedCategory = this.mapHiveClassToCategory(className);
      if (mappedCategory && score >= this.getThreshold(mappedCategory)) {
        flags.push({
          category: mappedCategory,
          severity: this.getSeverity(score),
          score,
          description: `Content flagged for ${className}`
        });
      }
    }

    return {
      approved: flags.length === 0,
      flags,
      rawScores,
      processingTimeMs: Date.now() - startTime,
      modelVersion: 'hive-media-v2'
    };
  }

  private mapHiveClassToCategory(hiveClass: string): ModerationCategory | null {
    const mapping: Record<string, ModerationCategory> = {
      'hate': 'hate_speech',
      'hate_speech': 'hate_speech',
      'harassment': 'harassment',
      'bullying': 'harassment',
      'violence': 'violence',
      'gore': 'violence',
      'self_harm': 'self_harm',
      'self-harm': 'self_harm',
      'sexual': 'sexual_content',
      'sexual_content': 'sexual_content',
      'nudity': 'sexual_content',
      'spam': 'spam',
      'profanity': 'profanity',
      'drugs': 'illegal_activity',
      'weapons': 'illegal_activity'
    };
    return mapping[hiveClass.toLowerCase()] || null;
  }

  private getThreshold(category: ModerationCategory): number {
    // Low tolerance = high thresholds (strict)
    // PrayerMap is a spiritual platform - we need very strict moderation
    const thresholds: Record<ModerationCategory, number> = {
      'hate_speech': 0.5,
      'harassment': 0.5,
      'violence': 0.6,
      'self_harm': 0.4,
      'sexual_content': 0.5,
      'spam': 0.7,
      'profanity': 0.6,
      'illegal_activity': 0.5
    };
    return thresholds[category];
  }

  private getSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.9) return 'critical';
    if (score >= 0.75) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }
}

// Singleton instance
let hiveClientInstance: HiveClient | null = null;

export function getHiveClient(): HiveClient {
  if (!hiveClientInstance) {
    const apiKey = import.meta.env.VITE_HIVE_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_HIVE_API_KEY environment variable is required');
    }
    hiveClientInstance = new HiveClient({ apiKey });
  }
  return hiveClientInstance;
}

export function createHiveClient(config: HiveConfig): HiveClient {
  return new HiveClient(config);
}

export { HiveClient };
export type { HiveConfig };
