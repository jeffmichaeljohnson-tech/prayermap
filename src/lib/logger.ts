/**
 * Structured Logger with Context
 *
 * Features:
 * - JSON structured logs
 * - Correlation IDs for request tracing
 * - Log levels: DEBUG, INFO, WARN, ERROR, FATAL
 * - Context enrichment (user, session, action)
 * - Performance timing
 * - Environment-aware (dev vs prod)
 * - Configurable transports (console, remote)
 */

import { useMemo, useEffect } from 'react';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  action?: string;
  component?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: unknown;
  };
  environment: string;
  version: string;
}

export interface LoggerConfig {
  level: LogLevel;
  transports: LogTransport[];
  defaultContext?: Partial<LogContext>;
}

// Transports
export interface LogTransport {
  log(entry: LogEntry): void;
}

export class ConsoleTransport implements LogTransport {
  private isDev: boolean;

  constructor(isDev = import.meta.env.DEV) {
    this.isDev = isDev;
  }

  log(entry: LogEntry): void {
    if (this.isDev) {
      // Pretty print in dev
      this.prettyPrint(entry);
    } else {
      // JSON in production
      console.log(JSON.stringify(entry));
    }
  }

  private prettyPrint(entry: LogEntry): void {
    const colors = {
      [LogLevel.DEBUG]: 'color: #6B7280',
      [LogLevel.INFO]: 'color: #3B82F6',
      [LogLevel.WARN]: 'color: #F59E0B',
      [LogLevel.ERROR]: 'color: #EF4444',
      [LogLevel.FATAL]: 'color: #DC2626; font-weight: bold',
    };

    const style = colors[entry.level];
    const time = new Date(entry.timestamp).toLocaleTimeString();

    console.log(
      `%c[${time}] ${entry.levelName}`,
      style,
      entry.message,
      entry.context.component ? `[${entry.context.component}]` : '',
      entry.context,
      entry.error || ''
    );
  }
}

export class RemoteTransport implements LogTransport {
  private endpoint: string | null;
  private buffer: LogEntry[] = [];
  private maxBufferSize = 100;
  private flushInterval = 10000; // 10 seconds
  private timer: NodeJS.Timeout | null = null;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || null;

    if (this.endpoint) {
      this.startFlushTimer();
    }
  }

  log(entry: LogEntry): void {
    // Only log WARN and above to remote
    if (entry.level < LogLevel.WARN) {
      return;
    }

    this.buffer.push(entry);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (!this.endpoint || this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: entries }),
      });
    } catch (error) {
      // Silent fail - don't want logging to break the app
      console.error('Failed to send logs to remote:', error);
      // Put entries back in buffer (truncated to max size)
      this.buffer = [...entries, ...this.buffer].slice(0, this.maxBufferSize);
    }
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}

export class LocalStorageTransport implements LogTransport {
  private readonly storageKey = 'prayermap_logs';
  private readonly maxLogs = 1000;

  log(entry: LogEntry): void {
    try {
      const logs = this.getLogs();
      logs.push(entry);

      // Circular buffer - keep last N logs
      const trimmedLogs = logs.slice(-this.maxLogs);

      localStorage.setItem(this.storageKey, JSON.stringify(trimmedLogs));
    } catch (error) {
      // Storage might be full or unavailable
      console.error('Failed to store log:', error);
    }
  }

  getLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  clearLogs(): void {
    localStorage.removeItem(this.storageKey);
  }

  exportLogs(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }
}

export class Logger {
  private level: LogLevel;
  private defaultContext: Partial<LogContext>;
  private transports: LogTransport[];
  private correlationId: string;
  private timers: Map<string, number> = new Map();

  constructor(config: LoggerConfig) {
    this.level = config.level;
    this.defaultContext = config.defaultContext || {};
    this.transports = config.transports;
    this.correlationId = this.generateCorrelationId();
  }

  // Create child logger with additional context
  child(context: Partial<LogContext>): Logger {
    return new Logger({
      level: this.level,
      transports: this.transports,
      defaultContext: {
        ...this.defaultContext,
        ...context,
      },
    });
  }

  // Log methods
  debug(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Partial<LogContext>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  fatal(message: string, error?: Error, context?: Partial<LogContext>): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  // Performance timing
  time(label: string): () => void {
    const startTime = performance.now();
    this.timers.set(label, startTime);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.timers.delete(label);

      this.info(`Timer: ${label}`, {
        action: 'performance_timing',
        duration,
        metadata: { label },
      });

      return duration;
    };
  }

  // Async operation tracking
  async trackAsync<T>(
    label: string,
    operation: () => Promise<T>,
    context?: Partial<LogContext>
  ): Promise<T> {
    const startTime = performance.now();

    this.debug(`Starting async operation: ${label}`, context);

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      this.info(`Completed async operation: ${label}`, {
        ...context,
        duration,
        metadata: { ...context?.metadata, success: true },
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.error(
        `Failed async operation: ${label}`,
        error as Error,
        {
          ...context,
          duration,
          metadata: { ...context?.metadata, success: false },
        }
      );

      throw error;
    }
  }

  // Set correlation ID for request tracing
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  // Get current correlation ID
  getCorrelationId(): string {
    return this.correlationId;
  }

  // Internal log method
  private log(
    level: LogLevel,
    message: string,
    context?: Partial<LogContext>,
    error?: Error
  ): void {
    // Check if we should log this level
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      context: {
        ...this.defaultContext,
        ...context,
        correlationId: this.correlationId,
      },
      environment: import.meta.env.MODE,
      version: import.meta.env.VITE_APP_VERSION || '0.0.0',
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      };
    }

    // Send to all transports
    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (err) {
        // Don't let transport errors break logging
        console.error('Transport error:', err);
      }
    }
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Create singleton logger instance
export const logger = new Logger({
  level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
  transports: [
    new ConsoleTransport(),
    new LocalStorageTransport(),
  ],
});

// React hook for component logging
export function useLogger(component: string): Logger {
  // Use useMemo to avoid accessing ref during render
  return useMemo(() => logger.child({ component }), [component]);
}

// React hook for performance tracking
export function usePerformanceLogger(
  componentName: string
): (action: string, metadata?: Record<string, unknown>) => void {
  const componentLogger = useLogger(componentName);

  return (action: string, metadata?: Record<string, unknown>) => {
    componentLogger.info(`Performance: ${action}`, {
      action: 'component_performance',
      metadata,
    });
  };
}

// React hook for render tracking
export function useRenderLogger(componentName: string): void {
  const componentLogger = useLogger(componentName);
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;

    if (import.meta.env.DEV) {
      componentLogger.debug(`Render #${renderCount.current}`, {
        action: 'component_render',
        metadata: { renderCount: renderCount.current },
      });
    }
  });
}

// Export storage transport for access to logs
export const localStorageTransport = new LocalStorageTransport();
