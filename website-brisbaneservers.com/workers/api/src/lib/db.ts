import postgres from 'postgres';
import { sha256Hex } from './auth-crypto';
import type { AuthUser, AuthTokenType, StoredAuthToken, StoredUser } from './types';

export interface HyperdriveBinding {
  connectionString: string;
}

export type Sql = ReturnType<typeof postgres>;

let schemaReady: Promise<void> | null = null;

export function createSql(hyperdrive: HyperdriveBinding): Sql {
  return postgres(hyperdrive.connectionString, {
    max: 1,
    prepare: false,
    fetch_types: false,
  });
}

/** Run queries with a short-lived Hyperdrive connection (required in Workers). */
export async function withSql<T>(
  hyperdrive: HyperdriveBinding,
  fn: (sql: Sql) => Promise<T>
): Promise<T> {
  const sql = createSql(hyperdrive);
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function ensureSchema(sql: Sql): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at TEXT NOT NULL,
          email_verified_at TEXT,
          updated_at TEXT
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          role TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS auth_tokens (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          type TEXT NOT NULL,
          token_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          consumed_at TEXT
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS auth_audit_log (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT,
          email TEXT,
          event_type TEXT NOT NULL,
          event_meta TEXT,
          created_at TEXT NOT NULL
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_auth_tokens_token_hash ON auth_tokens(token_hash)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_enabled BOOLEAN NOT NULL DEFAULT false`.catch(
        () => undefined,
      );
    })();
  }
  await schemaReady;
}

export async function findUserByEmail(sql: Sql, email: string): Promise<StoredUser | null> {
  await ensureSchema(sql);
  const rows = await sql`
    SELECT id, email, password_hash, role, created_at, email_verified_at, updated_at, workspace_enabled
    FROM users WHERE email = ${email.trim().toLowerCase()} LIMIT 1
  `;
  const row = rows[0] as UserRow | undefined;
  if (!row) return null;
  return mapUserRow(row);
}

export async function findUserById(sql: Sql, id: string): Promise<StoredUser | null> {
  await ensureSchema(sql);
  const rows = await sql`
    SELECT id, email, password_hash, role, created_at, email_verified_at, updated_at, workspace_enabled
    FROM users WHERE id = ${id} LIMIT 1
  `;
  const row = rows[0] as UserRow | undefined;
  if (!row) return null;
  return mapUserRow(row);
}

export async function createUser(
  sql: Sql,
  email: string,
  passwordHash: string,
  role: StoredUser['role'] = 'client'
): Promise<StoredUser> {
  await ensureSchema(sql);
  const normalized = email.trim().toLowerCase();
  const existing = await findUserByEmail(sql, normalized);
  if (existing) throw new Error('EMAIL_IN_USE');

  const user: StoredUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    email: normalized,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
    emailVerifiedAt: null,
    updatedAt: new Date().toISOString(),
  };

  await sql`
    INSERT INTO users (id, email, password_hash, role, created_at, email_verified_at, updated_at)
    VALUES (${user.id}, ${user.email}, ${user.passwordHash}, ${user.role}, ${user.createdAt}, ${user.emailVerifiedAt ?? null}, ${user.updatedAt ?? null})
  `;
  return user;
}

export function isUserEmailVerified(user: StoredUser): boolean {
  if (typeof user.emailVerifiedAt === 'undefined') return true;
  return Boolean(user.emailVerifiedAt);
}

export async function createSession(sql: Sql, user: AuthUser, token: string, expiresAt: string): Promise<void> {
  await ensureSchema(sql);
  await sql`
    INSERT INTO sessions (token, user_id, email, role, expires_at, created_at)
    VALUES (${token}, ${user.id}, ${user.email}, ${user.role}, ${expiresAt}, ${new Date().toISOString()})
  `;
}

export async function getSessionUser(sql: Sql, token: string): Promise<AuthUser | null> {
  await ensureSchema(sql);
  const now = new Date().toISOString();
  const rows = await sql`
    SELECT s.user_id, s.email, s.role, u.email_verified_at
    FROM sessions s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > ${now}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.user_id),
    email: String(row.email),
    role: row.role as AuthUser['role'],
    emailVerified: Boolean(row.email_verified_at),
  };
}

export async function deleteSession(sql: Sql, token: string): Promise<void> {
  await ensureSchema(sql);
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

export async function replaceActiveAuthToken(
  sql: Sql,
  userId: string,
  type: AuthTokenType,
  token: StoredAuthToken
): Promise<void> {
  await ensureSchema(sql);
  const now = new Date().toISOString();
  await sql`
    DELETE FROM auth_tokens
    WHERE user_id = ${userId} AND type = ${type} AND consumed_at IS NULL AND expires_at > ${now}
  `;
  await sql`
    INSERT INTO auth_tokens (id, user_id, email, type, token_hash, created_at, expires_at, consumed_at)
    VALUES (${token.id}, ${token.userId}, ${token.email}, ${token.type}, ${token.tokenHash}, ${token.createdAt}, ${token.expiresAt}, ${token.consumedAt})
  `;
}

export async function pruneAuthTokens(sql: Sql): Promise<void> {
  await ensureSchema(sql);
  const now = new Date().toISOString();
  await sql`DELETE FROM auth_tokens WHERE consumed_at IS NOT NULL OR expires_at <= ${now}`;
}

export async function consumeAuthToken(
  sql: Sql,
  rawToken: string,
  expectedType: AuthTokenType
): Promise<StoredAuthToken | null> {
  await ensureSchema(sql);
  const tokenHash = await sha256Hex(rawToken);
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE auth_tokens SET consumed_at = ${now}
    WHERE token_hash = ${tokenHash} AND type = ${expectedType} AND consumed_at IS NULL AND expires_at > ${now}
    RETURNING id, user_id, email, type, token_hash, created_at, expires_at
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    email: String(row.email),
    type: row.type as AuthTokenType,
    tokenHash: String(row.token_hash),
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
    consumedAt: now,
  };
}

export async function markUserEmailVerified(sql: Sql, userId: string): Promise<StoredUser | null> {
  await ensureSchema(sql);
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE users SET email_verified_at = ${now}, updated_at = ${now}
    WHERE id = ${userId}
    RETURNING id, email, password_hash, role, created_at, email_verified_at, updated_at
  `;
  const row = rows[0] as UserRow | undefined;
  if (!row) return null;
  return mapUserRow(row);
}

export async function recordAuthAudit(
  sql: Sql,
  event: {
    userId?: string | null;
    email?: string | null;
    eventType: string;
    eventMeta?: Record<string, unknown> | null;
  }
): Promise<void> {
  await ensureSchema(sql);
  await sql`
    INSERT INTO auth_audit_log (id, user_id, email, event_type, event_meta, created_at)
    VALUES (
      ${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`},
      ${event.userId ?? null},
      ${event.email ?? null},
      ${event.eventType},
      ${event.eventMeta ? JSON.stringify(event.eventMeta) : null},
      ${new Date().toISOString()}
    )
  `;
}

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
  email_verified_at: string | null;
  updated_at: string | null;
  workspace_enabled: boolean | null;
};

function mapUserRow(row: UserRow): StoredUser {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role as StoredUser['role'],
    createdAt: String(row.created_at),
    emailVerifiedAt: row.email_verified_at,
    updatedAt: row.updated_at ?? undefined,
    workspaceEnabled: Boolean(row.workspace_enabled),
  };
}

export async function updateUserWorkspaceEnabled(sql: Sql, userId: string, workspaceEnabled: boolean): Promise<void> {
  await ensureSchema(sql);
  await sql`
    UPDATE users SET workspace_enabled = ${workspaceEnabled}, updated_at = ${new Date().toISOString()}
    WHERE id = ${userId}
  `;
}
