import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AUTH_SQLITE_DB_FILE } from '../storage-paths';
import type { AuthRole, AuthUser } from '../../utils/auth';
import type { StoredAuthToken } from './auth-types';
import type { StoredSession } from './sessions';
import type { StoredUser } from './users';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../');
const USERS_JSON_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'users.json');
const SESSIONS_JSON_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'sessions.json');
const AUTH_TOKENS_JSON_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'auth-tokens.json');

type SqlJsModule = typeof import('sql.js');
type DatabaseInstance = InstanceType<Awaited<ReturnType<SqlJsModule['default']>>['Database']>;

let dbPromise: Promise<DatabaseInstance> | null = null;

function readJsonArray<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function persistDb(db: DatabaseInstance): void {
  const data = db.export();
  writeFileSync(AUTH_SQLITE_DB_FILE, Buffer.from(data));
}

function rowToAuthUser(row: { user_id: string; email: string; role: string; email_verified_at?: string | null }): AuthUser {
  return {
    id: row.user_id,
    email: row.email,
    role: row.role as AuthRole,
    emailVerified: Boolean(row.email_verified_at)
  };
}

async function initializeDb(): Promise<DatabaseInstance> {
  const initSqlJs = (await import('sql.js')).default;
  const wasmDir = path.join(__dirname, '../../../node_modules/sql.js/dist');
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(wasmDir, file)
  });

  mkdirSync(path.dirname(AUTH_SQLITE_DB_FILE), { recursive: true });
  const db = existsSync(AUTH_SQLITE_DB_FILE)
    ? new SQL.Database(readFileSync(AUTH_SQLITE_DB_FILE))
    : new SQL.Database();

  db.run(`
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

  const countResult = db.exec('SELECT COUNT(*) AS count FROM users');
  const existingUsers = Number(countResult?.[0]?.values?.[0]?.[0] ?? 0);
  if (existingUsers === 0) {
    migrateJsonData(db);
    persistDb(db);
  }

  return db;
}

function migrateJsonData(db: DatabaseInstance): void {
  const users = readJsonArray<StoredUser>(USERS_JSON_FILE);
  if (users.length) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_hash, role, created_at, email_verified_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const user of users) {
      stmt.run([
        user.id,
        user.email,
        user.passwordHash,
        user.role,
        user.createdAt,
        typeof user.emailVerifiedAt === 'undefined' ? new Date(user.createdAt).toISOString() : user.emailVerifiedAt,
        user.updatedAt ?? user.createdAt
      ]);
    }
    stmt.free();
  }

  const sessions = readJsonArray<StoredSession>(SESSIONS_JSON_FILE);
  if (sessions.length) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO sessions (token, user_id, email, role, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const session of sessions) {
      stmt.run([
        session.token,
        session.userId,
        session.email,
        session.role,
        session.expiresAt,
        new Date().toISOString()
      ]);
    }
    stmt.free();
  }

  const authTokens = readJsonArray<StoredAuthToken>(AUTH_TOKENS_JSON_FILE);
  if (authTokens.length) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO auth_tokens (id, user_id, email, type, token_hash, created_at, expires_at, consumed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const token of authTokens) {
      stmt.run([
        token.id,
        token.userId,
        token.email,
        token.type,
        token.tokenHash,
        token.createdAt,
        token.expiresAt,
        token.consumedAt ?? null
      ]);
    }
    stmt.free();
  }
}

async function getDb(): Promise<DatabaseInstance> {
  if (!dbPromise) {
    dbPromise = initializeDb();
  }
  return dbPromise;
}

export async function listUsersFromDb(): Promise<StoredUser[]> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT id, email, password_hash, role, created_at, email_verified_at, updated_at
    FROM users
    ORDER BY created_at ASC
  `);
  const users: StoredUser[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    users.push({
      id: String(row.id),
      email: String(row.email),
      passwordHash: String(row.password_hash),
      role: String(row.role) as AuthRole,
      createdAt: String(row.created_at),
      emailVerifiedAt: row.email_verified_at ? String(row.email_verified_at) : null,
      updatedAt: row.updated_at ? String(row.updated_at) : undefined
    });
  }
  stmt.free();
  return users;
}

export async function findUserByEmailInDb(email: string): Promise<StoredUser | null> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT id, email, password_hash, role, created_at, email_verified_at, updated_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `);
  stmt.bind([email.trim().toLowerCase()]);
  const user = stmt.step()
    ? ({
        id: String(stmt.getAsObject().id),
        email: String(stmt.getAsObject().email),
        passwordHash: String(stmt.getAsObject().password_hash),
        role: String(stmt.getAsObject().role) as AuthRole,
        createdAt: String(stmt.getAsObject().created_at),
        emailVerifiedAt: stmt.getAsObject().email_verified_at ? String(stmt.getAsObject().email_verified_at) : null,
        updatedAt: stmt.getAsObject().updated_at ? String(stmt.getAsObject().updated_at) : undefined
      } as StoredUser)
    : null;
  stmt.free();
  return user;
}

export async function findUserByIdInDb(id: string): Promise<StoredUser | null> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT id, email, password_hash, role, created_at, email_verified_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `);
  stmt.bind([id]);
  const user = stmt.step()
    ? ({
        id: String(stmt.getAsObject().id),
        email: String(stmt.getAsObject().email),
        passwordHash: String(stmt.getAsObject().password_hash),
        role: String(stmt.getAsObject().role) as AuthRole,
        createdAt: String(stmt.getAsObject().created_at),
        emailVerifiedAt: stmt.getAsObject().email_verified_at ? String(stmt.getAsObject().email_verified_at) : null,
        updatedAt: stmt.getAsObject().updated_at ? String(stmt.getAsObject().updated_at) : undefined
      } as StoredUser)
    : null;
  stmt.free();
  return user;
}

export async function createUserInDb(user: StoredUser): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT INTO users (id, email, password_hash, role, created_at, email_verified_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.id, user.email, user.passwordHash, user.role, user.createdAt, user.emailVerifiedAt ?? null, user.updatedAt ?? null]
  );
  persistDb(db);
}

export async function updateUserVerificationInDb(userId: string, emailVerifiedAt: string): Promise<void> {
  const db = await getDb();
  db.run(
    'UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?',
    [emailVerifiedAt, new Date().toISOString(), userId]
  );
  persistDb(db);
}

export async function updateUserPasswordInDb(userId: string, passwordHash: string): Promise<void> {
  const db = await getDb();
  db.run(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
    [passwordHash, new Date().toISOString(), userId]
  );
  persistDb(db);
}

export async function deleteUserInDb(userId: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM users WHERE id = ?', [userId]);
  persistDb(db);
}

export async function listSessionsFromDb(): Promise<StoredSession[]> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT token, user_id, email, role, expires_at
    FROM sessions
    ORDER BY expires_at DESC
  `);
  const sessions: StoredSession[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    sessions.push({
      token: String(row.token),
      userId: String(row.user_id),
      email: String(row.email),
      role: String(row.role) as AuthRole,
      expiresAt: String(row.expires_at)
    });
  }
  stmt.free();
  return sessions;
}

export async function createSessionInDb(user: AuthUser, token: string, expiresAt: string): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT INTO sessions (token, user_id, email, role, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [token, user.id, user.email, user.role, expiresAt, new Date().toISOString()]
  );
  persistDb(db);
}

export async function getSessionUserFromDb(token: string): Promise<AuthUser | null> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT s.user_id, s.email, s.role, u.email_verified_at
    FROM sessions s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
    LIMIT 1
  `);
  stmt.bind([token, new Date().toISOString()]);
  const user = stmt.step() ? rowToAuthUser(stmt.getAsObject() as { user_id: string; email: string; role: string; email_verified_at?: string | null }) : null;
  stmt.free();
  return user;
}

export async function deleteSessionInDb(token: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM sessions WHERE token = ?', [token]);
  persistDb(db);
}

export async function deleteSessionsForUserInDb(userId: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
  persistDb(db);
}

export async function listAuthTokensFromDb(): Promise<StoredAuthToken[]> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT id, user_id, email, type, token_hash, created_at, expires_at, consumed_at
    FROM auth_tokens
    ORDER BY created_at DESC
  `);
  const tokens: StoredAuthToken[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    tokens.push({
      id: String(row.id),
      userId: String(row.user_id),
      email: String(row.email),
      type: String(row.type) as StoredAuthToken['type'],
      tokenHash: String(row.token_hash),
      createdAt: String(row.created_at),
      expiresAt: String(row.expires_at),
      consumedAt: row.consumed_at ? String(row.consumed_at) : null
    });
  }
  stmt.free();
  return tokens;
}

export async function saveAuthTokenInDb(token: StoredAuthToken): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT INTO auth_tokens (id, user_id, email, type, token_hash, created_at, expires_at, consumed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [token.id, token.userId, token.email, token.type, token.tokenHash, token.createdAt, token.expiresAt, token.consumedAt ?? null]
  );
  persistDb(db);
}

export async function replaceActiveAuthTokensInDb(userId: string, type: string, token: StoredAuthToken): Promise<void> {
  const db = await getDb();
  db.run(
    'DELETE FROM auth_tokens WHERE user_id = ? AND type = ? AND consumed_at IS NULL AND expires_at > ?',
    [userId, type, new Date().toISOString()]
  );
  db.run(
    `INSERT INTO auth_tokens (id, user_id, email, type, token_hash, created_at, expires_at, consumed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [token.id, token.userId, token.email, token.type, token.tokenHash, token.createdAt, token.expiresAt, token.consumedAt ?? null]
  );
  persistDb(db);
}

export async function consumeAuthTokenInDb(tokenHash: string, expectedType: string): Promise<StoredAuthToken | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    SELECT id, user_id, email, type, token_hash, created_at, expires_at, consumed_at
    FROM auth_tokens
    WHERE token_hash = ? AND type = ? AND consumed_at IS NULL AND expires_at > ?
    LIMIT 1
  `);
  stmt.bind([tokenHash, expectedType, now]);
  const match = stmt.step()
    ? ({
        id: String(stmt.getAsObject().id),
        userId: String(stmt.getAsObject().user_id),
        email: String(stmt.getAsObject().email),
        type: String(stmt.getAsObject().type) as StoredAuthToken['type'],
        tokenHash: String(stmt.getAsObject().token_hash),
        createdAt: String(stmt.getAsObject().created_at),
        expiresAt: String(stmt.getAsObject().expires_at),
        consumedAt: stmt.getAsObject().consumed_at ? String(stmt.getAsObject().consumed_at) : null
      } as StoredAuthToken)
    : null;
  stmt.free();
  if (!match) return null;
  db.run('UPDATE auth_tokens SET consumed_at = ? WHERE id = ?', [now, match.id]);
  persistDb(db);
  return { ...match, consumedAt: now };
}

export async function pruneAuthTokensInDb(): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM auth_tokens WHERE consumed_at IS NOT NULL OR expires_at <= ?', [new Date().toISOString()]);
  persistDb(db);
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
  const db = await getDb();
  db.run(
    `INSERT INTO auth_audit_log (id, user_id, email, event_type, event_meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      event.userId ?? null,
      event.email ?? null,
      event.eventType,
      event.eventMeta ? JSON.stringify(event.eventMeta) : null,
      new Date().toISOString()
    ]
  );
  persistDb(db);
}

export async function listRecentAuthAuditEvents(limit = 100): Promise<AuthAuditEventRecord[]> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT id, user_id, email, event_type, event_meta, created_at
    FROM auth_audit_log
    ORDER BY created_at DESC
    LIMIT ?
  `);
  stmt.bind([limit]);
  const events: AuthAuditEventRecord[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    events.push({
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : null,
      email: row.email ? String(row.email) : null,
      eventType: String(row.event_type),
      eventMeta: row.event_meta ? String(row.event_meta) : null,
      createdAt: String(row.created_at)
    });
  }
  stmt.free();
  return events;
}
