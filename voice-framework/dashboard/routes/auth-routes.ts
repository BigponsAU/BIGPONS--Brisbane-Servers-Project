/**
 * Authentication Routes
 * Handles login, logout, and user management
 */

import { Router } from 'express';
import { handleLogin, handleLogout, handleGetCurrentUser, requireAuth } from '../middleware/auth';

export function createAuthRoutes(): Router {
  const router = Router();

  /**
   * Login
   * POST /api/auth/login
   * Body: { email: string, password: string }
   */
  router.post('/login', async (req, res) => {
    await handleLogin(req, res);
  });

  /**
   * Logout
   * POST /api/auth/logout
   */
  router.post('/logout', requireAuth, (req, res) => {
    handleLogout(req, res);
  });

  /**
   * Get current user
   * GET /api/auth/me
   */
  router.get('/me', requireAuth, (req, res) => {
    handleGetCurrentUser(req, res);
  });

  return router;
}


