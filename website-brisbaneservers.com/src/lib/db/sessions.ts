/**
 * Session store (JSON-backed). Persists across restarts; in-memory cache for fast verify.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { AuthUser } from '../../utils/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../');
const SESSIONS_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'sessions.json');

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export interface StoredSession {
  token: string;
  userId: string;
  email: string;
  role: AuthUser['role'];
  expiresAt: string;
}

async function ensureFile(): Promise<void> {
  try {
    await fs.access(SESSIONS_FILE);
  } catch {
    await fs.mkdir(path.dirname(SESSIONS_FILE), { recursive: true });
    await fs.writeFile(SESSIONS_FILE, JSON.stringify([], null, 2));
  }
}

export async function loadSessions(): Promise<StoredSession[]> {
  await ensureFile();
  const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
  try {
    const arr = JSON.parse(data);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: StoredSession[]): Promise<void> {
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export async function createSession(user: AuthUser, token: string): Promise<void> {
  const sessions = await loadSessions();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  sessions.push({
    token,
    userId: user.id,
    email: user.email,
    role: user.role,
    expiresAt
  });
  await saveSessions(sessions);
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
  const sessions = await loadSessions();
  const now = new Date().toISOString();
  const session = sessions.find((s) => s.token === token && s.expiresAt > now);
  if (!session) return null;
  return {
    id: session.userId,
    email: session.email,
    role: session.role
  };
}

export async function deleteSession(token: string): Promise<void> {
  const sessions = await loadSessions();
  const filtered = sessions.filter((s) => s.token !== token);
  await saveSessions(filtered);
}
