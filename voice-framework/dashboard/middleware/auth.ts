/**
 * Authentication Middleware
 * Simple JWT-based authentication for admin portal
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

export interface AuthUser {
  id: string;
  email: string;
  role: 'super-admin' | 'admin' | 'editor' | 'viewer' | 'user';
  ownerId?: string; // For regular users, their owner/admin ID
}

// Simple in-memory session store (in production, use Redis or database)
const sessions = new Map<string, { user: AuthUser; expiresAt: number }>();

// Session tokens are opaque random bytes (see createSessionToken). Set JWT_SECRET if you add signed JWTs later.

// Session expiration (24 hours)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

/**
 * Create a session token
 */
export function createSessionToken(user: AuthUser): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_DURATION;
  
  sessions.set(token, { user, expiresAt });
  
  // Clean up expired sessions
  setTimeout(() => {
    sessions.delete(token);
  }, SESSION_DURATION);
  
  return token;
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string): AuthUser | null {
  const session = sessions.get(token);
  
  if (!session) {
    return null;
  }
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  
  return session.user;
}

/**
 * Authentication middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.cookies?.authToken ||
                req.query?.token as string;

  if (!token) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
      success: false
    });
    return;
  }

  const user = verifySessionToken(token);
  
  if (!user) {
    res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
      success: false
    });
    return;
  }

  // Attach user to request
  (req as any).user = user;
  next();
}

/**
 * Require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const user = (req as any).user as AuthUser;
    
    if (user.role !== 'admin') {
      res.status(403).json({
        error: 'Admin access required',
        code: 'FORBIDDEN',
        success: false
      });
      return;
    }
    
    next();
  });
}

/**
 * Require editor or admin role
 */
export function requireEditor(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const user = (req as any).user as AuthUser;
    
    if (user.role !== 'admin' && user.role !== 'editor') {
      res.status(403).json({
        error: 'Editor access required',
        code: 'FORBIDDEN',
        success: false
      });
      return;
    }
    
    next();
  });
}

/**
 * Login endpoint handler
 */
export async function handleLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    res.status(503).json({
      error: 'Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment.',
      code: 'ADMIN_NOT_CONFIGURED',
      success: false
    });
    return;
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    res.status(401).json({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
      success: false
    });
    return;
  }
  
  // Determine role based on email
  // Super-admin: brisbaneservers.com domain
  // Admin: portal admin users
  // User: client users
  let role: AuthUser['role'] = 'admin';
  if (email.includes('@brisbaneservers.com') || email === ADMIN_EMAIL) {
    role = 'super-admin';
  } else if (email.includes('@')) {
    // For now, treat other emails as regular admin
    // In production, this would check a user database
    role = 'admin';
  }
  
  const user: AuthUser = {
    id: email.replace('@', '-').replace(/\./g, '-'), // Simple ID from email
    email: email,
    role: role
  };
  
  const token = createSessionToken(user);
  
  res.json({
    token,
    user,
    success: true
  });
}

/**
 * Logout endpoint handler
 */
export function handleLogout(req: Request, res: Response): void {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.cookies?.authToken;
  
  if (token) {
    sessions.delete(token);
  }
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}

/**
 * Get current user endpoint
 */
export function handleGetCurrentUser(req: Request, res: Response): void {
  const user = (req as any).user as AuthUser;
  
  if (!user) {
    res.status(401).json({
      error: 'Not authenticated',
      code: 'UNAUTHORIZED',
      success: false
    });
    return;
  }
  
  res.json({
    user,
    success: true
  });
}


