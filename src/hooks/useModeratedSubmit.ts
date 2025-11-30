/**
 * useModeratedSubmit Hook
 *
 * Wraps prayer/response submission with automatic moderation
 *
 * Features:
 * - Pre-submission moderation
 * - User-friendly error messages
 * - Loading states
 * - Retry logic
 */

import { useState, useCallback } from 'react';
import { moderationService } from '@/services/moderation';
import { toast } from 'sonner';

export interface ModeratedSubmitOptions<T> {
  /** Function to extract text content from the data */
  getTextContent: (data: T) => string;
  /** Function to generate a content ID */
  getContentId: (data: T) => string;
  /** Content type for moderation logging */
  contentType: 'prayer' | 'response' | 'chat' | 'profile';
  /** User ID for attribution */
  userId?: string;
  /** Original submit function to call after moderation passes */
  onSubmit: (data: T) => Promise<void>;
  /** Called when moderation rejects content */
  onRejected?: (message: string) => void;
  /** Success callback */
  onSuccess?: () => void;
}

export interface ModeratedSubmitResult<T> {
  submit: (data: T) => Promise<boolean>;
  isSubmitting: boolean;
  isModerating: boolean;
  error: string | null;
}

/**
 * Hook for submitting content with automatic moderation
 *
 * @example
 * const { submit, isSubmitting, isModerating } = useModeratedSubmit({
 *   getTextContent: (data) => data.content,
 *   getContentId: (data) => data.id || crypto.randomUUID(),
 *   contentType: 'prayer',
 *   onSubmit: async (data) => {
 *     await prayerService.create(data);
 *   },
 *   onSuccess: () => {
 *     toast.success('Prayer shared!');
 *   }
 * });
 *
 * // In form handler
 * const success = await submit({ content: 'Please pray for...' });
 */
export function useModeratedSubmit<T>(
  options: ModeratedSubmitOptions<T>
): ModeratedSubmitResult<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (data: T): Promise<boolean> => {
    setError(null);

    try {
      // Phase 1: Quick local check
      const textContent = options.getTextContent(data);

      // Skip moderation for empty content
      if (!textContent || textContent.trim().length < 3) {
        setIsSubmitting(true);
        await options.onSubmit(data);
        options.onSuccess?.();
        return true;
      }

      // Phase 2: AI Moderation
      setIsModerating(true);

      const contentId = options.getContentId(data);
      const result = await moderationService.moderate({
        type: 'text',
        data: {
          text: textContent,
          contentId,
          contentType: options.contentType,
          userId: options.userId
        }
      });

      setIsModerating(false);

      // Check moderation result
      if (!result.approved) {
        const message = result.message ||
          'Your content could not be posted. Please review our community guidelines.';

        setError(message);
        options.onRejected?.(message);

        // Show toast with kind message
        toast.error('Content Review', {
          description: message,
          duration: 5000
        });

        return false;
      }

      // Phase 3: Submit approved content
      setIsSubmitting(true);
      await options.onSubmit(data);

      options.onSuccess?.();
      return true;

    } catch (err) {
      console.error('[ModeratedSubmit] Error:', err);

      const errorMessage = err instanceof Error
        ? err.message
        : 'Something went wrong. Please try again.';

      setError(errorMessage);
      toast.error('Error', { description: errorMessage });

      return false;
    } finally {
      setIsSubmitting(false);
      setIsModerating(false);
    }
  }, [options]);

  return {
    submit,
    isSubmitting,
    isModerating,
    error
  };
}
