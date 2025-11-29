/**
 * EXAMPLE: How to integrate logging in a React Hook
 *
 * This example shows how to add logging to usePrayers.ts
 * Copy these patterns to your actual hook files.
 */

import { useState, useEffect } from 'react';
import { useLogger } from '../lib/logger';
import { usePerformance } from '../lib/performanceMonitor';
import { errorTracker } from '../lib/errorTracking';

interface Prayer {
  id: string;
  title: string;
  description: string;
  location: { lat: number; lng: number };
}

export function usePrayers(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}) {
  // Create a hook-specific logger
  const logger = useLogger('usePrayers');

  // Track component performance
  const { trackInteraction } = usePerformance('usePrayers');

  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Effect with logging
  useEffect(() => {
    // Add breadcrumb for debugging
    errorTracker.addBreadcrumb({
      category: 'custom',
      message: 'usePrayers: Fetching prayers',
      level: 'info',
      data: { bounds },
    });

    logger.info('Fetching prayers for bounds', {
      action: 'prayers_fetch_start',
      metadata: { bounds },
    });

    let isCancelled = false;

    const fetchPrayers = async () => {
      setLoading(true);
      setError(null);

      try {
        const startTime = performance.now();

        const response = await fetch('/api/prayers', {
          method: 'GET',
          // ... fetch logic
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch prayers: ${response.statusText}`);
        }

        const data = await response.json();

        if (!isCancelled) {
          setPrayers(data);

          const duration = performance.now() - startTime;

          logger.info('Prayers fetched successfully', {
            action: 'prayers_fetch_success',
            duration,
            metadata: {
              count: data.length,
              bounds,
            },
          });

          // Add breadcrumb for successful fetch
          errorTracker.addBreadcrumb({
            category: 'xhr',
            message: `Fetched ${data.length} prayers`,
            level: 'info',
          });
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err as Error;
          setError(error);

          logger.error('Failed to fetch prayers', error, {
            action: 'prayers_fetch_failed',
            metadata: { bounds },
          });

          // Capture error
          errorTracker.captureException(error, {
            context: 'usePrayers',
            bounds,
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchPrayers();

    return () => {
      isCancelled = true;
      logger.debug('usePrayers cleanup', {
        action: 'prayers_fetch_cleanup',
      });
    };
  }, [bounds.north, bounds.south, bounds.east, bounds.west]);

  // Logged action: Create prayer
  const createPrayer = async (data: Omit<Prayer, 'id'>) => {
    const endTrack = trackInteraction('createPrayer');

    logger.info('Creating prayer', {
      action: 'prayer_create_start',
      metadata: {
        hasTitle: !!data.title,
        hasDescription: !!data.description,
      },
    });

    try {
      const response = await fetch('/api/prayers', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create prayer: ${response.statusText}`);
      }

      const newPrayer = await response.json();

      // Update local state
      setPrayers(prev => [...prev, newPrayer]);

      logger.info('Prayer created successfully', {
        action: 'prayer_create_success',
        metadata: {
          prayerId: newPrayer.id,
        },
      });

      errorTracker.addBreadcrumb({
        category: 'custom',
        message: 'Prayer created',
        level: 'info',
        data: { prayerId: newPrayer.id },
      });

      endTrack();

      return newPrayer;
    } catch (err) {
      const error = err as Error;

      logger.error('Failed to create prayer', error, {
        action: 'prayer_create_failed',
      });

      errorTracker.captureException(error, {
        context: 'usePrayers.createPrayer',
        data,
      });

      endTrack();

      throw error;
    }
  };

  // Logged action: Update prayer
  const updatePrayer = async (id: string, updates: Partial<Prayer>) => {
    const endTrack = trackInteraction('updatePrayer');

    logger.info('Updating prayer', {
      action: 'prayer_update_start',
      metadata: {
        prayerId: id,
        fields: Object.keys(updates),
      },
    });

    try {
      const response = await fetch(`/api/prayers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update prayer: ${response.statusText}`);
      }

      const updatedPrayer = await response.json();

      // Update local state
      setPrayers(prev =>
        prev.map(p => (p.id === id ? updatedPrayer : p))
      );

      logger.info('Prayer updated successfully', {
        action: 'prayer_update_success',
        metadata: {
          prayerId: id,
          fields: Object.keys(updates),
        },
      });

      endTrack();

      return updatedPrayer;
    } catch (err) {
      const error = err as Error;

      logger.error('Failed to update prayer', error, {
        action: 'prayer_update_failed',
        metadata: {
          prayerId: id,
        },
      });

      errorTracker.captureException(error, {
        context: 'usePrayers.updatePrayer',
        prayerId: id,
        updates,
      });

      endTrack();

      throw error;
    }
  };

  // Logged action: Delete prayer
  const deletePrayer = async (id: string) => {
    const endTrack = trackInteraction('deletePrayer');

    logger.info('Deleting prayer', {
      action: 'prayer_delete_start',
      metadata: { prayerId: id },
    });

    try {
      const response = await fetch(`/api/prayers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete prayer: ${response.statusText}`);
      }

      // Update local state
      setPrayers(prev => prev.filter(p => p.id !== id));

      logger.info('Prayer deleted successfully', {
        action: 'prayer_delete_success',
        metadata: { prayerId: id },
      });

      endTrack();
    } catch (err) {
      const error = err as Error;

      logger.error('Failed to delete prayer', error, {
        action: 'prayer_delete_failed',
        metadata: { prayerId: id },
      });

      errorTracker.captureException(error, {
        context: 'usePrayers.deletePrayer',
        prayerId: id,
      });

      endTrack();

      throw error;
    }
  };

  return {
    prayers,
    loading,
    error,
    createPrayer,
    updatePrayer,
    deletePrayer,
  };
}
