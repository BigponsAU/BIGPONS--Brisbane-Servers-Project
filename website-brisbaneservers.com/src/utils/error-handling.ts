/**
 * Error Handling Utilities
 * 
 * Provides safe data access, validation, and fallback patterns
 * for graceful degradation and error prevention.
 */

/**
 * Safely get a value from an object with fallback
 */
export function safeGet<T>(
  obj: any,
  path: string,
  fallback: T
): T {
  try {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value == null || typeof value !== 'object') {
        return fallback;
      }
      value = value[key];
    }
    return value != null ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate required fields in an object
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const field of requiredFields) {
    const value = data[field];
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
      missing.push(field);
    }
  }
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Safe array access with bounds checking
 */
export function safeArrayAccess<T>(array: T[] | null | undefined, index: number, fallback: T): T {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return fallback;
  }
  return array[index];
}

/**
 * Safe string truncation
 */
export function safeTruncate(text: string | null | undefined, maxLength: number, suffix = '...'): string {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Log error with context (non-blocking)
 */
export function logError(error: Error | unknown, context?: string): void {
  if (typeof console !== 'undefined' && console.error) {
    const message = error instanceof Error ? error.message : String(error);
    const contextMsg = context ? `[${context}] ` : '';
    console.error(`${contextMsg}${message}`, error);
  }
}

/**
 * Create a fallback value generator
 */
export function createFallback<T>(fallbackValue: T) {
  return (value: T | null | undefined): T => {
    return value != null ? value : fallbackValue;
  };
}

