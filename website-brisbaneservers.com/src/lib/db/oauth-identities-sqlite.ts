import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getAuthSqliteDbFile } from '~/lib/storage-paths';
import type { OAuthProvider, StoredOAuthIdentity } from './oauth-identities';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type DatabaseInstance = InstanceType<
  Awaited<ReturnType<(typeof import('sql.js'))['default']>>['Database']
>;

let dbPromise: Promise<DatabaseInstance> | null = null;

function persistDb(db: DatabaseInstance): void {
  writeFileSync(getAuthSqliteDbFile(), Buffer.from(db.export()));
}

async function getDb(): Promise<DatabaseInstance> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const initSqlJs = (await import('sql.js')).default;
      const { locateSqlJsFile } = await import('./sql-js-locate');
      const SQL = await initSqlJs({ locateFile: locateSqlJsFile });
      mkdirSync(path.dirname(getAuthSqliteDbFile()), { recursive: true });
      const db = existsSync(getAuthSqliteDbFile())
        ? new SQL.Database(readFileSync(getAuthSqliteDbFile()))
        : new SQL.Database();
      db.run(`
        CREATE TABLE IF NOT EXISTS user_oauth_identities (
          provider TEXT NOT NULL,
          subject TEXT NOT NULL,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (provider, subject)
        );
        CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON user_oauth_identities(user_id);
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function findOAuthIdentitySqlite(
  provider: OAuthProvider,
  subject: string
): Promise<StoredOAuthIdentity | null> {
  const db = await getDb();
  const stmt = db.prepare(
    `SELECT provider, subject, user_id, email, created_at FROM user_oauth_identities WHERE provider = ? AND subject = ?`
  );
  stmt.bind([provider, subject]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();
  return {
    provider: String(row.provider) as OAuthProvider,
    subject: String(row.subject),
    userId: String(row.user_id),
    email: String(row.email),
    createdAt: String(row.created_at)
  };
}

export async function saveOAuthIdentitySqlite(identity: StoredOAuthIdentity): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT OR REPLACE INTO user_oauth_identities (provider, subject, user_id, email, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [identity.provider, identity.subject, identity.userId, identity.email, identity.createdAt]
  );
  persistDb(db);
}

export async function listOAuthIdentitiesForUserSqlite(userId: string): Promise<StoredOAuthIdentity[]> {
  const db = await getDb();
  const stmt = db.prepare(
    `SELECT provider, subject, user_id, email, created_at FROM user_oauth_identities WHERE user_id = ?`
  );
  stmt.bind([userId]);
  const results: StoredOAuthIdentity[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    results.push({
      provider: String(row.provider) as OAuthProvider,
      subject: String(row.subject),
      userId: String(row.user_id),
      email: String(row.email),
      createdAt: String(row.created_at)
    });
  }
  stmt.free();
  return results;
}
