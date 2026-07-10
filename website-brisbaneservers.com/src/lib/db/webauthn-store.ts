/**
 * WebAuthn credential persistence — Postgres only (Neon via Hyperdrive on edge).
 * Credentials are bound by user_id and email so account re-seeds cannot orphan passkeys.
 */
import type { Pool } from 'pg';
import { getSharedPool } from './pg-pool';
import type { StoredWebAuthnCredential } from './webauthn-types';

let pgSchemaReady: Promise<void> | null = null;

function getPgPool(): Pool {
  return getSharedPool();
}

async function ensurePgSchema(pool: Pool): Promise<void> {
  if (!pgSchemaReady) {
    pgSchemaReady = (async () => {
      await pool.query(`
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
          last_used_at TEXT,
          email TEXT
        )
      `);
      await pool.query(`
        ALTER TABLE webauthn_credentials ADD COLUMN IF NOT EXISTS email TEXT
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials(user_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON webauthn_credentials(credential_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_webauthn_email ON webauthn_credentials ((lower(email)))
      `);
      // Backfill email from the owning user when possible.
      await pool.query(`
        UPDATE webauthn_credentials c
        SET email = u.email
        FROM users u
        WHERE c.user_id = u.id
          AND (c.email IS NULL OR btrim(c.email) = '')
      `);
    })().catch((err) => {
      pgSchemaReady = null;
      throw err;
    });
  }
  await pgSchemaReady;
}

function mapRow(row: {
  id: string;
  user_id: string;
  email?: string | null;
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
    email: row.email ?? null,
    credentialId: row.credential_id,
    publicKey: row.public_key,
    counter: Number(row.counter),
    transports: JSON.parse(row.transports || '[]') as string[],
    deviceType: row.device_type,
    backedUp: Boolean(row.backed_up),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

/** Rebind any credentials for this email onto the canonical user id. */
export async function rebindCredentialsToUser(userId: string, email: string): Promise<number> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;
  const pool = getPgPool();
  await ensurePgSchema(pool);
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE webauthn_credentials
     SET user_id = $1, email = $2
     WHERE lower(email) = $2 AND user_id <> $1
     RETURNING id`,
    [userId, normalized]
  );
  return rows.length;
}

export async function saveWebAuthnCredential(
  input: Omit<StoredWebAuthnCredential, 'id' | 'createdAt' | 'lastUsedAt'>
): Promise<StoredWebAuthnCredential> {
  const email = input.email?.trim().toLowerCase() || null;
  const record: StoredWebAuthnCredential = {
    ...input,
    email,
    id: `webauthn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };

  const pool = getPgPool();
  await ensurePgSchema(pool);
  await pool.query(
    `INSERT INTO webauthn_credentials
       (id, user_id, credential_id, public_key, counter, transports, device_type, backed_up, created_at, last_used_at, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (credential_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       public_key = EXCLUDED.public_key,
       counter = EXCLUDED.counter,
       transports = EXCLUDED.transports,
       device_type = EXCLUDED.device_type,
       backed_up = EXCLUDED.backed_up,
       email = COALESCE(EXCLUDED.email, webauthn_credentials.email)`,
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
      record.lastUsedAt,
      record.email,
    ]
  );
  return record;
}

export async function findCredentialById(credentialId: string): Promise<StoredWebAuthnCredential | null> {
  const pool = getPgPool();
  await ensurePgSchema(pool);
  const { rows } = await pool.query(`SELECT * FROM webauthn_credentials WHERE credential_id = $1 LIMIT 1`, [
    credentialId,
  ]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listCredentialsForUser(userId: string): Promise<StoredWebAuthnCredential[]> {
  const pool = getPgPool();
  await ensurePgSchema(pool);
  const { rows } = await pool.query(
    `SELECT * FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId]
  );
  return rows.map(mapRow);
}

/**
 * Canonical account lookup: rebind by email, then list for the live user id.
 */
export async function listCredentialsForAccount(
  userId: string,
  email: string
): Promise<StoredWebAuthnCredential[]> {
  await rebindCredentialsToUser(userId, email);
  return listCredentialsForUser(userId);
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  const now = new Date().toISOString();
  const pool = getPgPool();
  await ensurePgSchema(pool);
  await pool.query(`UPDATE webauthn_credentials SET counter = $1, last_used_at = $2 WHERE credential_id = $3`, [
    counter,
    now,
    credentialId,
  ]);
}

export async function deleteCredentialForUser(userId: string, credentialDbId: string): Promise<boolean> {
  const pool = getPgPool();
  await ensurePgSchema(pool);
  const { rows } = await pool.query(
    `DELETE FROM webauthn_credentials WHERE id = $1 AND user_id = $2 RETURNING id`,
    [credentialDbId, userId]
  );
  return rows.length > 0;
}
