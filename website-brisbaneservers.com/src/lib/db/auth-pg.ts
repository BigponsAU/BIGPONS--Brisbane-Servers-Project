/**
 * Postgres-backed auth store (production). Requires DATABASE_URL.
 */

import { existsSync, readFileSync } from 'fs';
import type { Pool } from 'pg';
import type { AuthRole, AuthUser } from '../../utils/auth';
import { isLimitedFsRuntime } from '@voice-framework/utils/fs-safe';
import { getRuntimeEnv } from '../../utils/runtime-env';
import { getAuthTokensJsonFile, getSessionsJsonFile, getUsersJsonFile } from '../storage-paths';
import { getSharedPool } from './pg-pool';
import type { StoredAuthToken } from './auth-types';
import type { StoredSession } from './sessions';
import type { StoredUser } from './users';

let schemaReady: Promise<void> | null = null;

function readJsonArray<T>(filePath: string): T[] {
  if (isLimitedFsRuntime()) return [];
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
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS removed_at TEXT
      `).catch(() => undefined);
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS removed_by TEXT
      `).catch(() => undefined);
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS removal_reason TEXT
      `).catch(() => undefined);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_account_backups (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          snapshot TEXT NOT NULL,
          removed_at TEXT NOT NULL,
          removed_by TEXT,
          removal_reason TEXT,
          restored_at TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_user_account_backups_user_id ON user_account_backups(user_id);
        CREATE INDEX IF NOT EXISTS idx_users_removed_at ON users(removed_at);
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
  const users = readJsonArray<StoredUser>(getUsersJsonFile());
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

  const sessions = readJsonArray<StoredSession>(getSessionsJsonFile());
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

  const authTokens = readJsonArray<StoredAuthToken>(getAuthTokensJsonFile());
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

type UserDbRow = {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
  email_verified_at: string | null;
  updated_at: string | null;
  workspace_enabled: boolean | null;
  removed_at: string | null;
  removed_by: string | null;
  removal_reason: string | null;
};

const USER_SELECT_COLS =
  'id, email, password_hash, role, created_at, email_verified_at, updated_at, workspace_enabled, removed_at, removed_by, removal_reason';

function mapUserRow(row: UserDbRow): StoredUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as AuthRole,
    createdAt: row.created_at,
    emailVerifiedAt: row.email_verified_at,
    updatedAt: row.updated_at ?? undefined,
    workspaceEnabled: Boolean(row.workspace_enabled),
    removedAt: row.removed_at,
    removedBy: row.removed_by,
    removalReason: row.removal_reason,
  };
}

export async function listUsersFromDb(options?: { includeRemoved?: boolean }): Promise<StoredUser[]> {
  const pool = await getPool();
  await ensureSchema(pool);
  const includeRemoved = Boolean(options?.includeRemoved);
  const { rows } = await pool.query<UserDbRow>(
    includeRemoved
      ? `SELECT ${USER_SELECT_COLS} FROM users ORDER BY created_at ASC`
      : `SELECT ${USER_SELECT_COLS} FROM users WHERE removed_at IS NULL ORDER BY created_at ASC`
  );
  return rows.map(mapUserRow);
}

export async function findUserByEmailInDb(email: string): Promise<StoredUser | null> {
  const pool = await getPool();
  await ensureSchema(pool);
  const { rows } = await pool.query<UserDbRow>(
    `SELECT ${USER_SELECT_COLS} FROM users WHERE email = $1 LIMIT 1`,
    [email.trim().toLowerCase()]
  );
  const row = rows[0];
  return row ? mapUserRow(row) : null;
}

export async function findUserByIdInDb(id: string): Promise<StoredUser | null> {
  const pool = await getPool();
  await ensureSchema(pool);
  const { rows } = await pool.query<UserDbRow>(
    `SELECT ${USER_SELECT_COLS} FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? mapUserRow(row) : null;
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

export interface UserAccountBackupRecord {
  id: string;
  userId: string;
  email: string;
  snapshot: string;
  removedAt: string;
  removedBy?: string | null;
  removalReason?: string | null;
  restoredAt?: string | null;
  createdAt: string;
}

export async function softRemoveUserInDb(input: {
  userId: string;
  removedBy: string;
  reason?: string | null;
  oauthIdentities?: Array<{ provider: string; subject: string; email: string; createdAt: string }>;
}): Promise<{ user: StoredUser; backupId: string }> {
  const pool = await getPool();
  await ensureSchema(pool);
  const existing = await findUserByIdInDb(input.userId);
  if (!existing) throw new Error('USER_NOT_FOUND');
  if (existing.removedAt) throw new Error('USER_ALREADY_REMOVED');

  const removedAt = new Date().toISOString();
  const backupId = `backup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const snapshot = JSON.stringify({
    user: existing,
    oauthIdentities: input.oauthIdentities ?? [],
    backedUpAt: removedAt,
  });

  await pool.query(
    `INSERT INTO user_account_backups (id, user_id, email, snapshot, removed_at, removed_by, removal_reason, restored_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8)`,
    [
      backupId,
      existing.id,
      existing.email,
      snapshot,
      removedAt,
      input.removedBy,
      input.reason ?? null,
      removedAt,
    ]
  );
  await pool.query(
    `UPDATE users SET removed_at = $1, removed_by = $2, removal_reason = $3, updated_at = $4 WHERE id = $5`,
    [removedAt, input.removedBy, input.reason ?? null, removedAt, existing.id]
  );
  await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [existing.id]);

  return {
    user: {
      ...existing,
      removedAt,
      removedBy: input.removedBy,
      removalReason: input.reason ?? null,
      updatedAt: removedAt,
    },
    backupId,
  };
}

export async function restoreUserInDb(userId: string): Promise<StoredUser> {
  const pool = await getPool();
  await ensureSchema(pool);
  const existing = await findUserByIdInDb(userId);
  if (!existing) throw new Error('USER_NOT_FOUND');
  if (!existing.removedAt) throw new Error('USER_NOT_REMOVED');

  const restoredAt = new Date().toISOString();
  await pool.query(
    `UPDATE users SET removed_at = NULL, removed_by = NULL, removal_reason = NULL, updated_at = $1 WHERE id = $2`,
    [restoredAt, userId]
  );
  await pool.query(
    `UPDATE user_account_backups
     SET restored_at = $1
     WHERE user_id = $2 AND restored_at IS NULL`,
    [restoredAt, userId]
  );

  return {
    ...existing,
    removedAt: null,
    removedBy: null,
    removalReason: null,
    updatedAt: restoredAt,
  };
}

export async function listUserAccountBackupsInDb(userId: string): Promise<UserAccountBackupRecord[]> {
  const pool = await getPool();
  await ensureSchema(pool);
  const { rows } = await pool.query<{
    id: string;
    user_id: string;
    email: string;
    snapshot: string;
    removed_at: string;
    removed_by: string | null;
    removal_reason: string | null;
    restored_at: string | null;
    created_at: string;
  }>(
    `SELECT id, user_id, email, snapshot, removed_at, removed_by, removal_reason, restored_at, created_at
     FROM user_account_backups
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    snapshot: row.snapshot,
    removedAt: row.removed_at,
    removedBy: row.removed_by,
    removalReason: row.removal_reason,
    restoredAt: row.restored_at,
    createdAt: row.created_at,
  }));
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
  // Prefer the live users row by email so stale session.user_id (re-seeded accounts)
  // cannot orphan passkeys or other user_id-scoped data.
  const { rows } = await pool.query<{
    session_user_id: string;
    canonical_user_id: string | null;
    email: string;
    role: string;
    email_verified_at: string | null;
    removed_at: string | null;
  }>(
    `SELECT
       s.user_id AS session_user_id,
       COALESCE(u_by_id.id, u_by_email.id) AS canonical_user_id,
       COALESCE(u_by_id.email, u_by_email.email, s.email) AS email,
       COALESCE(u_by_id.role, u_by_email.role, s.role) AS role,
       COALESCE(u_by_id.email_verified_at, u_by_email.email_verified_at) AS email_verified_at,
       COALESCE(u_by_id.removed_at, u_by_email.removed_at) AS removed_at
     FROM sessions s
     LEFT JOIN users u_by_id ON u_by_id.id = s.user_id
     LEFT JOIN users u_by_email ON lower(u_by_email.email) = lower(s.email)
     WHERE s.token = $1 AND s.expires_at > $2
     LIMIT 1`,
    [token, now]
  );
  const row = rows[0];
  if (!row?.canonical_user_id) return null;
  if (row.removed_at) {
    await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
    return null;
  }

  if (row.session_user_id !== row.canonical_user_id) {
    await pool.query(`UPDATE sessions SET user_id = $1, email = $2, role = $3 WHERE token = $4`, [
      row.canonical_user_id,
      row.email,
      row.role,
      token,
    ]);
  }

  return rowToAuthUser({
    user_id: row.canonical_user_id,
    email: row.email,
    role: row.role,
    email_verified_at: row.email_verified_at,
  });
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

export async function listRecentAuthAuditEvents(
  limit = 25,
  offset = 0
): Promise<AuthAuditEventRecord[]> {
  const pool = await getPool();
  await ensureSchema(pool);
  const cap = Math.min(Math.max(limit, 1), 100);
  const skip = Math.max(offset, 0);
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
     LIMIT $1 OFFSET $2`,
    [cap, skip]
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

export async function countAuthAuditEvents(): Promise<number> {
  const pool = await getPool();
  await ensureSchema(pool);
  const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM auth_audit_log`);
  return Number(rows[0]?.count ?? 0);
}
