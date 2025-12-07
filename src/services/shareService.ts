import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

interface SharePrayerData {
  title: string;
  content: string;
  prayerId: string;
  isAnonymous: boolean;
  userName?: string;
}

/**
 * Share a prayer request via native share sheet or web share API.
 * Falls back to clipboard copy if neither is available.
 * 
 * @returns 'shared' | 'copied' | 'cancelled' | 'error'
 */
export async function sharePrayer(prayer: SharePrayerData): Promise<'shared' | 'copied' | 'cancelled' | 'error'> {
  const shareText = buildShareText(prayer);
  const shareUrl = `https://prayermap.net/prayer/${prayer.prayerId}`;

  try {
    if (Capacitor.isNativePlatform()) {
      // Native share via Capacitor
      await Share.share({
        title: 'Prayer Request',
        text: shareText,
        url: shareUrl,
        dialogTitle: 'Share this prayer request',
      });
      return 'shared';
    } else if (navigator.share) {
      // Web Share API (Chrome, Safari, Edge on HTTPS)
      await navigator.share({
        title: 'Prayer Request',
        text: shareText,
        url: shareUrl,
      });
      return 'shared';
    } else if (navigator.clipboard) {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      return 'copied';
    } else {
      // No sharing capability available
      console.warn('No share capability available on this device');
      return 'error';
    }
  } catch (error) {
    // Check if user cancelled the share
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('cancel')) {
        return 'cancelled';
      }
    }
    console.error('Share failed:', error);
    return 'error';
  }
}

/**
 * Build the share text for a prayer request.
 * Keeps user privacy in mind - no location data.
 */
function buildShareText(prayer: SharePrayerData): string {
  const requester = prayer.isAnonymous ? 'Someone' : (prayer.userName || 'Someone');
  const title = prayer.title || 'a prayer request';

  return `🙏 ${requester} needs prayer for ${title}

"${truncate(prayer.content, 150)}"

Will you join me in praying for them?`;
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Check if sharing is available on this device.
 */
export function canShare(): boolean {
  return Capacitor.isNativePlatform() || !!navigator.share || !!navigator.clipboard;
}

