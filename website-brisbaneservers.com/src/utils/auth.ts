/**
 * Authentication Utilities
 * Shared authentication logic for Astro API routes
 */

import * as crypto from 'crypto';

const SALT_LEN = 16;
const KEY_LEN = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
}

export type AuthRole = 'super-admin' | 'admin' | 'editor' | 'viewer' | 'client';

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  emailVerified?: boolean;
  workspaceEnabled?: boolean;
}

// Opaque session token — persisted via createSession() in lib/db/sessions (Postgres).
export function createSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify session token against Postgres (production only).
 */
export async function verifySessionTokenAsync(token: string): Promise<AuthUser | null> {
  const { getSessionUser } = await import('../lib/db/sessions');
  return getSessionUser(token);
}

/**
 * Get token from request headers or cookies
 */
export function getTokenFromRequest(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (cookies.authToken) {
      return cookies.authToken;
    }
  }
  
  return null;
}

/**
 * Require authentication — Postgres session only.
 */
export async function requireAuth(
  request: Request
): Promise<{ user: AuthUser } | { error: string; code: string }> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return { error: 'Authentication required', code: 'UNAUTHORIZED' };
  }
  const user = await verifySessionTokenAsync(token);
  if (!user) {
    return { error: 'Invalid or expired token', code: 'INVALID_TOKEN' };
  }
  return { user };
}

/**
 * Require editor or admin role
 */
export async function requireEditor(
  request: Request
): Promise<{ user: AuthUser } | { error: string; code: string }> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult;
  const { user } = authResult;
  if (user.role !== 'admin' && user.role !== 'super-admin' && user.role !== 'editor') {
    return { error: 'Editor access required', code: 'FORBIDDEN' };
  }
  return { user };
}

/**
 * Require admin role
 */
export async function requireAdmin(
  request: Request
): Promise<{ user: AuthUser } | { error: string; code: string }> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult;
  const { user } = authResult;
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return { error: 'Admin access required', code: 'FORBIDDEN' };
  }
  return { user };
}
