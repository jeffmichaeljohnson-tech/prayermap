/**
 * Security Utilities:
 * - Input sanitization
 * - XSS prevention
 * - CSRF token handling
 * - Content Security Policy helpers
 * - Secure storage
 */

/**
 * Input sanitization - remove/escape dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Escape HTML special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Sanitize HTML - strip dangerous tags and attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let sanitized = html;

  // Remove script tags and their content BEFORE escaping
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers - handle both quoted and unquoted attributes
  sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*'[^']*'/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, ''); // unquoted attributes

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Now escape the sanitized HTML
  const div = document.createElement('div');
  div.textContent = sanitized;
  return div.innerHTML;
}

/**
 * Validators
 */
export const validators = {
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  url: (value: string): boolean => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  },

  uuid: (value: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  coordinates: (lat: number, lng: number): boolean => {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(lat) &&
      !isNaN(lng)
    );
  },

  prayerContent: (content: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Content cannot be empty');
    }

    if (content.length < 10) {
      errors.push('Content must be at least 10 characters');
    }

    if (content.length > 5000) {
      errors.push('Content cannot exceed 5000 characters');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        errors.push('Content contains potentially unsafe HTML');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  username: (value: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!value || value.trim().length === 0) {
      errors.push('Username cannot be empty');
    }

    if (value.length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (value.length > 30) {
      errors.push('Username cannot exceed 30 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      errors.push('Username can only contain letters, numbers, hyphens, and underscores');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

/**
 * Secure storage wrapper with encryption support
 */
export const secureStorage = {
  set: (key: string, value: unknown, encrypt: boolean = false): void => {
    try {
      const stringValue = JSON.stringify(value);
      const finalValue = encrypt ? btoa(stringValue) : stringValue;
      localStorage.setItem(key, finalValue);
    } catch (error) {
      console.error('Error storing value:', error);
      throw new Error('Failed to store value securely');
    }
  },

  get: <T>(key: string, decrypt: boolean = false): T | null => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;

      const stringValue = decrypt ? atob(value) : value;
      return JSON.parse(stringValue) as T;
    } catch (error) {
      console.error('Error retrieving value:', error);
      return null;
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(key);
  },

  clear: (): void => {
    localStorage.clear();
  },

  has: (key: string): boolean => {
    return localStorage.getItem(key) !== null;
  },
};

/**
 * Rate limiting for client-side operations
 */
export function createRateLimiter(config: {
  maxRequests: number;
  windowMs: number;
}): {
  canProceed: () => boolean;
  getRemainingRequests: () => number;
  getResetTime: () => number;
  reset: () => void;
} {
  const requests: number[] = [];

  const cleanOldRequests = (): void => {
    const cutoff = Date.now() - config.windowMs;
    while (requests.length > 0 && requests[0] < cutoff) {
      requests.shift();
    }
  };

  return {
    canProceed: (): boolean => {
      cleanOldRequests();
      if (requests.length < config.maxRequests) {
        requests.push(Date.now());
        return true;
      }
      return false;
    },

    getRemainingRequests: (): number => {
      cleanOldRequests();
      return Math.max(0, config.maxRequests - requests.length);
    },

    getResetTime: (): number => {
      if (requests.length === 0) return 0;
      return requests[0] + config.windowMs;
    },

    reset: (): void => {
      requests.length = 0;
    },
  };
}

/**
 * Content Security Policy nonce generator
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('JSON parse failed, using default value:', error);
    return defaultValue;
  }
}

/**
 * Sanitize user-generated content for display
 */
export function sanitizeUserContent(content: string): string {
  if (!content) return '';

  // Remove potentially dangerous content
  let sanitized = content;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: URLs (potential for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Limit allowed HTML tags
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'];
  const tagRegex = /<(\/?)([\w]+)[^>]*>/g;

  sanitized = sanitized.replace(tagRegex, (match, slash, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      return `<${slash}${tag}>`;
    }
    return '';
  });

  return sanitized;
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize: number;
    allowedTypes: string[];
  }
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > options.maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatBytes(options.maxSize)} limit`,
    };
  }

  // Check file type
  const fileType = file.type;
  const isAllowedType = options.allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      const category = type.split('/')[0];
      return fileType.startsWith(category + '/');
    }
    return fileType === type;
  });

  if (!isAllowedType) {
    return {
      valid: false,
      error: `File type ${fileType} is not allowed`,
    };
  }

  // Additional security checks
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.app', '.dmg'];
  const fileName = file.name.toLowerCase();
  const hasSuspiciousExtension = suspiciousExtensions.some((ext) =>
    fileName.endsWith(ext)
  );

  if (hasSuspiciousExtension) {
    return {
      valid: false,
      error: 'File type is not allowed for security reasons',
    };
  }

  return { valid: true };
}

/**
 * Prevent timing attacks when comparing strings
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return generateNonce();
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, expectedToken: string): boolean {
  return constantTimeCompare(token, expectedToken);
}

/**
 * Escape SQL-like patterns (for search queries)
 */
export function escapeSqlLike(value: string): string {
  return value.replace(/[%_]/g, '\\$&');
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');

  // Remove special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const extension = sanitized.split('.').pop() || '';
    const nameWithoutExt = sanitized.slice(0, -(extension.length + 1));
    sanitized =
      nameWithoutExt.slice(0, maxLength - extension.length - 1) + '.' + extension;
  }

  return sanitized;
}

/**
 * Check if content contains profanity or inappropriate content
 * (Basic implementation - consider using a dedicated service for production)
 */
export function containsInappropriateContent(content: string): boolean {
  // This is a very basic implementation
  // In production, use a dedicated content moderation service
  const inappropriatePatterns = [
    // Add patterns as needed
    // For privacy, not including actual offensive words here
  ];

  const lowerContent = content.toLowerCase();
  return inappropriatePatterns.some((pattern) => lowerContent.includes(pattern));
}

/**
 * Format bytes for human-readable file sizes
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Hash string using Web Crypto API
 */
export async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if running in secure context (HTTPS)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext;
}

/**
 * Get security headers recommendations
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.supabase.co https://*.supabase.co;",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(self), microphone=(self), geolocation=(self)',
  };
}
