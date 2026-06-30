/**
 * Markov action helpers — track successes and failures for workspace handlers.
 */
import { trackPortalAction, trackPortalError } from './portal-markov-tracker';

export function portalActionFailure(functionName: string, error: unknown): void {
  trackPortalError(functionName, error);
}

export async function runPortalAction<T>(functionName: string, fn: () => Promise<T>): Promise<T> {
  trackPortalAction(functionName);
  try {
    return await fn();
  } catch (error) {
    portalActionFailure(functionName, error);
    throw error;
  }
}
