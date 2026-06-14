/**
 * Postgres-backed auth store (production). Set DATABASE_URL.
 * Schema matches SQLite auth tables in auth-sqlite.ts.
 */

import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import type { Pool } from 'pg';
import { fileURLToPath } from 'url';
import type { AuthRole, AuthUser } from '../../utils/auth';
import { getRuntimeEnv } from '../../utils/runtime-env';
import { getSharedPool } from './pg-pool';
import type { StoredAuthToken } from './auth-types';
import type { StoredSession } from './sessions';
import type { StoredUser } from './users';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../');
const USERS_JSON_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'users.json');
const SESSIONS_JSON_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'sessions.json');
const AUTH_TOKENS_JSON_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'auth-tokens.json');

let schemaReady: Promise<void> | null = null;

function readJsonArray<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function getPool(): Pool {
  return getSharedPool();
}

async function ensureSchema(pool: Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at TEXT NOT NULL,
          email_verified_at TEXT,
          updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          role TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS auth_tokens (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          type TEXT NOT NULL,
          token_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          consumed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS auth_audit_log (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT,
          email TEXT,
          event_type TEXT NOT NULL,
          event_meta TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_type ON auth_tokens(user_id, type);
        CREATE INDEX IF NOT EXISTS idx_auth_tokens_token_hash ON auth_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);
      `);
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_enabled BOOLEAN NOT NULL DEFAULT false
      `).catch(() => undefined);

      const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
      const n = Number(rows[0]?.count ?? 0);
      if (n === 0) {
        await migrateJsonFromFiles(pool);
      }
    })();
  }
  await schemaReady;
}

async function migrateJsonFromFiles(pool: Pool): Promise<void> {
  const users = readJsonArray<StoredUser>(USERS_JSON_FILE);
  for (const user of users) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, created_at, email_verified_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.role,
        user.createdAt,
        typeof user.emailVerifiedAt === 'undefined' ? new Date(user.createdAt).toISOString() : user.emailVerifiedAt,
        user.updatedAt ?? user.createdAt
      ]
    );
  }

  const sessions = readJsonArray<StoredSession>(SESSIONS_JSON_FILE);
  for (const session of sessions) {
    await pool.query(
      `INSERT INTO sessions (token, user_id, email, role, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (token) DO NOTHING`,
      [
        session.token,
        session.userId,
        session.email,
        session.role,
        session.expiresAt,
        new Date().toISOString()
      ]
    );
  }

  const authTokens = readJsonArray<StoredAuthToken>(AUTH_TOKENS_JSON_FILE);
  for (const token of authTokens) {
    await pool.query(
      `INSERT INTO auth_tokens (id, user_id, email, type, token_hash, created_at, expires_at, consumed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [
        token.id,
        token.userId,
        token.email,
        token.type,
        token.tokenHash,
        token.createdAt,
        token.expiresAt,
        token.consumedAt ?? null
      ]
    );
  }
}

function rowToAuthUser(row: {
  user_id: string;
  email: string;
  role: string;
  email_verified_at: string | null;
}): AuthUser {
  return {
    id: row.user_id,
    email: row.email,
    role: row.role as AuthRole,
    emailVerified: Boolean(row.email_verified_at)
  };
}

export async function listUsersFromDb(): Promise<StoredUser[]> {
  const pool = await getPool();
  await ensureSchema(pool);
  const { rows } = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    role: string;
    created_at: string;
    email_verified_at: string | null;
    updated_at: string | null;
    workspace_enabled: boolean | null;
  }>(
    `SELECT id, email, password_hash, role, created_at, email_verified_at, updated_at, workspace_enabled FROM users ORDER BY created_at ASC`
  );
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as AuthRole,
    createdAt: row.created_at,
    emailVerifiedAt: row.email_verified_at,
    updatedAt: row.updated_at ?? undefined,
    workspaceEnabled: Boolean(row.workspace_enabled),
  }));
}

export async function findUserByEmailInDb(email: string): Promise<StoredUser | null> {
  const pool = await getPool();
  await ensureSchema(pool);
  const { rows } = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    role: string;
    created_at: string;
    email_verified_at: string | null;
    updated_at: string | null;
    workspace_enabled: boolean | null;
  }>(
    `SELECT id, email, password_hash, role, created_at, email_verified_at, updated_at, workspace_enabled
     FROM users WHERE email = $1 LIMIT 1`,
    [email.trim().toLowerCase()]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as AuthRole,
    createdAt: row.created_at,
    emailVerifiedAt: row.email_verified_at,
    updatedAt: row.updated_at ?? undefined,
    workspaceEnabled: Boolean(row.workspace_enabled),
  };
}

export async function findUserByIdInDb(id: string): Promise<StoredUser | null> {
  const pool = await getPool();
  await ensureSchema(pool);
  const { rows } = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    role: string;
    created_at: string;
    email_verified_at: string | null;
    updated_at: string | null;
    workspace_enabled: boolean | null;
  }>(
    `SELECT id, email, password_hash, role, created_at, email_verified_at, updated_at, workspace_enabled
     FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as AuthRole,
    createdAt: row.created_at,
    emailVerifiedAt: row.email_verified_at,
    updatedAt: row.updated_at ?? undefined,
    workspaceEnabled: Boolean(row.workspace_enabled),
  };
}

export async function createUserInDb(user: StoredUser): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, created_at, email_verified_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      user.id,
      user.email,
      user.passwordHash,
      user.role,
      user.createdAt,
      user.emailVerifiedAt ?? null,
      user.updatedAt ?? null
    ]
  );
}

export async function updateUserVerificationInDb(userId: string, emailVerifiedAt: string): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(`UPDATE users SET email_verified_at = $1, updated_at = $2 WHERE id = $3`, [
    emailVerifiedAt,
    new Date().toISOString(),
    userId
  ]);
}

export async function updateUserPasswordInDb(userId: string, passwordHash: string): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(`UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`, [
    passwordHash,
    new Date().toISOString(),
    userId
  ]);
}

export async function updateUserRoleInDb(userId: string, role: AuthRole): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(`UPDATE users SET role = $1, updated_at = $2 WHERE id = $3`, [
    role,
    new Date().toISOString(),
    userId
  ]);
}

export async function updateUserWorkspaceEnabledInDb(userId: string, workspaceEnabled: boolean): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(`UPDATE users SET workspace_enabled = $1, updated_at = $2 WHERE id = $3`, [
    workspaceEnabled,
    new Date().toISOString(),
    userId,
  ]);
}

export async function deleteUserInDb(userId: string): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
}

export async function listSessionsFromDb(): Promise<StoredSession[]> {
  const pool = await getPool();
  await ensureSchema(pool);
  const { rows } = await pool.query<{
    token: string;
    user_id: string;
    email: string;
    role: string;
    expires_at: string;
  }>(`SELECT token, user_id, email, role, expires_at FROM sessions ORDER BY expires_at DESC`);
  return rows.map((row) => ({
    token: row.token,
    userId: row.user_id,
    email: row.email,
    role: row.role as AuthRole,
    expiresAt: row.expires_at
  }));
}

export async function createSessionInDb(user: AuthUser, token: string, expiresAt: string): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(
    `INSERT INTO sessions (token, user_id, email, role, expires_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [token, user.id, user.email, user.role, expiresAt, new Date().toISOString()]
  );
}

export async function getSessionUserFromDb(token: string): Promise<AuthUser | null> {
  const pool = await getPool();
  await ensureSchema(pool);
  const now = new Date().toISOString();
  const { rows } = await pool.query<{
    user_id: string;
    email: string;
    role: string;
    email_verified_at: string | null;
  }>(
    `SELECT s.user_id, s.email, s.role, u.email_verified_at
     FROM sessions s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > $2
     LIMIT 1`,
    [token, now]
  );
  const row = rows[0];
  if (!row) return null;
  return rowToAuthUser(row);
}

export async function deleteSessionInDb(token: string): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

export async function deleteSessionsForUserInDb(userId: string): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
}

export async function listAuthTokensFromDb(): Promise<StoredAuthToken[]> {
  const pool = await getPool();
  await ensureSchema(pool);
  const { rows } = await pool.query<{
    id: string;
    user_id: string;
    email: string;
    type: string;
    token_hash: string;
    created_at: string;
    expires_at: string;
    consumed_at: string | null;
  }>(
    `SELECT id, user_id, email, type, token_hash, created_at, expires_at, consumed_at
     FROM auth_tokens ORDER BY created_at DESC`
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    type: row.type as StoredAuthToken['type'],
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at
  }));
}

export async function saveAuthTokenInDb(token: StoredAuthToken): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(
    `INSERT INTO auth_tokens (id, user_id, email, type, token_hash, created_at, expires_at, consumed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      token.id,
      token.userId,
      token.email,
      token.type,
      token.tokenHash,
      token.createdAt,
      token.expiresAt,
      token.consumedAt ?? null
    ]
  );
}

export async function replaceActiveAuthTokensInDb(userId: string, type: string, token: StoredAuthToken): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM auth_tokens WHERE user_id = $1 AND type = $2 AND consumed_at IS NULL AND expires_at > $3`,
      [userId, type, new Date().toISOString()]
    );
    await client.query(
      `INSERT INTO auth_tokens (id, user_id, email, type, token_hash, created_at, expires_at, consumed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        token.id,
        token.userId,
        token.email,
        token.type,
        token.tokenHash,
        token.createdAt,
        token.expiresAt,
        token.consumedAt ?? null
      ]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function consumeAuthTokenInDb(tokenHash: string, expectedType: string): Promise<StoredAuthToken | null> {
  const pool = await getPool();
  await ensureSchema(pool);
  const now = new Date().toISOString();
  const { rows } = await pool.query<{
    id: string;
    user_id: string;
    email: string;
    type: string;
    token_hash: string;
    created_at: string;
    expires_at: string;
  }>(
    `UPDATE auth_tokens SET consumed_at = $1
     WHERE token_hash = $2 AND type = $3 AND consumed_at IS NULL AND expires_at > $4
     RETURNING id, user_id, email, type, token_hash, created_at, expires_at`,
    [now, tokenHash, expectedType, now]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    type: row.type as StoredAuthToken['type'],
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    consumedAt: now
  };
}

export async function pruneAuthTokensInDb(): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(`DELETE FROM auth_tokens WHERE consumed_at IS NOT NULL OR expires_at <= $1`, [
    new Date().toISOString()
  ]);
}

export interface AuthAuditEventRecord {
  id: string;
  userId?: string | null;
  email?: string | null;
  eventType: string;
  eventMeta?: string | null;
  createdAt: string;
}

export async function recordAuthAuditEvent(event: {
  userId?: string | null;
  email?: string | null;
  eventType: string;
  eventMeta?: Record<string, unknown> | null;
}): Promise<void> {
  const pool = await getPool();
  await ensureSchema(pool);
  await pool.query(
    `INSERT INTO auth_audit_log (id, user_id, email, event_type, event_meta, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      event.userId ?? null,
      event.email ?? null,
      event.eventType,
      event.eventMeta ? JSON.stringify(event.eventMeta) : null,
      new Date().toISOString()
    ]
  );
}

export async function listRecentAuthAuditEvents(limit = 100): Promise<AuthAuditEventRecord[]> {
  const pool = await getPool();
  await ensureSchema(pool);
  const cap = Math.min(Math.max(limit, 1), 500);
  const { rows } = await pool.query<{
    id: string;
    user_id: string | null;
    email: string | null;
    event_type: string;
    event_meta: string | null;
    created_at: string;
  }>(
    `SELECT id, user_id, email, event_type, event_meta, created_at
     FROM auth_audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [cap]
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    eventType: row.event_type,
    eventMeta: row.event_meta,
    createdAt: row.created_at
  }));
}
