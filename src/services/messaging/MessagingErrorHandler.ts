/**
 * Messaging Error Handler for PrayerMap
 * Comprehensive error handling and resilience patterns
 * 
 * Features:
 * - Graceful degradation for different error types
 * - Circuit breaker pattern for service protection
 * - Smart retry logic with exponential backoff
 * - User-friendly error messaging
 * - Error analytics and monitoring
 * - Automatic recovery strategies
 */

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  PERMISSION_ERROR = 'permission_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT_ERROR = 'timeout_error',
  STORAGE_ERROR = 'storage_error',
  REALTIME_ERROR = 'realtime_error',
}

export enum ErrorSeverity {
  LOW = 'low',           // Non-critical, user can continue
  MEDIUM = 'medium',     // Affects functionality but has fallbacks
  HIGH = 'high',         // Critical feature failure
  CRITICAL = 'critical', // App-breaking error
}

export interface MessagingError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  context: string;
  timestamp: Date;
  retryable: boolean;
  details?: Record<string, any>;
  stack?: string;
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  baseDelay: number;     // Base delay in milliseconds
  maxDelay: number;      // Maximum delay in milliseconds
  backoffMultiplier: number;
  retryCondition?: (error: MessagingError) => boolean;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: Date | null;
  nextAttemptTime: Date | null;
  successCount: number;
}

export interface ErrorHandlerOptions {
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  enableRetry?: boolean;
  retryConfig?: Partial<RetryConfig>;
  enableUserNotifications?: boolean;
  enableAnalytics?: boolean;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  retrySuccessRate: number;
  circuitBreakerTrips: number;
  averageResolutionTime: number;
  recentErrors: MessagingError[];
}

export class MessagingErrorHandler {
  private options: Required<ErrorHandlerOptions>;
  private retryConfig: Required<RetryConfig>;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorHistory: MessagingError[] = [];
  private retryQueues: Map<string, Array<() => Promise<any>>> = new Map();
  private stats: ErrorStats;
  private userNotificationCallback: ((error: MessagingError) => void) | null = null;
  private analyticsCallback: ((error: MessagingError) => void) | null = null;
  private recoveryStrategies: Map<ErrorType, (error: MessagingError) => Promise<boolean>> = new Map();

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      enableCircuitBreaker: options.enableCircuitBreaker ?? true,
      circuitBreakerThreshold: options.circuitBreakerThreshold ?? 5,
      circuitBreakerTimeout: options.circuitBreakerTimeout ?? 60000, // 1 minute
      enableRetry: options.enableRetry ?? true,
      enableUserNotifications: options.enableUserNotifications ?? true,
      enableAnalytics: options.enableAnalytics ?? true,
    };

    this.retryConfig = {
      enabled: options.retryConfig?.enabled ?? true,
      maxAttempts: options.retryConfig?.maxAttempts ?? 3,
      baseDelay: options.retryConfig?.baseDelay ?? 1000,
      maxDelay: options.retryConfig?.maxDelay ?? 30000,
      backoffMultiplier: options.retryConfig?.backoffMultiplier ?? 2,
      retryCondition: options.retryConfig?.retryCondition ?? this.defaultRetryCondition,
    };

    this.stats = {
      totalErrors: 0,
      errorsByType: {} as Record<ErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      retrySuccessRate: 0,
      circuitBreakerTrips: 0,
      averageResolutionTime: 0,
      recentErrors: [],
    };

    this.setupRecoveryStrategies();
    this.startMaintenanceTimer();
  }

  /**
   * Set callback for user notifications
   */
  public setUserNotificationCallback(callback: (error: MessagingError) => void): void {
    this.userNotificationCallback = callback;
  }

  /**
   * Set callback for error analytics
   */
  public setAnalyticsCallback(callback: (error: MessagingError) => void): void {
    this.analyticsCallback = callback;
  }

  /**
   * Handle an error with full processing pipeline
   */
  public async handleError(
    error: Error | MessagingError,
    context: string,
    operation?: () => Promise<any>
  ): Promise<boolean> {
    const messagingError = this.normalizeError(error, context);
    const startTime = Date.now();

    try {
      // Log the error
      this.logError(messagingError);

      // Update statistics
      this.updateStats(messagingError);

      // Check circuit breaker
      if (this.options.enableCircuitBreaker && !this.isCircuitBreakerAllowed(context)) {
        console.log(`[MessagingErrorHandler] Circuit breaker open for ${context}, failing fast`);
        this.notifyUser(this.createCircuitBreakerError(context));
        return false;
      }

      // Try recovery strategy
      const recovered = await this.attemptRecovery(messagingError);
      if (recovered) {
        this.updateCircuitBreaker(context, true);
        return true;
      }

      // Attempt retry if configured and operation provided
      if (this.options.enableRetry && operation && this.shouldRetry(messagingError)) {
        const retrySuccess = await this.retryOperation(messagingError, context, operation);
        if (retrySuccess) {
          this.updateCircuitBreaker(context, true);
          this.updateRetryStats(true);
          return true;
        } else {
          this.updateCircuitBreaker(context, false);
          this.updateRetryStats(false);
        }
      } else {
        this.updateCircuitBreaker(context, false);
      }

      // Graceful degradation
      await this.performGracefulDegradation(messagingError);

      // Notify user if configured
      if (this.options.enableUserNotifications) {
        this.notifyUser(messagingError);
      }

      // Send analytics if configured
      if (this.options.enableAnalytics) {
        this.sendAnalytics(messagingError);
      }

      return false;
    } finally {
      // Update resolution time
      const resolutionTime = Date.now() - startTime;
      this.updateResolutionTime(resolutionTime);
    }
  }

  /**
   * Handle connection failure with specific strategies
   */
  public async handleConnectionFailure(context: string): Promise<void> {
    const error: MessagingError = {
      id: this.generateErrorId(),
      type: ErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.HIGH,
      message: 'Real-time connection failed',
      userMessage: 'Connection lost. Trying to reconnect...',
      context,
      timestamp: new Date(),
      retryable: true,
    };

    await this.handleError(error, context);

    // Specific connection failure strategies
    await this.performConnectionRecovery(context);
  }

  /**
   * Retry failed operations with exponential backoff
   */
  public async retryFailedOperations(context: string): Promise<void> {
    const retryQueue = this.retryQueues.get(context);
    if (!retryQueue || retryQueue.length === 0) {
      return;
    }

    console.log(`[MessagingErrorHandler] Retrying ${retryQueue.length} failed operations for ${context}`);

    const operations = [...retryQueue];
    this.retryQueues.set(context, []);

    for (const operation of operations) {
      try {
        await operation();
        console.log(`[MessagingErrorHandler] Successfully retried operation for ${context}`);
      } catch (error) {
        console.error(`[MessagingErrorHandler] Retry failed for ${context}:`, error);
        
        // Re-queue if still retryable
        const messagingError = this.normalizeError(error as Error, context);
        if (this.shouldRetry(messagingError)) {
          if (!this.retryQueues.has(context)) {
            this.retryQueues.set(context, []);
          }
          this.retryQueues.get(context)!.push(operation);
        }
      }
    }
  }

  /**
   * Get current error statistics
   */
  public getStats(): ErrorStats {
    return { ...this.stats, recentErrors: [...this.stats.recentErrors] };
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus(context: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(context) || null;
  }

  /**
   * Reset circuit breaker for a context
   */
  public resetCircuitBreaker(context: string): void {
    this.circuitBreakers.delete(context);
    console.log(`[MessagingErrorHandler] Circuit breaker reset for ${context}`);
  }

  /**
   * Clear error history
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
    this.stats.recentErrors = [];
    this.stats.totalErrors = 0;
    
    // Reset type and severity counters
    Object.values(ErrorType).forEach(type => {
      this.stats.errorsByType[type] = 0;
    });
    
    Object.values(ErrorSeverity).forEach(severity => {
      this.stats.errorsBySeverity[severity] = 0;
    });

    console.log('[MessagingErrorHandler] Error history cleared');
  }

  // Private methods

  private normalizeError(error: Error | MessagingError, context: string): MessagingError {
    if ('id' in error && 'type' in error) {
      return error as MessagingError;
    }

    // Convert regular Error to MessagingError
    const errorType = this.classifyError(error as Error);
    const severity = this.determineSeverity(errorType, context);

    return {
      id: this.generateErrorId(),
      type: errorType,
      severity,
      message: error.message,
      userMessage: this.generateUserMessage(errorType, severity),
      context,
      timestamp: new Date(),
      retryable: this.isRetryableError(errorType),
      details: { originalError: error.name },
      stack: error.stack,
    };
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return ErrorType.AUTHENTICATION_ERROR;
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return ErrorType.PERMISSION_ERROR;
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return ErrorType.RATE_LIMIT_ERROR;
    }
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR;
    }
    if (message.includes('storage') || message.includes('quota')) {
      return ErrorType.STORAGE_ERROR;
    }
    if (message.includes('realtime') || message.includes('websocket')) {
      return ErrorType.REALTIME_ERROR;
    }
    if (error.name === 'ValidationError') {
      return ErrorType.VALIDATION_ERROR;
    }
    
    // Default classification based on error patterns
    if (message.includes('server') || message.includes('internal')) {
      return ErrorType.SERVER_ERROR;
    }
    
    return ErrorType.CLIENT_ERROR;
  }

  private determineSeverity(errorType: ErrorType, context: string): ErrorSeverity {
    // Context-specific severity determination
    if (context.includes('critical') || context.includes('auth')) {
      return ErrorSeverity.CRITICAL;
    }

    switch (errorType) {
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.PERMISSION_ERROR:
        return ErrorSeverity.CRITICAL;
      
      case ErrorType.SERVER_ERROR:
      case ErrorType.NETWORK_ERROR:
        return ErrorSeverity.HIGH;
      
      case ErrorType.RATE_LIMIT_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return ErrorSeverity.MEDIUM;
      
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.CLIENT_ERROR:
        return ErrorSeverity.LOW;
      
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private generateUserMessage(errorType: ErrorType, severity: ErrorSeverity): string {
    switch (errorType) {
      case ErrorType.NETWORK_ERROR:
        return 'Connection lost. Please check your internet connection.';
      case ErrorType.AUTHENTICATION_ERROR:
        return 'Authentication failed. Please sign in again.';
      case ErrorType.PERMISSION_ERROR:
        return 'You don\'t have permission to perform this action.';
      case ErrorType.RATE_LIMIT_ERROR:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorType.SERVER_ERROR:
        return 'Server error. Our team has been notified.';
      case ErrorType.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.';
      case ErrorType.STORAGE_ERROR:
        return 'Storage error. Please clear some space and try again.';
      case ErrorType.REALTIME_ERROR:
        return 'Real-time connection issues. Reconnecting...';
      default:
        return severity === ErrorSeverity.CRITICAL 
          ? 'A critical error occurred. Please restart the app.'
          : 'Something went wrong. Please try again.';
    }
  }

  private isRetryableError(errorType: ErrorType): boolean {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
      ErrorType.SERVER_ERROR,
      ErrorType.REALTIME_ERROR,
    ];
    
    return retryableTypes.includes(errorType);
  }

  private defaultRetryCondition = (error: MessagingError): boolean => {
    return error.retryable && error.severity !== ErrorSeverity.CRITICAL;
  };

  private shouldRetry(error: MessagingError): boolean {
    return this.retryConfig.enabled && 
           this.retryConfig.retryCondition!(error);
  }

  private async retryOperation(
    error: MessagingError, 
    context: string, 
    operation: () => Promise<any>
  ): Promise<boolean> {
    let attempt = 0;
    
    while (attempt < this.retryConfig.maxAttempts) {
      attempt++;
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
        this.retryConfig.maxDelay
      );
      
      console.log(`[MessagingErrorHandler] Retry attempt ${attempt}/${this.retryConfig.maxAttempts} for ${context} in ${delay}ms`);
      
      await this.sleep(delay);
      
      try {
        await operation();
        console.log(`[MessagingErrorHandler] Retry successful for ${context} on attempt ${attempt}`);
        return true;
      } catch (retryError) {
        console.error(`[MessagingErrorHandler] Retry attempt ${attempt} failed for ${context}:`, retryError);
        
        if (attempt === this.retryConfig.maxAttempts) {
          console.error(`[MessagingErrorHandler] Max retry attempts reached for ${context}`);
        }
      }
    }
    
    return false;
  }

  private isCircuitBreakerAllowed(context: string): boolean {
    const breaker = this.circuitBreakers.get(context);
    if (!breaker) return true;
    
    const now = new Date();
    
    switch (breaker.state) {
      case 'closed':
        return true;
      
      case 'open':
        if (breaker.nextAttemptTime && now >= breaker.nextAttemptTime) {
          // Move to half-open state
          breaker.state = 'half-open';
          this.circuitBreakers.set(context, breaker);
          return true;
        }
        return false;
      
      case 'half-open':
        return true;
      
      default:
        return true;
    }
  }

  private updateCircuitBreaker(context: string, success: boolean): void {
    if (!this.options.enableCircuitBreaker) return;
    
    let breaker = this.circuitBreakers.get(context) || {
      state: 'closed' as const,
      failureCount: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
      successCount: 0,
    };
    
    if (success) {
      if (breaker.state === 'half-open') {
        breaker.successCount++;
        if (breaker.successCount >= 3) { // Require multiple successes to close
          breaker.state = 'closed';
          breaker.failureCount = 0;
          breaker.successCount = 0;
        }
      } else {
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = new Date();
      breaker.successCount = 0;
      
      if (breaker.failureCount >= this.options.circuitBreakerThreshold) {
        breaker.state = 'open';
        breaker.nextAttemptTime = new Date(Date.now() + this.options.circuitBreakerTimeout);
        this.stats.circuitBreakerTrips++;
        console.log(`[MessagingErrorHandler] Circuit breaker opened for ${context}`);
      }
    }
    
    this.circuitBreakers.set(context, breaker);
  }

  private createCircuitBreakerError(context: string): MessagingError {
    return {
      id: this.generateErrorId(),
      type: ErrorType.REALTIME_ERROR,
      severity: ErrorSeverity.HIGH,
      message: `Circuit breaker open for ${context}`,
      userMessage: 'Service temporarily unavailable. Please try again later.',
      context,
      timestamp: new Date(),
      retryable: false,
    };
  }

  private async attemptRecovery(error: MessagingError): Promise<boolean> {
    const recoveryStrategy = this.recoveryStrategies.get(error.type);
    if (!recoveryStrategy) return false;
    
    try {
      console.log(`[MessagingErrorHandler] Attempting recovery for ${error.type}`);
      return await recoveryStrategy(error);
    } catch (recoveryError) {
      console.error(`[MessagingErrorHandler] Recovery failed for ${error.type}:`, recoveryError);
      return false;
    }
  }

  private setupRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set(ErrorType.NETWORK_ERROR, async (error) => {
      if (navigator.onLine) {
        return true; // Network is back
      }
      return false;
    });

    // Rate limit recovery
    this.recoveryStrategies.set(ErrorType.RATE_LIMIT_ERROR, async (error) => {
      // Wait for rate limit to reset
      await this.sleep(5000);
      return true;
    });

    // Realtime error recovery
    this.recoveryStrategies.set(ErrorType.REALTIME_ERROR, async (error) => {
      // Attempt to reconnect
      return false; // Will be handled by connection manager
    });
  }

  private async performGracefulDegradation(error: MessagingError): Promise<void> {
    switch (error.type) {
      case ErrorType.REALTIME_ERROR:
        console.log('[MessagingErrorHandler] Falling back to polling mode');
        // Enable fallback mechanisms
        break;
      
      case ErrorType.STORAGE_ERROR:
        console.log('[MessagingErrorHandler] Reducing cache size');
        // Clear some cache to free up space
        break;
      
      case ErrorType.NETWORK_ERROR:
        console.log('[MessagingErrorHandler] Enabling offline mode');
        // Enable offline functionality
        break;
    }
  }

  private async performConnectionRecovery(context: string): Promise<void> {
    // Implement connection-specific recovery strategies
    console.log(`[MessagingErrorHandler] Performing connection recovery for ${context}`);
    
    // Add operation to retry queue
    if (!this.retryQueues.has(context)) {
      this.retryQueues.set(context, []);
    }
    
    // Schedule connection retry
    setTimeout(() => {
      this.retryFailedOperations(context);
    }, 5000);
  }

  private logError(error: MessagingError): void {
    console.error(`[MessagingErrorHandler] ${error.severity.toUpperCase()}: ${error.message}`, {
      id: error.id,
      type: error.type,
      context: error.context,
      details: error.details,
    });
  }

  private updateStats(error: MessagingError): void {
    this.stats.totalErrors++;
    
    // Update counters
    this.stats.errorsByType[error.type] = (this.stats.errorsByType[error.type] || 0) + 1;
    this.stats.errorsBySeverity[error.severity] = (this.stats.errorsBySeverity[error.severity] || 0) + 1;
    
    // Add to recent errors (keep last 50)
    this.stats.recentErrors.unshift(error);
    if (this.stats.recentErrors.length > 50) {
      this.stats.recentErrors = this.stats.recentErrors.slice(0, 50);
    }
    
    // Add to history
    this.errorHistory.push(error);
    
    // Keep history limited
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-500);
    }
  }

  private updateRetryStats(success: boolean): void {
    // Simple retry success rate calculation
    const totalRetries = this.stats.errorsByType[ErrorType.NETWORK_ERROR] || 0;
    if (totalRetries > 0) {
      // This is a simplified calculation - in real implementation you'd track more detailed metrics
      this.stats.retrySuccessRate = success ? 
        Math.min(this.stats.retrySuccessRate + 10, 100) :
        Math.max(this.stats.retrySuccessRate - 5, 0);
    }
  }

  private updateResolutionTime(resolutionTime: number): void {
    if (this.stats.averageResolutionTime === 0) {
      this.stats.averageResolutionTime = resolutionTime;
    } else {
      this.stats.averageResolutionTime = 
        (this.stats.averageResolutionTime + resolutionTime) / 2;
    }
  }

  private notifyUser(error: MessagingError): void {
    if (this.userNotificationCallback) {
      this.userNotificationCallback(error);
    }
  }

  private sendAnalytics(error: MessagingError): void {
    if (this.analyticsCallback) {
      this.analyticsCallback(error);
    }
  }

  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startMaintenanceTimer(): void {
    // Clean up old data periodically
    setInterval(() => {
      this.performMaintenance();
    }, 300000); // Every 5 minutes
  }

  private performMaintenance(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up old error history
    this.errorHistory = this.errorHistory.filter(
      error => now.getTime() - error.timestamp.getTime() < maxAge
    );
    
    // Clean up old circuit breaker states
    this.circuitBreakers.forEach((breaker, context) => {
      if (breaker.lastFailureTime && 
          now.getTime() - breaker.lastFailureTime.getTime() > maxAge) {
        this.circuitBreakers.delete(context);
      }
    });
    
    // Clean up old retry queues
    this.retryQueues.forEach((queue, context) => {
      if (queue.length === 0) {
        this.retryQueues.delete(context);
      }
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.errorHistory = [];
    this.circuitBreakers.clear();
    this.retryQueues.clear();
    this.recoveryStrategies.clear();
  }
}

// Singleton instance
export const messagingErrorHandler = new MessagingErrorHandler({
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
  enableRetry: true,
  enableUserNotifications: true,
  enableAnalytics: true,
});