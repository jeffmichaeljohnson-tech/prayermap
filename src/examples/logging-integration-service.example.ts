/**
 * EXAMPLE: How to integrate logging in a Service
 *
 * This example shows how to add logging to prayerService.ts
 * Copy these patterns to your actual service files.
 */

import { logger, Logger } from '../lib/logger';
import { performanceMonitor } from '../lib/performanceMonitor';

// Create a service-specific logger
const serviceLogger: Logger = logger.child({
  component: 'PrayerService',
});

// Example: Creating a prayer with logging
export async function createPrayer(data: {
  title: string;
  description: string;
  location: { lat: number; lng: number };
  userId: string;
}) {
  // Log the start of the operation
  serviceLogger.info('Creating prayer', {
    action: 'prayer_create_start',
    userId: data.userId,
    metadata: {
      hasTitle: !!data.title,
      hasDescription: !!data.description,
      hasLocation: !!data.location,
    },
  });

  // Track the async operation with automatic timing
  try {
    const result = await logger.trackAsync(
      'createPrayer',
      async () => {
        // Your actual create prayer logic here
        const startTime = performance.now();

        // Simulate API call
        const response = await fetch('/api/prayers', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to create prayer: ${response.statusText}`);
        }

        const prayer = await response.json();

        // Track API call performance
        performanceMonitor.trackApiCall(
          '/api/prayers',
          performance.now() - startTime,
          true
        );

        return prayer;
      },
      {
        action: 'prayer_create',
        userId: data.userId,
      }
    );

    // Log success
    serviceLogger.info('Prayer created successfully', {
      action: 'prayer_create_success',
      userId: data.userId,
      metadata: {
        prayerId: result.id,
      },
    });

    return result;
  } catch (error) {
    // Log error (automatically captured by trackAsync, but we can add more context)
    serviceLogger.error(
      'Failed to create prayer',
      error as Error,
      {
        action: 'prayer_create_failed',
        userId: data.userId,
        metadata: {
          title: data.title,
        },
      }
    );

    throw error;
  }
}

// Example: Fetching prayers with performance tracking
export async function fetchPrayers(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}) {
  // Use the time() method for simple timing
  const endTimer = serviceLogger.time('fetchPrayers');

  serviceLogger.debug('Fetching prayers in bounds', {
    action: 'prayers_fetch',
    metadata: { bounds },
  });

  try {
    const response = await fetch('/api/prayers', {
      method: 'GET',
      // ... your fetch logic
    });

    const prayers = await response.json();

    // End the timer
    endTimer();

    serviceLogger.info('Prayers fetched successfully', {
      action: 'prayers_fetch_success',
      metadata: {
        count: prayers.length,
      },
    });

    return prayers;
  } catch (error) {
    endTimer();

    serviceLogger.error('Failed to fetch prayers', error as Error, {
      action: 'prayers_fetch_failed',
      metadata: { bounds },
    });

    throw error;
  }
}

// Example: Updating prayer with validation logging
export async function updatePrayer(
  prayerId: string,
  updates: Partial<{ title: string; description: string; status: string }>
) {
  // Log validation
  if (!prayerId) {
    serviceLogger.warn('Invalid prayer ID in update', {
      action: 'prayer_update_invalid_id',
      metadata: { prayerId },
    });
    throw new Error('Prayer ID is required');
  }

  serviceLogger.info('Updating prayer', {
    action: 'prayer_update_start',
    metadata: {
      prayerId,
      fields: Object.keys(updates),
    },
  });

  try {
    const startTime = performance.now();

    const response = await fetch(`/api/prayers/${prayerId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Update failed: ${response.statusText}`);
    }

    const updatedPrayer = await response.json();

    performanceMonitor.trackApiCall(
      `/api/prayers/${prayerId}`,
      performance.now() - startTime,
      true
    );

    serviceLogger.info('Prayer updated successfully', {
      action: 'prayer_update_success',
      metadata: {
        prayerId,
        fields: Object.keys(updates),
      },
    });

    return updatedPrayer;
  } catch (error) {
    serviceLogger.error('Failed to update prayer', error as Error, {
      action: 'prayer_update_failed',
      metadata: {
        prayerId,
        fields: Object.keys(updates),
      },
    });

    throw error;
  }
}

// Example: Batch operation with detailed logging
export async function batchDeletePrayers(prayerIds: string[]) {
  serviceLogger.info('Starting batch delete', {
    action: 'prayers_batch_delete_start',
    metadata: {
      count: prayerIds.length,
    },
  });

  const results = {
    successful: [] as string[],
    failed: [] as { id: string; error: string }[],
  };

  for (const prayerId of prayerIds) {
    try {
      await fetch(`/api/prayers/${prayerId}`, { method: 'DELETE' });
      results.successful.push(prayerId);

      serviceLogger.debug('Prayer deleted', {
        action: 'prayer_delete_success',
        metadata: { prayerId },
      });
    } catch (error) {
      results.failed.push({
        id: prayerId,
        error: error instanceof Error ? error.message : String(error),
      });

      serviceLogger.warn('Prayer deletion failed', {
        action: 'prayer_delete_failed',
        metadata: {
          prayerId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  serviceLogger.info('Batch delete completed', {
    action: 'prayers_batch_delete_complete',
    metadata: {
      total: prayerIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
    },
  });

  return results;
}
