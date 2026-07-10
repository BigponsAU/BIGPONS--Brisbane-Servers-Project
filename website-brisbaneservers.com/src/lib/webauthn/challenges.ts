/**
 * Short-lived WebAuthn / OAuth state challenges.
 * Stored in Postgres so Cloudflare Worker isolates can share them.
 */
import { getSharedPool } from '~/lib/db/pg-pool';

export interface StoredChallenge {
  challenge: string;
  userId?: string;
  email?: string;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const pool = getSharedPool();
    schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS webauthn_challenges (
          id TEXT PRIMARY KEY NOT NULL,
          challenge TEXT NOT NULL,
          user_id TEXT,
          email TEXT,
          expires_at TIMESTAMPTZ NOT NULL
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at
          ON webauthn_challenges(expires_at)
      `);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

export async function saveChallenge(
  id: string,
  data: Omit<StoredChallenge, 'expiresAt'>
): Promise<void> {
  await ensureSchema();
  const pool = getSharedPool();
  const expiresAt = new Date(Date.now() + TTL_MS);
  await pool.query(
    `INSERT INTO webauthn_challenges (id, challenge, user_id, email, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       challenge = EXCLUDED.challenge,
       user_id = EXCLUDED.user_id,
       email = EXCLUDED.email,
       expires_at = EXCLUDED.expires_at`,
    [id, data.challenge, data.userId ?? null, data.email ?? null, expiresAt.toISOString()]
  );
}

export async function consumeChallenge(id: string): Promise<StoredChallenge | null> {
  await ensureSchema();
  const pool = getSharedPool();
  const { rows } = await pool.query(
    `DELETE FROM webauthn_challenges
     WHERE id = $1
     RETURNING challenge, user_id, email, expires_at`,
    [id]
  );
  const row = rows[0] as
    | { challenge: string; user_id: string | null; email: string | null; expires_at: string | Date }
    | undefined;
  if (!row) return null;

  const expiresAt =
    row.expires_at instanceof Date ? row.expires_at.getTime() : new Date(row.expires_at).getTime();
  if (Date.now() > expiresAt) return null;

  return {
    challenge: row.challenge,
    userId: row.user_id ?? undefined,
    email: row.email ?? undefined,
    expiresAt,
  };
}

export async function pruneChallenges(): Promise<void> {
  await ensureSchema();
  const pool = getSharedPool();
  await pool.query(`DELETE FROM webauthn_challenges WHERE expires_at <= NOW()`);
}
