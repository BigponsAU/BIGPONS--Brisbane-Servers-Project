/**
 * WebAuthn credential persistence (Postgres when DATABASE_URL set, else SQLite).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { getRuntimeEnv } from '~/utils/runtime-env';
import { getAuthSqliteDbFile } from '~/lib/storage-paths';
import type { StoredWebAuthnCredential } from './webauthn-types';

type SqlJsModule = typeof import('sql.js');
type DatabaseInstance = InstanceType<Awaited<ReturnType<SqlJsModule['default']>>['Database']>;

let pgPool: Pool | null = null;
let pgSchemaReady: Promise<void> | null = null;
let sqliteDbPromise: Promise<DatabaseInstance> | null = null;

function usePostgres(): boolean {
  return Boolean(getRuntimeEnv('DATABASE_URL'));
}

function getPgPool(): Pool {
  if (!pgPool) {
    const connectionString = getRuntimeEnv('DATABASE_URL');
    if (!connectionString) throw new Error('DATABASE_URL required');
    pgPool = new Pool({ connectionString, max: 10 });
  }
  return pgPool;
}

async function ensurePgSchema(pool: Pool): Promise<void> {
  if (!pgSchemaReady) {
    pgSchemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS webauthn_credentials (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        transports TEXT NOT NULL DEFAULT '[]',
        device_type TEXT NOT NULL DEFAULT 'singleDevice',
        backed_up BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials(user_id);
      CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON webauthn_credentials(credential_id);
    `).then(() => undefined);
  }
  await pgSchemaReady;
}

async function getSqliteDb(): Promise<DatabaseInstance> {
  if (!sqliteDbPromise) {
    sqliteDbPromise = (async () => {
      const initSqlJs = (await import('sql.js')).default;
      const { locateSqlJsFile } = await import('./sql-js-locate');
      const SQL = await initSqlJs({ locateFile: locateSqlJsFile });
      mkdirSync(path.dirname(getAuthSqliteDbFile()), { recursive: true });
      const db = existsSync(getAuthSqliteDbFile())
        ? new SQL.Database(readFileSync(getAuthSqliteDbFile()))
        : new SQL.Database();
      db.run(`
        CREATE TABLE IF NOT EXISTS webauthn_credentials (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          credential_id TEXT NOT NULL UNIQUE,
          public_key TEXT NOT NULL,
          counter INTEGER NOT NULL DEFAULT 0,
          transports TEXT NOT NULL DEFAULT '[]',
          device_type TEXT NOT NULL DEFAULT 'singleDevice',
          backed_up INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          last_used_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials(user_id);
        CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON webauthn_credentials(credential_id);
      `);
      return db;
    })();
  }
  return sqliteDbPromise;
}

function persistSqlite(db: DatabaseInstance): void {
  writeFileSync(getAuthSqliteDbFile(), Buffer.from(db.export()));
}

function mapRow(row: {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number | string;
  transports: string;
  device_type: string;
  backed_up: boolean | number;
  created_at: string;
  last_used_at: string | null;
}): StoredWebAuthnCredential {
  return {
    id: row.id,
    userId: row.user_id,
    credentialId: row.credential_id,
    publicKey: row.public_key,
    counter: Number(row.counter),
    transports: JSON.parse(row.transports || '[]') as string[],
    deviceType: row.device_type,
    backedUp: Boolean(row.backed_up),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at
  };
}

export async function saveWebAuthnCredential(
  input: Omit<StoredWebAuthnCredential, 'id' | 'createdAt' | 'lastUsedAt'>
): Promise<StoredWebAuthnCredential> {
  const record: StoredWebAuthnCredential = {
    ...input,
    id: `webauthn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    lastUsedAt: null
  };

  if (usePostgres()) {
    const pool = getPgPool();
    await ensurePgSchema(pool);
    await pool.query(
      `INSERT INTO webauthn_credentials
       (id, user_id, credential_id, public_key, counter, transports, device_type, backed_up, created_at, last_used_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        record.id,
        record.userId,
        record.credentialId,
        record.publicKey,
        record.counter,
        JSON.stringify(record.transports),
        record.deviceType,
        record.backedUp,
        record.createdAt,
        record.lastUsedAt
      ]
    );
    return record;
  }

  const db = await getSqliteDb();
  db.run(
    `INSERT INTO webauthn_credentials
     (id, user_id, credential_id, public_key, counter, transports, device_type, backed_up, created_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.userId,
      record.credentialId,
      record.publicKey,
      record.counter,
      JSON.stringify(record.transports),
      record.deviceType,
      record.backedUp ? 1 : 0,
      record.createdAt,
      record.lastUsedAt
    ]
  );
  persistSqlite(db);
  return record;
}

export async function findCredentialById(credentialId: string): Promise<StoredWebAuthnCredential | null> {
  if (usePostgres()) {
    const pool = getPgPool();
    await ensurePgSchema(pool);
    const { rows } = await pool.query(
      `SELECT * FROM webauthn_credentials WHERE credential_id = $1 LIMIT 1`,
      [credentialId]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  const db = await getSqliteDb();
  const stmt = db.prepare(`SELECT * FROM webauthn_credentials WHERE credential_id = ? LIMIT 1`);
  stmt.bind([credentialId]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();
  return mapRow({
    id: String(row.id),
    user_id: String(row.user_id),
    credential_id: String(row.credential_id),
    public_key: String(row.public_key),
    counter: Number(row.counter),
    transports: String(row.transports),
    device_type: String(row.device_type),
    backed_up: Number(row.backed_up),
    created_at: String(row.created_at),
    last_used_at: row.last_used_at ? String(row.last_used_at) : null
  });
}

export async function listCredentialsForUser(userId: string): Promise<StoredWebAuthnCredential[]> {
  if (usePostgres()) {
    const pool = getPgPool();
    await ensurePgSchema(pool);
    const { rows } = await pool.query(
      `SELECT * FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );
    return rows.map(mapRow);
  }

  const db = await getSqliteDb();
  const stmt = db.prepare(`SELECT * FROM webauthn_credentials WHERE user_id = ? ORDER BY created_at ASC`);
  stmt.bind([userId]);
  const results: StoredWebAuthnCredential[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    results.push(mapRow({
      id: String(row.id),
      user_id: String(row.user_id),
      credential_id: String(row.credential_id),
      public_key: String(row.public_key),
      counter: Number(row.counter),
      transports: String(row.transports),
      device_type: String(row.device_type),
      backed_up: Number(row.backed_up),
      created_at: String(row.created_at),
      last_used_at: row.last_used_at ? String(row.last_used_at) : null
    }));
  }
  stmt.free();
  return results;
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  const now = new Date().toISOString();
  if (usePostgres()) {
    const pool = getPgPool();
    await ensurePgSchema(pool);
    await pool.query(
      `UPDATE webauthn_credentials SET counter = $1, last_used_at = $2 WHERE credential_id = $3`,
      [counter, now, credentialId]
    );
    return;
  }

  const db = await getSqliteDb();
  db.run(
    `UPDATE webauthn_credentials SET counter = ?, last_used_at = ? WHERE credential_id = ?`,
    [counter, now, credentialId]
  );
  persistSqlite(db);
}

export async function deleteCredentialForUser(userId: string, credentialDbId: string): Promise<boolean> {
  if (usePostgres()) {
    const pool = getPgPool();
    await ensurePgSchema(pool);
    const result = await pool.query(
      `DELETE FROM webauthn_credentials WHERE id = $1 AND user_id = $2`,
      [credentialDbId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  const db = await getSqliteDb();
  db.run(`DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?`, [credentialDbId, userId]);
  persistSqlite(db);
  return true;
}
