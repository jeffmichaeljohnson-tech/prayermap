/**
 * Utility functions for PrayerMap
 */

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for conditionally joining classNames
 * Combines clsx and tailwind-merge for optimal className handling
 */
export function cn(...inputs: Parameters<typeof clsx>): string {
  return twMerge(clsx(...inputs));
}

/**
 * Format a date into a human-readable relative time string
 * Examples: "just now", "2m ago", "1h ago", "3d ago", "Oct 15"
 */
export function formatRelativeTime(date: Date | string): string {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const now = Date.now();
  const diffMs = now - timestamp;
  
  // If the timestamp is in the future, handle gracefully
  if (diffMs < 0) {
    return 'just now';
  }
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    // For older dates, show the actual date
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  }
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Format a user's name for display, handling anonymous users
 */
export function formatUserName(
  userName: string | null | undefined, 
  isAnonymous: boolean
): string {
  if (isAnonymous) {
    return 'Anonymous';
  }
  return userName || 'Someone';
}

/**
 * Create a formatted message for prayer responses in the inbox
 */
export function formatInboxMessage(
  responderName: string | null | undefined,
  isAnonymous: boolean,
  prayerTitle: string,
  message: string
): {
  senderDisplay: string;
  prayerContext: string;
  messagePreview: string;
  fullMessage: string;
  isTruncated: boolean;
} {
  const senderDisplay = formatUserName(responderName, isAnonymous);
  const prayerContext = `Re: ${truncateText(prayerTitle, 50)}`;
  const messagePreview = truncateText(message, 100);
  const isTruncated = message.length > 100;
  
  return {
    senderDisplay,
    prayerContext,
    messagePreview,
    fullMessage: message,
    isTruncated
  };
}

/**
 * Check if a message is considered "recent" (less than 1 hour old)
 */
export function isRecentMessage(date: Date | string): boolean {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const hourAgo = Date.now() - (1000 * 60 * 60);
  return timestamp > hourAgo;
}