/**
 * Media types and interfaces for comprehensive media sharing
 * Supports images, videos, audio, and voice messages with spiritual context
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface MediaMetadata {
  duration?: number; // for audio/video in seconds
  dimensions?: { width: number; height: number }; // for images/video
  size: number; // file size in bytes
  mimeType: string;
  fileName: string;
  orientation?: number; // EXIF orientation for images
  bitrate?: number; // for audio/video
  sampleRate?: number; // for audio
  colorSpace?: string; // for images
}

export interface SpiritualContext {
  isPrayerImage?: boolean;
  containsScripture?: boolean;
  scriptureVerses?: Array<{
    text: string;
    reference?: string;
    confidence: number;
  }>;
  prayerLocation?: GeoLocation;
  emotionalTone?: 'hopeful' | 'peaceful' | 'urgent' | 'grateful' | 'sad' | 'joyful';
  hasPrayerOverlay?: boolean;
}

export interface MediaUpload {
  id: string;
  file: File;
  type: 'image' | 'video' | 'audio' | 'voice_message';
  metadata: MediaMetadata;
  uploadProgress: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  thumbnailUrl?: string;
  url?: string;
  spiritualContext?: SpiritualContext;
  compressionLevel?: 'none' | 'low' | 'medium' | 'high';
  error?: string;
}

export interface MediaMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content?: string; // Caption text
  mediaUpload: MediaUpload;
  timestamp: Date;
  isRead: boolean;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyTo?: string; // ID of message being replied to
}

export interface MediaProcessingOptions {
  compress?: boolean;
  generateThumbnail?: boolean;
  detectSpiritual?: boolean;
  addPrayerOverlay?: boolean;
  overlayText?: string;
  compressionQuality?: number; // 0-1
  maxDimensions?: { width: number; height: number };
}

export interface CompressionSettings {
  image: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'webp' | 'jpeg' | 'png';
  };
  video: {
    maxWidth: number;
    maxHeight: number;
    bitrate: number;
    format: 'mp4' | 'webm';
  };
  audio: {
    bitrate: number;
    sampleRate: number;
    format: 'webm' | 'mp3' | 'aac';
  };
}

export interface VoiceMessageState {
  isRecording: boolean;
  duration: number;
  audioLevel: number;
  waveformData: number[];
  isPaused: boolean;
  maxDuration: number; // 5 minutes like WhatsApp
}

export interface ImageCaptureOptions {
  source: 'camera' | 'gallery' | 'file';
  allowEditing: boolean;
  maxSize?: number;
  aspectRatio?: 'square' | 'original' | '16:9' | '4:3';
  quality?: number; // 0-100
  preferredCameraDirection?: 'front' | 'rear';
}

export interface MediaPreview {
  id: string;
  type: MediaUpload['type'];
  url: string;
  thumbnailUrl?: string;
  metadata: Partial<MediaMetadata>;
  isSelected: boolean;
}

export interface MediaGallery {
  items: MediaPreview[];
  currentIndex: number;
  isOpen: boolean;
}

export interface UploadQueue {
  items: MediaUpload[];
  isProcessing: boolean;
  retryCount: number;
  maxRetries: number;
}

// Progress callback for upload operations
export type ProgressCallback = (progress: number, stage: string) => void;

// Error types for media operations
export type MediaError = 
  | 'PERMISSION_DENIED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'COMPRESSION_FAILED'
  | 'UPLOAD_FAILED'
  | 'NETWORK_ERROR'
  | 'STORAGE_FULL'
  | 'PROCESSING_TIMEOUT';

export interface MediaErrorDetails {
  type: MediaError;
  message: string;
  originalError?: Error;
  retryable: boolean;
}

// Constants for mobile optimization
export const MEDIA_CONSTANTS = {
  MAX_FILE_SIZE: {
    IMAGE: 10 * 1024 * 1024, // 10MB
    VIDEO: 100 * 1024 * 1024, // 100MB
    AUDIO: 25 * 1024 * 1024, // 25MB
    VOICE: 10 * 1024 * 1024, // 10MB
  },
  COMPRESSION: {
    IMAGE: {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      format: 'webp' as const
    },
    VIDEO: {
      maxWidth: 1280,
      maxHeight: 720,
      bitrate: 1000000, // 1Mbps
      format: 'mp4' as const
    },
    AUDIO: {
      bitrate: 128000, // 128kbps
      sampleRate: 44100,
      format: 'webm' as const
    }
  },
  THUMBNAIL: {
    WIDTH: 200,
    HEIGHT: 200,
    QUALITY: 0.7
  },
  VOICE: {
    MAX_DURATION: 300, // 5 minutes in seconds
    SAMPLE_RATE: 44100,
    BIT_RATE: 64000 // 64kbps for voice
  }
} as const;

// Scripture detection patterns for prayer context
export const SCRIPTURE_PATTERNS = [
  /\b\d*\s*[A-Z][a-z]+\s+\d+:\d+(-\d+)?\b/, // "John 3:16" format
  /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s*Samuel|2\s*Samuel|1\s*Kings|2\s*Kings|1\s*Chronicles|2\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song\s*of\s*Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\s*Corinthians|2\s*Corinthians|Galatians|Ephesians|Philippians|Colossians|1\s*Thessalonians|2\s*Thessalonians|1\s*Timothy|2\s*Timothy|Titus|Philemon|Hebrews|James|1\s*Peter|2\s*Peter|1\s*John|2\s*John|3\s*John|Jude|Revelation)\s+\d+:\d+(-\d+)?\b/i
] as const;