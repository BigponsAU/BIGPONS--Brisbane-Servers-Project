/**
 * Error Handler Utility
 * Standardized error handling for route handlers
 */

import { Response } from 'express';
import { ApiError } from '../types';

/**
 * Handle errors in route handlers
 * Replaces catch (error: any) patterns with proper type safety
 * 
 * @param error - The error that occurred (unknown type for safety)
 * @param res - Express response object
 * @param statusCode - HTTP status code (default: 500)
 * @param defaultMessage - Default error message if error is not an Error instance
 */
export function handleRouteError(
  error: unknown,
  res: Response,
  statusCode: number = 500,
  defaultMessage: string = 'Internal server error'
): void {
  const message = error instanceof Error ? error.message : defaultMessage;
  const errorResponse: ApiError = {
    error: message,
    success: false
  };

  // Add error code if available
  if (error && typeof error === 'object' && 'code' in error) {
    errorResponse.code = String(error.code);
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    errorResponse.details = error.stack;
  }

  // Log error for debugging
  console.error(`[Error Handler] ${statusCode}:`, message);
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Handle validation errors
 * 
 * @param errors - Array of validation errors
 * @param res - Express response object
 */
export function handleValidationError(
  errors: Array<{ field?: string; message: string }>,
  res: Response
): void {
  const errorResponse: ApiError = {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    success: false,
    details: JSON.stringify(errors)
  };

  res.status(400).json(errorResponse);
}

