import * as crypto from 'crypto';
import {
  consumeAuthTokenInDb,
  listAuthTokensFromDb,
  pruneAuthTokensInDb,
  replaceActiveAuthTokensInDb
} from './auth-db';
import type { AuthTokenType, StoredAuthToken } from './auth-types';

export type { AuthTokenType, StoredAuthToken } from './auth-types';

export async function loadAuthTokens(): Promise<StoredAuthToken[]> {
  return listAuthTokensFromDb();
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createAuthToken(
  userId: string,
  email: string,
  type: AuthTokenType,
  ttlMs: number
): Promise<{ token: string; record: StoredAuthToken }> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const record: StoredAuthToken = {
    id: `authtok-${now}-${Math.random().toString(36).slice(2, 9)}`,
    userId,
    email,
    type,
    tokenHash: hashToken(rawToken),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    consumedAt: null
  };
  await replaceActiveAuthTokensInDb(userId, type, record);
  return { token: rawToken, record };
}

export async function consumeAuthToken(
  rawToken: string,
  expectedType: AuthTokenType
): Promise<StoredAuthToken | null> {
  const tokenHash = hashToken(rawToken);
  return consumeAuthTokenInDb(tokenHash, expectedType);
}

export async function pruneExpiredAuthTokens(): Promise<void> {
  await pruneAuthTokensInDb();
}
