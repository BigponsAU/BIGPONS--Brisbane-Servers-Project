/**
 * Security Middleware
 * Rate limiting, CORS, timeout, and input sanitization
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw?.trim()) {
    return ['http://localhost:3000'];
  }
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * When ALLOW_GITHUB_PAGES=1, allow any https origin whose host is github.io or *.github.io
 * (GitHub Pages sends Origin: https://<user>.github.io even for project sites under /repo/).
 */
function isGithubPagesBrowserOrigin(origin: string): boolean {
  const enabled =
    process.env.ALLOW_GITHUB_PAGES === '1' || process.env.ALLOW_GITHUB_PAGES === 'true';
  if (!enabled) {
    return false;
  }
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') {
      return false;
    }
    return url.hostname === 'github.io' || url.hostname.endsWith('.github.io');
  } catch {
    return false;
  }
}

/**
 * Rate limiting configuration
 * Limits each IP to 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Endpoint-specific rate limiting configurations
 * Allows different rate limits for different endpoints based on their resource intensity
 */
export const endpointRateLimiters = {
  /**
   * Stricter rate limit for heavy processing endpoints
   * Used for: document processing, profile building, extrapolation
   */
  heavyProcessing: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Lower limit for heavy operations
    message: 'Too many requests to this resource-intensive endpoint. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  /**
   * Moderate rate limit for generation endpoints
   * Used for: text generation, extrapolation
   */
  generation: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Moderate limit for generation
    message: 'Too many generation requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  /**
   * Standard rate limit for analysis endpoints
   * Used for: text analysis, pattern extraction, shredding
   */
  analysis: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Standard limit for analysis
    message: 'Too many analysis requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  /**
   * More lenient rate limit for read-only endpoints
   * Used for: health checks, profile retrieval, storage queries
   */
  readOnly: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Higher limit for read operations
    message: 'Too many requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

/**
 * Get appropriate rate limiter for an endpoint
 * 
 * @param endpoint - The endpoint path (e.g., '/api/analyze', '/api/generate')
 * @returns The appropriate rate limiter middleware
 */
export function getRateLimiterForEndpoint(endpoint: string): ReturnType<typeof rateLimit> {
  // Heavy processing endpoints
  if (
    endpoint.includes('/documents/') ||
    endpoint.includes('/profile-builder') ||
    endpoint.includes('/extrapolate-project')
  ) {
    return endpointRateLimiters.heavyProcessing;
  }

  // Generation endpoints
  if (
    endpoint.includes('/generate') ||
    endpoint.includes('/extrapolate') ||
    endpoint.includes('/match-voice')
  ) {
    return endpointRateLimiters.generation;
  }

  // Analysis endpoints
  if (
    endpoint.includes('/analyze') ||
    endpoint.includes('/extract-patterns') ||
    endpoint.includes('/shred') ||
    endpoint.includes('/compare-truths')
  ) {
    return endpointRateLimiters.analysis;
  }

  // Read-only endpoints (default)
  return endpointRateLimiters.readOnly;
}

/**
 * CORS configuration
 * Uses environment variable ALLOWED_ORIGINS (comma-separated)
 * Defaults to http://localhost:3000 in development
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = parseAllowedOrigins();

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || isGithubPagesBrowserOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

/**
 * Request timeout middleware
 * Sets a 30-second timeout for all requests
 * 
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 */
export function createTimeoutMiddleware(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          success: false,
          message: `Request exceeded ${timeoutMs}ms timeout`
        });
      }
    });
    next();
  };
}

/**
 * Basic input sanitization
 * Removes potentially dangerous characters from strings
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize object properties recursively
 * 
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key] as string) as T[Extract<keyof T, string>];
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key] as Record<string, unknown>) as T[Extract<keyof T, string>];
    }
  }
  return sanitized;
}

