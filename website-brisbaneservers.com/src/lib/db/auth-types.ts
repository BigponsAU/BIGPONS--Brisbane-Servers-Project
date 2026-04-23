/** Shared auth token shapes (avoids circular imports between auth-tokens and auth-db). */

export type AuthTokenType = 'email-verify' | 'password-reset';

export interface StoredAuthToken {
  id: string;
  userId: string;
  email: string;
  type: AuthTokenType;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string | null;
}
