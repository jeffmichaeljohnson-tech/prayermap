/**
 * EXAMPLE: How to integrate logging in a React Component
 *
 * This example shows how to add logging to RequestPrayerModal.tsx
 * Copy these patterns to your actual component files.
 */

import { useState, useEffect } from 'react';
import { useLogger, useRenderLogger } from '../lib/logger';
import { usePerformance } from '../lib/performanceMonitor';
import { errorTracker } from '../lib/errorTracking';
import { debugMode } from '../lib/debugMode';

interface RequestPrayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prayer: { title: string; description: string }) => Promise<void>;
}

export function RequestPrayerModal({ isOpen, onClose, onSubmit }: RequestPrayerModalProps) {
  // Create component-specific logger
  const logger = useLogger('RequestPrayerModal');

  // Track component renders (only in dev mode)
  useRenderLogger('RequestPrayerModal');

  // Track component performance
  const { trackInteraction } = usePerformance('RequestPrayerModal');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Log when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      logger.info('Prayer request modal opened', {
        action: 'modal_opened',
      });

      errorTracker.addBreadcrumb({
        category: 'custom',
        message: 'RequestPrayerModal opened',
        level: 'info',
      });
    } else {
      logger.debug('Prayer request modal closed', {
        action: 'modal_closed',
      });
    }
  }, [isOpen]);

  // Log user interactions
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);

    // Only log in debug mode to avoid spam
    if (debugMode.isEnabled()) {
      logger.debug('Title changed', {
        action: 'field_changed',
        metadata: {
          field: 'title',
          length: e.target.value.length,
        },
      });
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);

    if (debugMode.isEnabled()) {
      logger.debug('Description changed', {
        action: 'field_changed',
        metadata: {
          field: 'description',
          length: e.target.value.length,
        },
      });
    }
  };

  // Log form submission with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const endTrack = trackInteraction('submitPrayer');

    // Validation logging
    if (!title.trim()) {
      logger.warn('Prayer submission attempted without title', {
        action: 'validation_failed',
        metadata: {
          field: 'title',
          reason: 'empty',
        },
      });

      setError('Please enter a title');
      endTrack();
      return;
    }

    if (!description.trim()) {
      logger.warn('Prayer submission attempted without description', {
        action: 'validation_failed',
        metadata: {
          field: 'description',
          reason: 'empty',
        },
      });

      setError('Please enter a description');
      endTrack();
      return;
    }

    logger.info('Submitting prayer request', {
      action: 'prayer_submit_start',
      metadata: {
        titleLength: title.length,
        descriptionLength: description.length,
      },
    });

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({ title, description });

      logger.info('Prayer request submitted successfully', {
        action: 'prayer_submit_success',
        metadata: {
          titleLength: title.length,
          descriptionLength: description.length,
        },
      });

      errorTracker.addBreadcrumb({
        category: 'custom',
        message: 'Prayer request submitted',
        level: 'info',
      });

      // Reset form
      setTitle('');
      setDescription('');

      // Close modal
      onClose();

      endTrack();
    } catch (err) {
      const error = err as Error;

      logger.error('Failed to submit prayer request', error, {
        action: 'prayer_submit_failed',
        metadata: {
          titleLength: title.length,
          descriptionLength: description.length,
        },
      });

      errorTracker.captureException(error, {
        context: 'RequestPrayerModal.handleSubmit',
        formData: {
          titleLength: title.length,
          descriptionLength: description.length,
        },
      });

      setError('Failed to submit prayer request. Please try again.');
      setIsSubmitting(false);

      endTrack();
    }
  };

  // Log cancel action
  const handleCancel = () => {
    logger.info('Prayer request cancelled', {
      action: 'prayer_submit_cancelled',
      metadata: {
        hadTitle: !!title,
        hadDescription: !!description,
      },
    });

    errorTracker.addBreadcrumb({
      category: 'click',
      message: 'Prayer request cancelled',
      level: 'info',
    });

    setTitle('');
    setDescription('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Request Prayer</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="What would you like prayer for?"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              className="w-full px-4 py-2 border rounded-lg"
              rows={4}
              placeholder="Share more details..."
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3 border rounded-full"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-300 to-purple-300 rounded-full font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Example: Error Boundary wrapper for component
import { withErrorTracking } from '../lib/errorTracking';

export const RequestPrayerModalWithErrorTracking = withErrorTracking(
  RequestPrayerModal,
  'RequestPrayerModal'
);
