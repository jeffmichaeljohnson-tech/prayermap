/**
 * Security Manager for PrayerMap Messaging
 * Comprehensive security, encryption, and privacy protection
 * 
 * Features:
 * - End-to-end encryption for sensitive messages
 * - Content moderation and spam detection
 * - Rate limiting and abuse prevention
 * - Privacy protection and anonymization
 * - Audit logging for security events
 * - Data sanitization and validation
 */

export interface SecurityOptions {
  enableEncryption?: boolean;
  enableContentModeration?: boolean;
  enableRateLimiting?: boolean;
  enableAuditLogging?: boolean;
  maxMessageLength?: number;
  rateLimitWindow?: number; // Time window in ms
  rateLimitMaxRequests?: number; // Max requests per window
  encryptionKeyRotationInterval?: number; // Key rotation interval in ms
}

export interface SecurityMetrics {
  encryptedMessages: number;
  moderatedMessages: number;
  rateLimitViolations: number;
  securityViolations: number;
  auditLogEntries: number;
  encryptionKeyRotations: number;
}

export interface RateLimitState {
  userId: string;
  requestCount: number;
  windowStart: number;
  isBlocked: boolean;
  blockExpiry?: number;
}

export interface ContentModerationResult {
  isAllowed: boolean;
  confidence: number; // 0-100% confidence in moderation decision
  reasons: string[];
  moderatedContent?: string; // Sanitized version if applicable
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}

export interface EncryptionKeyPair {
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  expiresAt: Date;
}

export class SecurityManager {
  private options: Required<SecurityOptions>;
  private metrics: SecurityMetrics;
  private rateLimitStates: Map<string, RateLimitState> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private encryptionKeys: EncryptionKeyPair[] = [];
  private currentKeyIndex = 0;
  private contentFilter: ContentFilter;
  private encryptionService: EncryptionService;
  private auditLogger: AuditLogger;

  constructor(options: SecurityOptions = {}) {
    this.options = {
      enableEncryption: options.enableEncryption ?? true,
      enableContentModeration: options.enableContentModeration ?? true,
      enableRateLimiting: options.enableRateLimiting ?? true,
      enableAuditLogging: options.enableAuditLogging ?? true,
      maxMessageLength: options.maxMessageLength ?? 1000,
      rateLimitWindow: options.rateLimitWindow ?? 60000, // 1 minute
      rateLimitMaxRequests: options.rateLimitMaxRequests ?? 10,
      encryptionKeyRotationInterval: options.encryptionKeyRotationInterval ?? 24 * 60 * 60 * 1000, // 24 hours
    };

    this.metrics = {
      encryptedMessages: 0,
      moderatedMessages: 0,
      rateLimitViolations: 0,
      securityViolations: 0,
      auditLogEntries: 0,
      encryptionKeyRotations: 0,
    };

    this.contentFilter = new ContentFilter();
    this.encryptionService = new EncryptionService();
    this.auditLogger = new AuditLogger();

    this.initialize();
  }

  /**
   * Initialize security systems
   */
  private async initialize(): Promise<void> {
    // Generate initial encryption keys
    if (this.options.enableEncryption) {
      await this.generateEncryptionKeys();
      this.startKeyRotation();
    }

    // Start cleanup processes
    this.startCleanupProcess();

    console.log('[SecurityManager] Initialized with security features:', {
      encryption: this.options.enableEncryption,
      contentModeration: this.options.enableContentModeration,
      rateLimiting: this.options.enableRateLimiting,
      auditLogging: this.options.enableAuditLogging,
    });
  }

  /**
   * Validate and secure a message before sending
   */
  public async secureMessage(
    content: string,
    userId: string,
    conversationId: string,
    metadata: Record<string, any> = {}
  ): Promise<{
    isAllowed: boolean;
    securedContent?: string;
    encryptedContent?: string;
    violations: string[];
  }> {
    const violations: string[] = [];
    
    try {
      // 1. Rate limiting check
      if (this.options.enableRateLimiting) {
        const rateLimitResult = this.checkRateLimit(userId);
        if (!rateLimitResult.allowed) {
          violations.push('rate_limit_exceeded');
          await this.logSecurityEvent(userId, 'rate_limit_violation', { conversationId });
          return { isAllowed: false, violations };
        }
      }

      // 2. Content validation
      const validationResult = this.validateContent(content);
      if (!validationResult.isValid) {
        violations.push(...validationResult.violations);
      }

      // 3. Content moderation
      let moderatedContent = content;
      if (this.options.enableContentModeration) {
        const moderationResult = await this.moderateContent(content, userId);
        if (!moderationResult.isAllowed) {
          violations.push(...moderationResult.reasons);
          await this.logSecurityEvent(userId, 'content_moderation_violation', {
            conversationId,
            originalContent: content,
            reasons: moderationResult.reasons,
          });
          return { isAllowed: false, violations };
        }
        moderatedContent = moderationResult.moderatedContent || content;
        this.metrics.moderatedMessages++;
      }

      // 4. Content sanitization
      const sanitizedContent = this.sanitizeContent(moderatedContent);

      // 5. Encryption (if enabled and content is sensitive)
      let encryptedContent: string | undefined;
      if (this.options.enableEncryption && this.shouldEncryptContent(sanitizedContent, metadata)) {
        encryptedContent = await this.encryptionService.encrypt(sanitizedContent, this.getCurrentKey());
        this.metrics.encryptedMessages++;
      }

      // 6. Audit logging
      if (this.options.enableAuditLogging) {
        await this.logSecurityEvent(userId, 'message_secured', {
          conversationId,
          contentLength: content.length,
          encrypted: !!encryptedContent,
          moderated: moderatedContent !== content,
        });
      }

      return {
        isAllowed: true,
        securedContent: sanitizedContent,
        encryptedContent,
        violations,
      };

    } catch (error) {
      console.error('[SecurityManager] Error securing message:', error);
      await this.logSecurityEvent(userId, 'security_error', {
        conversationId,
        error: error.message,
      }, 'error');

      return { isAllowed: false, violations: ['security_processing_error'] };
    }
  }

  /**
   * Decrypt and validate received message
   */
  public async validateReceivedMessage(
    content: string,
    userId: string,
    conversationId: string,
    isEncrypted = false
  ): Promise<{
    isValid: boolean;
    decryptedContent?: string;
    violations: string[];
  }> {
    const violations: string[] = [];

    try {
      let processedContent = content;

      // 1. Decrypt if encrypted
      if (isEncrypted && this.options.enableEncryption) {
        try {
          processedContent = await this.encryptionService.decrypt(content, this.getCurrentKey());
        } catch (error) {
          violations.push('decryption_failed');
          await this.logSecurityEvent(userId, 'decryption_failure', {
            conversationId,
            error: error.message,
          }, 'warning');
          return { isValid: false, violations };
        }
      }

      // 2. Validate received content
      const validationResult = this.validateContent(processedContent);
      if (!validationResult.isValid) {
        violations.push(...validationResult.violations);
      }

      // 3. Security scan for malicious content
      const securityScanResult = this.scanForMaliciousContent(processedContent);
      if (!securityScanResult.isSafe) {
        violations.push(...securityScanResult.threats);
        await this.logSecurityEvent(userId, 'malicious_content_detected', {
          conversationId,
          threats: securityScanResult.threats,
        }, 'critical');
        return { isValid: false, violations };
      }

      // 4. Audit successful validation
      if (this.options.enableAuditLogging) {
        await this.logSecurityEvent(userId, 'message_validated', {
          conversationId,
          encrypted: isEncrypted,
        });
      }

      return {
        isValid: violations.length === 0,
        decryptedContent: processedContent,
        violations,
      };

    } catch (error) {
      console.error('[SecurityManager] Error validating received message:', error);
      await this.logSecurityEvent(userId, 'validation_error', {
        conversationId,
        error: error.message,
      }, 'error');

      return { isValid: false, violations: ['validation_processing_error'] };
    }
  }

  /**
   * Anonymize sensitive user data
   */
  public anonymizeUserData(data: Record<string, any>): Record<string, any> {
    const anonymized = { ...data };
    
    // Remove or hash sensitive fields
    const sensitiveFields = ['email', 'phone', 'realName', 'address', 'personalInfo'];
    
    sensitiveFields.forEach(field => {
      if (anonymized[field]) {
        anonymized[field] = this.hashSensitiveData(anonymized[field]);
      }
    });

    // Keep only essential display information
    return {
      id: anonymized.id,
      displayName: anonymized.displayName || 'Anonymous',
      isAnonymous: true,
      hashedIdentifier: this.hashSensitiveData(anonymized.id || ''),
    };
  }

  /**
   * Check if user is rate limited
   */
  public checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
    if (!this.options.enableRateLimiting) {
      return { allowed: true };
    }

    const now = Date.now();
    let state = this.rateLimitStates.get(userId);

    if (!state) {
      // First request
      state = {
        userId,
        requestCount: 1,
        windowStart: now,
        isBlocked: false,
      };
      this.rateLimitStates.set(userId, state);
      return { allowed: true };
    }

    // Check if current window has expired
    if (now - state.windowStart > this.options.rateLimitWindow) {
      // Reset window
      state.requestCount = 1;
      state.windowStart = now;
      state.isBlocked = false;
      delete state.blockExpiry;
      this.rateLimitStates.set(userId, state);
      return { allowed: true };
    }

    // Check if still blocked from previous violation
    if (state.isBlocked && state.blockExpiry && now < state.blockExpiry) {
      return { allowed: false, retryAfter: state.blockExpiry - now };
    }

    // Increment request count
    state.requestCount++;

    // Check rate limit
    if (state.requestCount > this.options.rateLimitMaxRequests) {
      state.isBlocked = true;
      state.blockExpiry = now + this.options.rateLimitWindow * 2; // Block for 2x window
      this.rateLimitStates.set(userId, state);
      this.metrics.rateLimitViolations++;
      
      return { allowed: false, retryAfter: state.blockExpiry - now };
    }

    this.rateLimitStates.set(userId, state);
    return { allowed: true };
  }

  /**
   * Get current security metrics
   */
  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get audit log entries
   */
  public getAuditLog(limit = 100): AuditLogEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Export security report
   */
  public generateSecurityReport(): {
    metrics: SecurityMetrics;
    rateLimitStatus: Array<{ userId: string; isBlocked: boolean; requestCount: number }>;
    recentViolations: AuditLogEntry[];
    keyStatus: { keysGenerated: number; currentKeyAge: number; nextRotation: number };
  } {
    const rateLimitStatus = Array.from(this.rateLimitStates.entries()).map(([userId, state]) => ({
      userId,
      isBlocked: state.isBlocked,
      requestCount: state.requestCount,
    }));

    const recentViolations = this.auditLog
      .filter(entry => entry.severity === 'warning' || entry.severity === 'error' || entry.severity === 'critical')
      .slice(-20);

    const currentKey = this.getCurrentKey();
    const keyStatus = {
      keysGenerated: this.encryptionKeys.length,
      currentKeyAge: currentKey ? Date.now() - currentKey.createdAt.getTime() : 0,
      nextRotation: currentKey ? currentKey.expiresAt.getTime() - Date.now() : 0,
    };

    return {
      metrics: this.getMetrics(),
      rateLimitStatus,
      recentViolations,
      keyStatus,
    };
  }

  // Private methods

  private validateContent(content: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Length validation
    if (content.length > this.options.maxMessageLength) {
      violations.push('content_too_long');
    }

    if (content.trim().length === 0) {
      violations.push('content_empty');
    }

    // Basic security checks
    if (this.containsSuspiciousPatterns(content)) {
      violations.push('suspicious_patterns');
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  private async moderateContent(content: string, userId: string): Promise<ContentModerationResult> {
    return await this.contentFilter.moderate(content, userId);
  }

  private sanitizeContent(content: string): string {
    // Remove potentially dangerous HTML/script content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[script removed]')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '[iframe removed]')
      .replace(/javascript:/gi, '[javascript removed]')
      .replace(/on\w+\s*=/gi, '[event handler removed]')
      .trim();
  }

  private shouldEncryptContent(content: string, metadata: Record<string, any>): boolean {
    // Encrypt if content contains sensitive patterns or metadata indicates privacy
    const sensitivePatterns = [
      /\b\d{4}-?\d{4}-?\d{4}-?\d{4}\b/, // Credit card numbers
      /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN patterns
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
      /\b\d{10,}\b/, // Phone numbers
    ];

    return sensitivePatterns.some(pattern => pattern.test(content)) ||
           metadata.isPrivate ||
           metadata.containsSensitiveInfo;
  }

  private containsSuspiciousPatterns(content: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /document\.cookie/i,
      /window\.location/i,
      /\bxss\b/i,
      /\bsql\s*injection\b/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  private scanForMaliciousContent(content: string): { isSafe: boolean; threats: string[] } {
    const threats: string[] = [];

    // Check for potential XSS
    if (this.containsSuspiciousPatterns(content)) {
      threats.push('potential_xss');
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+.*\s+set/i,
    ];

    if (sqlPatterns.some(pattern => pattern.test(content))) {
      threats.push('potential_sql_injection');
    }

    // Check for command injection
    const commandPatterns = [
      /;\s*(rm|del|format|shutdown)/i,
      /\|\s*(curl|wget|nc|netcat)/i,
      /&&\s*(rm|del)/i,
    ];

    if (commandPatterns.some(pattern => pattern.test(content))) {
      threats.push('potential_command_injection');
    }

    return {
      isSafe: threats.length === 0,
      threats,
    };
  }

  private hashSensitiveData(data: string): string {
    // Simple hash for demonstration - in production, use proper hashing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }

  private async generateEncryptionKeys(): Promise<void> {
    const keyPair = await this.encryptionService.generateKeyPair();
    this.encryptionKeys.push(keyPair);
    this.metrics.encryptionKeyRotations++;
    console.log('[SecurityManager] New encryption keys generated');
  }

  private getCurrentKey(): EncryptionKeyPair {
    return this.encryptionKeys[this.currentKeyIndex] || this.encryptionKeys[0];
  }

  private startKeyRotation(): void {
    setInterval(() => {
      this.rotateKeys();
    }, this.options.encryptionKeyRotationInterval);
  }

  private async rotateKeys(): Promise<void> {
    console.log('[SecurityManager] Rotating encryption keys');
    
    // Generate new keys
    await this.generateEncryptionKeys();
    
    // Update current key index
    this.currentKeyIndex = this.encryptionKeys.length - 1;
    
    // Clean up old keys (keep last 3 for decryption compatibility)
    if (this.encryptionKeys.length > 3) {
      this.encryptionKeys = this.encryptionKeys.slice(-3);
      this.currentKeyIndex = 2;
    }
  }

  private async logSecurityEvent(
    userId: string,
    action: string,
    details: Record<string, any>,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      action,
      details,
      severity,
    };

    await this.auditLogger.log(entry);
    this.auditLog.push(entry);
    this.metrics.auditLogEntries++;

    // Keep audit log size manageable
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500);
    }

    if (severity === 'error' || severity === 'critical') {
      this.metrics.securityViolations++;
    }
  }

  private startCleanupProcess(): void {
    setInterval(() => {
      this.performCleanup();
    }, 300000); // Every 5 minutes
  }

  private performCleanup(): void {
    const now = Date.now();

    // Clean up expired rate limit states
    this.rateLimitStates.forEach((state, userId) => {
      if (now - state.windowStart > this.options.rateLimitWindow * 3) {
        this.rateLimitStates.delete(userId);
      }
    });

    console.log('[SecurityManager] Cleanup completed');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.rateLimitStates.clear();
    this.auditLog = [];
    this.encryptionKeys = [];
    this.contentFilter.destroy();
    this.encryptionService.destroy();
    this.auditLogger.destroy();
  }
}

/**
 * Content Filter for message moderation
 */
class ContentFilter {
  private bannedWords: Set<string> = new Set();
  private spamPatterns: RegExp[] = [];

  constructor() {
    this.initializeFilters();
  }

  private initializeFilters(): void {
    // Initialize banned words and spam patterns
    // This would typically be loaded from a configuration file or service
    this.bannedWords = new Set([
      'spam', 'advertisement', 'promotion', // Basic spam words
      // Add more based on your content policy
    ]);

    this.spamPatterns = [
      /\b(buy now|click here|limited time|act fast)\b/i,
      /\b(free money|get rich|work from home)\b/i,
      /\b(winner|congratulations|selected|chosen)\b/i,
      /http[s]?:\/\/[^\s]{3,}/g, // Multiple URLs
    ];
  }

  async moderate(content: string, userId: string): Promise<ContentModerationResult> {
    const reasons: string[] = [];
    let confidence = 100;

    // Check for banned words
    const words = content.toLowerCase().split(/\s+/);
    const bannedWordsFound = words.filter(word => this.bannedWords.has(word));
    if (bannedWordsFound.length > 0) {
      reasons.push('banned_words');
      confidence = Math.max(confidence - 30, 0);
    }

    // Check for spam patterns
    const spamMatches = this.spamPatterns.filter(pattern => pattern.test(content));
    if (spamMatches.length > 0) {
      reasons.push('spam_patterns');
      confidence = Math.max(confidence - 25, 0);
    }

    // Check message frequency (basic spam detection)
    const messageLength = content.length;
    if (messageLength > 500 && this.containsRepetitiveContent(content)) {
      reasons.push('repetitive_content');
      confidence = Math.max(confidence - 20, 0);
    }

    // Generate moderated content if needed
    let moderatedContent: string | undefined;
    if (reasons.length > 0 && confidence > 60) {
      moderatedContent = this.sanitizeContent(content);
    }

    return {
      isAllowed: reasons.length === 0 || confidence > 70,
      confidence,
      reasons,
      moderatedContent,
    };
  }

  private containsRepetitiveContent(content: string): boolean {
    const words = content.split(/\s+/);
    const wordCount = new Map<string, number>();
    
    words.forEach(word => {
      const normalized = word.toLowerCase().replace(/[^\w]/g, '');
      if (normalized.length > 2) {
        wordCount.set(normalized, (wordCount.get(normalized) || 0) + 1);
      }
    });

    // Check if any word appears more than 30% of the time
    const totalWords = words.length;
    return Array.from(wordCount.values()).some(count => count / totalWords > 0.3);
  }

  private sanitizeContent(content: string): string {
    let sanitized = content;
    
    // Remove banned words
    this.bannedWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '[removed]');
    });

    return sanitized;
  }

  destroy(): void {
    this.bannedWords.clear();
    this.spamPatterns = [];
  }
}

/**
 * Encryption Service for message security
 */
class EncryptionService {
  async generateKeyPair(): Promise<EncryptionKeyPair> {
    // Simplified key generation - in production, use Web Crypto API
    const keyId = Date.now().toString(36);
    
    return {
      publicKey: `pub_${keyId}`,
      privateKey: `priv_${keyId}`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  async encrypt(content: string, keyPair: EncryptionKeyPair): Promise<string> {
    // Simplified encryption - in production, use proper encryption
    const encoded = btoa(content);
    return `encrypted_${keyPair.publicKey}_${encoded}`;
  }

  async decrypt(encryptedContent: string, keyPair: EncryptionKeyPair): Promise<string> {
    // Simplified decryption - in production, use proper decryption
    const parts = encryptedContent.split('_');
    if (parts.length !== 3 || parts[0] !== 'encrypted') {
      throw new Error('Invalid encrypted content format');
    }
    
    const encoded = parts[2];
    return atob(encoded);
  }

  destroy(): void {
    // Cleanup encryption resources
  }
}

/**
 * Audit Logger for security events
 */
class AuditLogger {
  async log(entry: AuditLogEntry): Promise<void> {
    // In production, this would send to a secure audit logging service
    console.log('[AuditLogger]', entry.severity.toUpperCase(), entry.action, entry.details);
  }

  destroy(): void {
    // Cleanup audit logging resources
  }
}

// Singleton instance
export const securityManager = new SecurityManager({
  enableEncryption: true,
  enableContentModeration: true,
  enableRateLimiting: true,
  enableAuditLogging: true,
  maxMessageLength: 1000,
  rateLimitWindow: 60000, // 1 minute
  rateLimitMaxRequests: 10,
  encryptionKeyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
});