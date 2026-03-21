/**
 * Structured Logging Utility
 * 
 * Provides structured logging capabilities using Winston for production-grade logging.
 * Falls back to console logging if Winston is not available.
 * 
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.info('Server started', { port: 3001 });
 *   logger.error('Database connection failed', { error, retries: 3 });
 * 
 * Features:
 * - Structured JSON logging in production
 * - Human-readable console output in development
 * - File logging support (optional, requires Winston)
 * - Error tracking with stack traces
 * - Contextual logging with child loggers
 * 
 * To enable Winston logging, install winston:
 *   npm install winston
 */

import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

type WinstonLogger = {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  child: (context: Record<string, unknown>) => WinstonLogger;
};

type WinstonModule = {
  transports: {
    Console: new (options: Record<string, unknown>) => unknown;
    File: new (options: Record<string, unknown>) => unknown;
  };
  format: {
    combine: (...formats: unknown[]) => unknown;
    timestamp: () => unknown;
    colorize: () => unknown;
    json: () => unknown;
    printf: (
      formatter: (info: {
        timestamp?: string;
        level?: string;
        message?: string;
        [key: string]: unknown;
      }) => string
    ) => unknown;
  };
  createLogger: (options: {
    level: string;
    transports: unknown[];
    exitOnError: boolean;
  }) => WinstonLogger;
};

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;
  private winstonLogger: WinstonLogger | null = null;
  private winstonInitialized = false;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    // In production, only show WARN and ERROR. In development, show all levels.
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  /**
   * Lazy-load Winston if available
   */
  private async tryInitializeWinston(): Promise<void> {
    if (this.winstonInitialized) return;
    this.winstonInitialized = true;

    try {
      // Dynamic import to avoid requiring Winston at module load time
      const moduleName = 'winston';
      const winstonModule = await import(moduleName);
      const winston = (winstonModule.default || winstonModule) as WinstonModule;

      const logDir = join(__dirname, '../../logs');
      const transports: unknown[] = [
        // Console transport with formatting
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            this.isDevelopment
              ? winston.format.colorize()
              : winston.format.json(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              if (this.isDevelopment) {
                return `${timestamp ?? ''} [${level ?? 'info'}]: ${message ?? ''} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
              }
              return JSON.stringify({ timestamp, level, message, ...meta });
            })
          ),
          level: this.isDevelopment ? 'debug' : 'warn',
        }),
      ];

      // Add file transport in production
      if (!this.isDevelopment) {
        try {
          // Ensure logs directory exists
          if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
          }

          transports.push(
            new winston.transports.File({
              filename: join(logDir, 'error.log'),
              level: 'error',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
            }),
            new winston.transports.File({
              filename: join(logDir, 'combined.log'),
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
            })
          );
        } catch (error) {
          // File logging not available, continue with console only
          console.warn('File logging not available:', error);
        }
      }

      this.winstonLogger = winston.createLogger({
        level: this.isDevelopment ? 'debug' : 'warn',
        transports,
        exitOnError: false,
      }) as WinstonLogger;
    } catch {
      // Winston not installed, will use console fallback
      this.winstonLogger = null;
    }
  }

  /**
   * Format log entry for output
   */
  private formatEntry(level: string, message: string, data?: Record<string, unknown>, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (data && Object.keys(data).length > 0) {
      entry.data = data;
    }

    if (error) {
      entry.error = {
        message: error.message,
        name: error.name,
      };
      if (this.isDevelopment && error.stack) {
        entry.error.stack = error.stack;
      }
    }

    return entry;
  }

  /**
   * Output log entry using Winston if available, otherwise console
   */
  private output(entry: LogEntry): void {
    // Try to initialize Winston on first use (non-blocking)
    if (!this.winstonInitialized) {
      this.tryInitializeWinston().catch(() => {
        // Winston initialization failed, continue with console
      });
    }

    if (this.winstonLogger) {
      // Use Winston for structured logging
      const logMethodMap = {
        debug: this.winstonLogger.debug,
        info: this.winstonLogger.info,
        warn: this.winstonLogger.warn,
        error: this.winstonLogger.error,
      };
      const logMethod = logMethodMap[entry.level as keyof typeof logMethodMap];
      if (logMethod && typeof logMethod === 'function') {
        const meta: Record<string, unknown> = { ...entry.data };
        if (entry.error) {
          meta.error = entry.error;
        }
        logMethod(entry.message, Object.keys(meta).length > 0 ? meta : undefined);
        return;
      }
    }

    // Fallback to console logging
    const jsonOutput = JSON.stringify(entry);
    
    // In development, use console for readability
    // In production, output JSON for log aggregation tools
    if (this.isDevelopment) {
      const prefix = `[${entry.level.toUpperCase()}]`;
      console.log(`${prefix} ${entry.message}`, entry.data || '', entry.error || '');
    } else {
      // In production, output structured JSON
      console.log(jsonOutput);
    }
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    if (LogLevel.DEBUG >= this.minLevel) {
      this.output(this.formatEntry('debug', message, data));
    }
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    if (LogLevel.INFO >= this.minLevel) {
      this.output(this.formatEntry('info', message, data));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, unknown>, error?: Error): void {
    if (LogLevel.WARN >= this.minLevel) {
      this.output(this.formatEntry('warn', message, data, error));
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    if (LogLevel.ERROR >= this.minLevel) {
      const err = error instanceof Error ? error : undefined;
      this.output(this.formatEntry('error', message, data, err));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger();
    const originalOutput = childLogger.output.bind(childLogger);
    
    childLogger.output = (entry: LogEntry) => {
      entry.data = { ...context, ...entry.data };
      originalOutput(entry);
    };
    
    // If using Winston, create a child logger there too
    if (this.winstonLogger) {
      childLogger.winstonLogger = this.winstonLogger.child(context);
      childLogger.winstonInitialized = true;
    }
    
    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();
