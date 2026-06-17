import type { OAuthProvider, StoredOAuthIdentity } from './oauth-identity-types';
import { getSharedPool } from './pg-pool';

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const pool = getSharedPool();
    schemaReady = pool
      .query(`
      CREATE TABLE IF NOT EXISTS user_oauth_identities (
        provider TEXT NOT NULL,
        subject TEXT NOT NULL,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (provider, subject)
      );
      CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON user_oauth_identities(user_id);
    `)
      .then(() =>
        pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`).catch(() => undefined)
      )
      .then(() => undefined);
  }
  await schemaReady;
}

export async function findOAuthIdentityPg(
  provider: OAuthProvider,
  subject: string
): Promise<StoredOAuthIdentity | null> {
  const pool = getSharedPool();
  await ensureSchema();
  const { rows } = await pool.query<{
    provider: string;
    subject: string;
    user_id: string;
    email: string;
    created_at: string;
  }>(
    `SELECT provider, subject, user_id, email, created_at FROM user_oauth_identities WHERE provider = $1 AND subject = $2`,
    [provider, subject]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    provider: row.provider as OAuthProvider,
    subject: row.subject,
    userId: row.user_id,
    email: row.email,
    createdAt: row.created_at
  };
}

export async function saveOAuthIdentityPg(identity: StoredOAuthIdentity): Promise<void> {
  const pool = getSharedPool();
  await ensureSchema();
  await pool.query(
    `INSERT INTO user_oauth_identities (provider, subject, user_id, email, created_at)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (provider, subject) DO UPDATE SET user_id = EXCLUDED.user_id, email = EXCLUDED.email`,
    [identity.provider, identity.subject, identity.userId, identity.email, identity.createdAt]
  );
}

export async function listOAuthIdentitiesForUserPg(userId: string): Promise<StoredOAuthIdentity[]> {
  const pool = getSharedPool();
  await ensureSchema();
  const { rows } = await pool.query<{
    provider: string;
    subject: string;
    user_id: string;
    email: string;
    created_at: string;
  }>(`SELECT provider, subject, user_id, email, created_at FROM user_oauth_identities WHERE user_id = $1`, [userId]);
  return rows.map((row) => ({
    provider: row.provider as OAuthProvider,
    subject: row.subject,
    userId: row.user_id,
    email: row.email,
    createdAt: row.created_at
  }));
}
