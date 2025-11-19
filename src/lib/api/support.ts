/**
 * Prayer Support API functions
 * 
 * Handles prayer support ("Prayer Sent") functionality
 * Users can support prayers by pressing the "Prayer Sent" button
 */

import { supabase } from '../supabase'
import { PrayerApiError } from './prayers'

/**
 * Support a prayer (insert into prayer_support table)
 * 
 * This function inserts a record into the prayer_support table,
 * which triggers:
 * - Increment of support_count on the prayers table (via trigger)
 * - Creation of a notification for the prayer creator (via trigger)
 * 
 * @param prayerId - The ID of the prayer to support
 * @param userId - The ID of the user supporting the prayer
 * @returns Success object with support_id, or error if already supported
 * @throws PrayerApiError if the request fails
 * 
 * @example
 * ```typescript
 * const result = await supportPrayer(123, 'user-uuid')
 * if (result.success) {
 *   console.log('Prayer supported!', result.support_id)
 * } else if (result.alreadySupported) {
 *   console.log('Already supported this prayer')
 * }
 * ```
 */
export async function supportPrayer(
  prayerId: number,
  userId: string
): Promise<{ success: true; support_id: number } | { success: false; alreadySupported: boolean; error?: string }> {
  // Validate input parameters
  if (!Number.isInteger(prayerId) || prayerId <= 0) {
    throw new PrayerApiError(
      'Invalid prayer ID. Must be a positive integer.',
      'INVALID_PRAYER_ID'
    )
  }

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new PrayerApiError(
      'Invalid user ID. Must be a non-empty string.',
      'INVALID_USER_ID'
    )
  }

  try {
    // Insert support record
    // The unique constraint (prayer_id, user_id) prevents duplicate support
    const { data, error } = await supabase
      .from('prayer_support')
      .insert({
        prayer_id: prayerId,
        user_id: userId,
      } as never)
      .select('support_id')
      .single()

    if (error) {
      // Handle duplicate support (unique constraint violation)
      if (error.code === '23505') {
        return {
          success: false,
          alreadySupported: true,
        }
      }

      // Handle foreign key constraint violations
      if (error.code === '23503') {
        throw new PrayerApiError(
          'Prayer or user not found',
          'NOT_FOUND',
          error.details || error.hint
        )
      }

      // Handle other database errors
      throw new PrayerApiError(
        error.message || 'Failed to support prayer',
        error.code || 'INSERT_ERROR',
        error.details || error.hint
      )
    }

    if (!data) {
      throw new PrayerApiError(
        'Support was created but no data was returned',
        'NO_DATA_RETURNED'
      )
    }

    return {
      success: true,
      support_id: data.support_id,
    }
  } catch (error) {
    // Re-throw PrayerApiError as-is
    if (error instanceof PrayerApiError) {
      throw error
    }

    // Wrap unexpected errors
    if (error instanceof Error) {
      throw new PrayerApiError(
        `Unexpected error: ${error.message}`,
        'UNEXPECTED_ERROR',
        error.stack
      )
    }

    // Handle non-Error objects
    throw new PrayerApiError(
      'An unknown error occurred while supporting prayer',
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * Remove support from a prayer (delete from prayer_support table)
 * 
 * This function removes a support record, which triggers:
 * - Decrement of support_count on the prayers table (via trigger)
 * 
 * @param prayerId - The ID of the prayer
 * @param userId - The ID of the user removing support
 * @returns Success boolean
 * @throws PrayerApiError if the request fails
 * 
 * @example
 * ```typescript
 * await removePrayerSupport(123, 'user-uuid')
 * ```
 */
export async function removePrayerSupport(
  prayerId: number,
  userId: string
): Promise<{ success: boolean }> {
  // Validate input parameters
  if (!Number.isInteger(prayerId) || prayerId <= 0) {
    throw new PrayerApiError(
      'Invalid prayer ID. Must be a positive integer.',
      'INVALID_PRAYER_ID'
    )
  }

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new PrayerApiError(
      'Invalid user ID. Must be a non-empty string.',
      'INVALID_USER_ID'
    )
  }

  try {
    const { error } = await supabase
      .from('prayer_support')
      .delete()
      .eq('prayer_id', prayerId)
      .eq('user_id', userId)

    if (error) {
      throw new PrayerApiError(
        error.message || 'Failed to remove prayer support',
        error.code || 'DELETE_ERROR',
        error.details || error.hint
      )
    }

    return { success: true }
  } catch (error) {
    // Re-throw PrayerApiError as-is
    if (error instanceof PrayerApiError) {
      throw error
    }

    // Wrap unexpected errors
    if (error instanceof Error) {
      throw new PrayerApiError(
        `Unexpected error: ${error.message}`,
        'UNEXPECTED_ERROR',
        error.stack
      )
    }

    // Handle non-Error objects
    throw new PrayerApiError(
      'An unknown error occurred while removing prayer support',
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * Check if a user has already supported a prayer
 * 
 * @param prayerId - The ID of the prayer
 * @param userId - The ID of the user
 * @returns True if user has supported, false otherwise
 * @throws PrayerApiError if the request fails
 * 
 * @example
 * ```typescript
 * const hasSupported = await checkPrayerSupport(123, 'user-uuid')
 * ```
 */
export async function checkPrayerSupport(
  prayerId: number,
  userId: string
): Promise<boolean> {
  // Validate input parameters
  if (!Number.isInteger(prayerId) || prayerId <= 0) {
    return false
  }

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return false
  }

  try {
    const { data, error } = await supabase
      .from('prayer_support')
      .select('support_id')
      .eq('prayer_id', prayerId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      // Log error but don't throw - return false for graceful degradation
      console.error('Error checking prayer support:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Unexpected error checking prayer support:', error)
    return false
  }
}

