import type { AuthUser } from '../../utils/auth';
import {
  createSessionInDb,
  deleteSessionInDb,
  deleteSessionsForUserInDb,
  getSessionUserFromDb,
  listSessionsFromDb
} from './auth-db';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export interface StoredSession {
  token: string;
  userId: string;
  email: string;
  role: AuthUser['role'];
  expiresAt: string;
}

export async function loadSessions(): Promise<StoredSession[]> {
  return listSessionsFromDb();
}

export async function createSession(user: AuthUser, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await createSessionInDb(user, token, expiresAt);
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
  return getSessionUserFromDb(token);
}

export async function deleteSession(token: string): Promise<void> {
  await deleteSessionInDb(token);
}

export async function deleteSessionsForUser(userId: string): Promise<void> {
  await deleteSessionsForUserInDb(userId);
}
