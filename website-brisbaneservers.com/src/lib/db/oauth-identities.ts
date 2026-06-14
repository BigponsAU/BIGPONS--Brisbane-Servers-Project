/**
 * OAuth provider links (Google, etc.) — one row per provider account per user.
 */
import { isEdgeWorkerRuntime } from './edge-hyperdrive-sql';
import { usePostgres } from './pg-pool';

export type OAuthProvider = 'google';

export interface StoredOAuthIdentity {
  provider: OAuthProvider;
  subject: string;
  userId: string;
  email: string;
  createdAt: string;
}

function authBackend(): 'postgres' | 'sqlite' {
  if (usePostgres()) return 'postgres';
  if (isEdgeWorkerRuntime()) {
    throw new Error('Edge auth database is not configured (DATABASE_URL missing)');
  }
  return 'sqlite';
}

export async function findOAuthIdentity(
  provider: OAuthProvider,
  subject: string
): Promise<StoredOAuthIdentity | null> {
  if (authBackend() === 'postgres') {
    const { findOAuthIdentityPg } = await import('./oauth-identities-pg');
    return findOAuthIdentityPg(provider, subject);
  }
  const { findOAuthIdentitySqlite } = await import('./oauth-identities-sqlite');
  return findOAuthIdentitySqlite(provider, subject);
}

export async function saveOAuthIdentity(identity: StoredOAuthIdentity): Promise<void> {
  if (authBackend() === 'postgres') {
    const { saveOAuthIdentityPg } = await import('./oauth-identities-pg');
    return saveOAuthIdentityPg(identity);
  }
  const { saveOAuthIdentitySqlite } = await import('./oauth-identities-sqlite');
  return saveOAuthIdentitySqlite(identity);
}

export async function listOAuthIdentitiesForUser(userId: string): Promise<StoredOAuthIdentity[]> {
  if (authBackend() === 'postgres') {
    const { listOAuthIdentitiesForUserPg } = await import('./oauth-identities-pg');
    return listOAuthIdentitiesForUserPg(userId);
  }
  const { listOAuthIdentitiesForUserSqlite } = await import('./oauth-identities-sqlite');
  return listOAuthIdentitiesForUserSqlite(userId);
}
