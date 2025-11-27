/**
 * Adapter functions to convert between component-friendly camelCase
 * and database snake_case for backwards compatibility
 */

import type { Prayer } from '../types/prayer';

// Legacy component-friendly interface (camelCase)
export interface LegacyPrayer {
  id: string;
  title?: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  location: {
    lat: number;
    lng: number;
  };
  userName?: string;
  isAnonymous: boolean;
  createdAt: Date;
  prayedBy?: string[];
}

/**
 * Convert database Prayer (snake_case) to legacy component format (camelCase)
 */
export function toLegacyPrayer(prayer: Prayer): LegacyPrayer {
  return {
    id: prayer.id,
    title: prayer.title,
    content: prayer.content,
    contentType: prayer.content_type,
    location: prayer.location,
    userName: prayer.user_name,
    isAnonymous: prayer.is_anonymous,
    createdAt: prayer.created_at,
    prayedBy: prayer.prayedBy,
  };
}

/**
 * Convert legacy component format (camelCase) to database Prayer (snake_case)
 */
export function fromLegacyPrayer(
  legacy: Omit<LegacyPrayer, 'id' | 'createdAt' | 'prayedBy'>,
  userId: string
): Omit<Prayer, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    title: legacy.title,
    content: legacy.content,
    content_type: legacy.contentType,
    location: legacy.location,
    user_name: legacy.userName,
    is_anonymous: legacy.isAnonymous,
  };
}

/**
 * Convert array of database Prayers to legacy format
 */
export function toLegacyPrayers(prayers: Prayer[]): LegacyPrayer[] {
  return prayers.map(toLegacyPrayer);
}
