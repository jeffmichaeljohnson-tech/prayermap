/**
 * Security Tests
 * Test XSS prevention, input sanitization, validation, rate limiting, and secure storage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizeInput,
  sanitizeHtml,
  validators,
  secureStorage,
  createRateLimiter,
  generateNonce,
  safeJsonParse,
  sanitizeUserContent,
  validateFileUpload,
  sanitizeFileName,
  hashString,
} from '../security';

describe('Security - Input Sanitization', () => {
  describe('sanitizeInput', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const result = sanitizeInput(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should handle null bytes', () => {
      const input = 'test\0null';
      const result = sanitizeInput(input);
      expect(result).not.toContain('\0');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const result = sanitizeInput(input);
      expect(result).toBe('Tom &amp; Jerry');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as unknown as string)).toBe('');
      expect(sanitizeInput(undefined as unknown as string)).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as unknown as string)).toBe('');
    });
  });

  describe('sanitizeUserContent', () => {
    it('should remove dangerous tags', () => {
      const input = '<p>Safe</p><script>dangerous()</script><iframe src="bad"></iframe>';
      const result = sanitizeUserContent(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('<iframe');
    });

    it('should allow safe tags', () => {
      const input = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
      const result = sanitizeUserContent(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const result = sanitizeFileName(input);
      expect(result).not.toContain('..');
    });

    it('should replace special characters', () => {
      const input = 'file name with spaces!@#.txt';
      const result = sanitizeFileName(input);
      expect(result).toMatch(/^[a-zA-Z0-9._-]+$/);
    });

    it('should limit length', () => {
      const input = 'a'.repeat(300) + '.txt';
      const result = sanitizeFileName(input);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toContain('.txt');
    });
  });
});

describe('Security - Validators', () => {
  describe('validators.email', () => {
    it('should validate correct email addresses', () => {
      expect(validators.email('test@example.com')).toBe(true);
      expect(validators.email('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validators.email('invalid')).toBe(false);
      expect(validators.email('missing@domain')).toBe(false);
      expect(validators.email('@example.com')).toBe(false);
      expect(validators.email('user@')).toBe(false);
    });
  });

  describe('validators.url', () => {
    it('should validate correct URLs', () => {
      expect(validators.url('https://example.com')).toBe(true);
      expect(validators.url('http://localhost:3000')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validators.url('not a url')).toBe(false);
      expect(validators.url('ftp://example.com')).toBe(false);
      expect(validators.url('javascript:alert(1)')).toBe(false);
    });
  });

  describe('validators.uuid', () => {
    it('should validate correct UUIDs', () => {
      expect(validators.uuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(validators.uuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(validators.uuid('not-a-uuid')).toBe(false);
      expect(validators.uuid('123456789')).toBe(false);
    });
  });

  describe('validators.coordinates', () => {
    it('should validate correct coordinates', () => {
      expect(validators.coordinates(0, 0)).toBe(true);
      expect(validators.coordinates(45.5, -122.6)).toBe(true);
      expect(validators.coordinates(-90, 180)).toBe(true);
      expect(validators.coordinates(90, -180)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(validators.coordinates(91, 0)).toBe(false);
      expect(validators.coordinates(-91, 0)).toBe(false);
      expect(validators.coordinates(0, 181)).toBe(false);
      expect(validators.coordinates(0, -181)).toBe(false);
      expect(validators.coordinates(NaN, 0)).toBe(false);
    });
  });

  describe('validators.prayerContent', () => {
    it('should validate correct prayer content', () => {
      const result = validators.prayerContent('This is a valid prayer request that is long enough');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty content', () => {
      const result = validators.prayerContent('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content cannot be empty');
    });

    it('should reject content that is too short', () => {
      const result = validators.prayerContent('short');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content must be at least 10 characters');
    });

    it('should reject content that is too long', () => {
      const result = validators.prayerContent('a'.repeat(6000));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content cannot exceed 5000 characters');
    });

    it('should reject content with suspicious patterns', () => {
      const result = validators.prayerContent('<script>alert("XSS")</script> prayer request');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unsafe HTML'))).toBe(true);
    });
  });

  describe('validators.username', () => {
    it('should validate correct usernames', () => {
      const result = validators.username('valid_user-123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject username that is too short', () => {
      const result = validators.username('ab');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Username must be at least 3 characters');
    });

    it('should reject username with invalid characters', () => {
      const result = validators.username('user@name');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('letters, numbers, hyphens'))).toBe(true);
    });
  });
});

describe('Security - Secure Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve values', () => {
    const testData = { name: 'Test', value: 123 };
    secureStorage.set('test-key', testData);
    const retrieved = secureStorage.get('test-key');
    expect(retrieved).toEqual(testData);
  });

  it('should store encrypted values', () => {
    const testData = { secret: 'sensitive' };
    secureStorage.set('encrypted-key', testData, true);

    // Check that the stored value is encoded
    const rawStored = localStorage.getItem('encrypted-key');
    expect(rawStored).not.toContain('sensitive');
  });

  it('should retrieve encrypted values', () => {
    const testData = { secret: 'sensitive' };
    secureStorage.set('encrypted-key', testData, true);
    const retrieved = secureStorage.get('encrypted-key', true);
    expect(retrieved).toEqual(testData);
  });

  it('should remove values', () => {
    secureStorage.set('test-key', 'value');
    expect(secureStorage.has('test-key')).toBe(true);
    secureStorage.remove('test-key');
    expect(secureStorage.has('test-key')).toBe(false);
  });

  it('should clear all values', () => {
    secureStorage.set('key1', 'value1');
    secureStorage.set('key2', 'value2');
    secureStorage.clear();
    expect(secureStorage.get('key1')).toBeNull();
    expect(secureStorage.get('key2')).toBeNull();
  });

  it('should return null for non-existent keys', () => {
    expect(secureStorage.get('non-existent')).toBeNull();
  });
});

describe('Security - Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 });

    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(true);
  });

  it('should block requests over limit', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });

    limiter.canProceed();
    limiter.canProceed();
    expect(limiter.canProceed()).toBe(false);
  });

  it('should reset after window expires', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });

    limiter.canProceed();
    limiter.canProceed();
    expect(limiter.canProceed()).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(limiter.canProceed()).toBe(true);
  });

  it('should track remaining requests', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 });

    expect(limiter.getRemainingRequests()).toBe(3);
    limiter.canProceed();
    expect(limiter.getRemainingRequests()).toBe(2);
    limiter.canProceed();
    expect(limiter.getRemainingRequests()).toBe(1);
  });
});

describe('Security - Utility Functions', () => {
  describe('generateNonce', () => {
    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      expect(nonce1).toBeTruthy();
      expect(nonce2).toBeTruthy();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBeGreaterThan(0);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"key": "value"}', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('should return default on invalid JSON', () => {
      const defaultValue = { default: true };
      const result = safeJsonParse('invalid json', defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('should handle complex objects', () => {
      const obj = { name: 'Test', nested: { value: 123 } };
      const json = JSON.stringify(obj);
      const result = safeJsonParse(json, {});
      expect(result).toEqual(obj);
    });
  });

  describe('validateFileUpload', () => {
    it('should accept valid files', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFileUpload(file, {
        maxSize: 1024 * 1024, // 1MB
        allowedTypes: ['image/jpeg', 'image/png'],
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files that are too large', () => {
      const largeContent = new Array(2 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = validateFileUpload(file, {
        maxSize: 1024 * 1024, // 1MB
        allowedTypes: ['image/jpeg'],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('size exceeds');
    });

    it('should reject files with wrong type', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFileUpload(file, {
        maxSize: 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject files with suspicious extensions', () => {
      const file = new File(['content'], 'virus.exe', { type: 'application/octet-stream' });
      const result = validateFileUpload(file, {
        maxSize: 1024 * 1024,
        allowedTypes: ['application/octet-stream'],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('security');
    });

    it('should support wildcard MIME types', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFileUpload(file, {
        maxSize: 1024 * 1024,
        allowedTypes: ['image/*'],
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('hashString', () => {
    it('should hash strings consistently', async () => {
      const input = 'test string';
      const hash1 = await hashString(input);
      const hash2 = await hashString(input);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await hashString('input1');
      const hash2 = await hashString('input2');

      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('Security - XSS Prevention', () => {
  const xssVectors = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')">',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<select onfocus=alert("XSS") autofocus>',
    '<textarea onfocus=alert("XSS") autofocus>',
    '<object data="data:text/html,<script>alert(\'XSS\')</script>">',
  ];

  xssVectors.forEach((vector, index) => {
    it(`should prevent XSS vector ${index + 1}: ${vector.substring(0, 50)}`, () => {
      const sanitized = sanitizeHtml(vector);

      // Should not contain script execution patterns
      expect(sanitized.toLowerCase()).not.toContain('<script');
      expect(sanitized.toLowerCase()).not.toContain('javascript:');
      expect(sanitized.toLowerCase()).not.toMatch(/on\w+=/);
    });
  });
});
