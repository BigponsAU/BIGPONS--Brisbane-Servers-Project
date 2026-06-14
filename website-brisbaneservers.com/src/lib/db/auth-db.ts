/**
 * Auth persistence router: Postgres when DATABASE_URL is set, else SQLite (sql.js).
 */

import type { AuthRole, AuthUser } from '../../utils/auth';
import { isEdgeWorkerRuntime } from './edge-hyperdrive-sql';
import { usePostgres } from './pg-pool';
import type { StoredAuthToken } from './auth-types';
import type { StoredUser } from './users';

export type { AuthAuditEventRecord } from './auth-sqlite';

export { usePostgres };

function requireAuthBackend(): 'postgres' | 'sqlite' {
  if (usePostgres()) return 'postgres';
  if (isEdgeWorkerRuntime()) {
    throw new Error('Edge auth database is not configured (DATABASE_URL missing)');
  }
  return 'sqlite';
}

export async function listUsersFromDb() {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).listUsersFromDb();
  return (await import('./auth-sqlite')).listUsersFromDb();
}

export async function findUserByEmailInDb(email: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).findUserByEmailInDb(email);
  return (await import('./auth-sqlite')).findUserByEmailInDb(email);
}

export async function findUserByIdInDb(id: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).findUserByIdInDb(id);
  return (await import('./auth-sqlite')).findUserByIdInDb(id);
}

export async function createUserInDb(user: StoredUser) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).createUserInDb(user);
  return (await import('./auth-sqlite')).createUserInDb(user);
}

export async function updateUserVerificationInDb(userId: string, emailVerifiedAt: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).updateUserVerificationInDb(userId, emailVerifiedAt);
  return (await import('./auth-sqlite')).updateUserVerificationInDb(userId, emailVerifiedAt);
}

export async function updateUserPasswordInDb(userId: string, passwordHash: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).updateUserPasswordInDb(userId, passwordHash);
  return (await import('./auth-sqlite')).updateUserPasswordInDb(userId, passwordHash);
}

export async function updateUserRoleInDb(userId: string, role: AuthRole) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).updateUserRoleInDb(userId, role);
  return (await import('./auth-sqlite')).updateUserRoleInDb(userId, role);
}

export async function updateUserWorkspaceEnabledInDb(userId: string, workspaceEnabled: boolean) {
  if (requireAuthBackend() === 'postgres') {
    return (await import('./auth-pg')).updateUserWorkspaceEnabledInDb(userId, workspaceEnabled);
  }
  return (await import('./auth-sqlite')).updateUserWorkspaceEnabledInDb(userId, workspaceEnabled);
}

export async function deleteUserInDb(userId: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).deleteUserInDb(userId);
  return (await import('./auth-sqlite')).deleteUserInDb(userId);
}

export async function listSessionsFromDb() {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).listSessionsFromDb();
  return (await import('./auth-sqlite')).listSessionsFromDb();
}

export async function createSessionInDb(user: AuthUser, token: string, expiresAt: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).createSessionInDb(user, token, expiresAt);
  return (await import('./auth-sqlite')).createSessionInDb(user, token, expiresAt);
}

export async function getSessionUserFromDb(token: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).getSessionUserFromDb(token);
  return (await import('./auth-sqlite')).getSessionUserFromDb(token);
}

export async function deleteSessionInDb(token: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).deleteSessionInDb(token);
  return (await import('./auth-sqlite')).deleteSessionInDb(token);
}

export async function deleteSessionsForUserInDb(userId: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).deleteSessionsForUserInDb(userId);
  return (await import('./auth-sqlite')).deleteSessionsForUserInDb(userId);
}

export async function listAuthTokensFromDb() {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).listAuthTokensFromDb();
  return (await import('./auth-sqlite')).listAuthTokensFromDb();
}

export async function saveAuthTokenInDb(token: StoredAuthToken) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).saveAuthTokenInDb(token);
  return (await import('./auth-sqlite')).saveAuthTokenInDb(token);
}

export async function replaceActiveAuthTokensInDb(userId: string, type: string, token: StoredAuthToken) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).replaceActiveAuthTokensInDb(userId, type, token);
  return (await import('./auth-sqlite')).replaceActiveAuthTokensInDb(userId, type, token);
}

export async function consumeAuthTokenInDb(tokenHash: string, expectedType: string) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).consumeAuthTokenInDb(tokenHash, expectedType);
  return (await import('./auth-sqlite')).consumeAuthTokenInDb(tokenHash, expectedType);
}

export async function pruneAuthTokensInDb() {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).pruneAuthTokensInDb();
  return (await import('./auth-sqlite')).pruneAuthTokensInDb();
}

export async function recordAuthAuditEvent(event: {
  userId?: string | null;
  email?: string | null;
  eventType: string;
  eventMeta?: Record<string, unknown> | null;
}) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).recordAuthAuditEvent(event);
  return (await import('./auth-sqlite')).recordAuthAuditEvent(event);
}

export async function listRecentAuthAuditEvents(limit = 100) {
  if (requireAuthBackend() === 'postgres') return (await import('./auth-pg')).listRecentAuthAuditEvents(limit);
  return (await import('./auth-sqlite')).listRecentAuthAuditEvents(limit);
}
