/**
 * useVideoModeration Hook
 *
 * Handles async video moderation with polling
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { moderationService, ModerationResponse } from '@/services/moderation';

export interface VideoModerationOptions {
  /** Called when moderation completes successfully */
  onApproved?: (contentId: string) => void;
  /** Called when video is rejected */
  onRejected?: (contentId: string, message: string) => void;
  /** Polling interval in ms (default: 3000) */
  pollInterval?: number;
  /** Max polling attempts (default: 20 = ~1 minute) */
  maxAttempts?: number;
}

export interface VideoModerationResult {
  submitVideo: (videoUrl: string, contentId: string, userId?: string) => Promise<void>;
  isProcessing: boolean;
  progress: 'uploading' | 'moderating' | 'completed' | 'failed' | null;
  error: string | null;
  taskId: string | null;
}

/**
 * Hook for video moderation with automatic polling
 *
 * @example
 * const { submitVideo, isProcessing, progress } = useVideoModeration({
 *   onApproved: (contentId) => {
 *     toast.success('Video published!');
 *     refreshResponses();
 *   },
 *   onRejected: (contentId, message) => {
 *     toast.error(message);
 *   }
 * });
 *
 * // After upload completes
 * await submitVideo(uploadedUrl, responseId, user.id);
 */
export function useVideoModeration(
  options: VideoModerationOptions = {}
): VideoModerationResult {
  const {
    onApproved,
    onRejected,
    pollInterval = 3000,
    maxAttempts = 20
  } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<VideoModerationResult['progress']>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const pollCountRef = useRef(0);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const pollForResult = useCallback(async (
    taskIdToPoll: string,
    contentId: string
  ) => {
    if (pollCountRef.current >= maxAttempts) {
      setError('Video processing timed out. Please try again.');
      setProgress('failed');
      setIsProcessing(false);
      return;
    }

    try {
      const status = await moderationService.checkVideoStatus(taskIdToPoll);

      if (status.status === 'completed') {
        setIsProcessing(false);

        if (status.result?.approved) {
          setProgress('completed');
          onApproved?.(contentId);
        } else {
          setProgress('failed');
          const message = 'Your video could not be published due to content guidelines.';
          setError(message);
          onRejected?.(contentId, message);
        }
        return;
      }

      if (status.status === 'failed') {
        setProgress('failed');
        setError('Video processing failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Still processing - poll again
      pollCountRef.current += 1;
      pollTimeoutRef.current = setTimeout(() => {
        pollForResult(taskIdToPoll, contentId);
      }, pollInterval);

    } catch (err) {
      console.error('[VideoModeration] Poll error:', err);

      // Retry on error
      pollCountRef.current += 1;
      pollTimeoutRef.current = setTimeout(() => {
        pollForResult(taskIdToPoll, contentId);
      }, pollInterval);
    }
    // Note: State setters (setError, setProgress, setIsProcessing) are stable and don't need to be in deps
    // Refs (pollCountRef, pollTimeoutRef) are also stable
    // taskIdToPoll and contentId are function parameters, passed in each recursive call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxAttempts, pollInterval, onApproved, onRejected]);

  const submitVideo = useCallback(async (
    videoUrl: string,
    contentId: string,
    userId?: string
  ) => {
    setIsProcessing(true);
    setProgress('moderating');
    setError(null);
    pollCountRef.current = 0;

    try {
      const result = await moderationService.moderate({
        type: 'video',
        data: {
          videoUrl,
          contentId,
          userId
        }
      });

      if (result.taskId) {
        setTaskId(result.taskId);
        // Start polling for result
        pollForResult(result.taskId, contentId);
      } else if (result.approved) {
        // Immediate approval (unlikely for video)
        setProgress('completed');
        setIsProcessing(false);
        onApproved?.(contentId);
      } else {
        setProgress('failed');
        setError(result.message || 'Video could not be processed.');
        setIsProcessing(false);
        onRejected?.(contentId, result.message || '');
      }
    } catch (err) {
      console.error('[VideoModeration] Submit error:', err);
      setProgress('failed');
      setError('Failed to submit video for moderation.');
      setIsProcessing(false);
    }
  }, [pollForResult, onApproved, onRejected]);

  return {
    submitVideo,
    isProcessing,
    progress,
    error,
    taskId
  };
}
