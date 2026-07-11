export type AuthRole = 'super-admin' | 'admin' | 'editor' | 'viewer' | 'client';

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  emailVerified?: boolean;
  workspaceEnabled?: boolean;
}

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: AuthRole;
  createdAt: string;
  emailVerifiedAt?: string | null;
  updatedAt?: string;
  workspaceEnabled?: boolean;
  /** Soft-removed accounts cannot sign in until restored. */
  removedAt?: string | null;
  removedBy?: string | null;
  removalReason?: string | null;
}

export type AuthTokenType = 'email-verify' | 'password-reset';

export interface StoredAuthToken {
  id: string;
  userId: string;
  email: string;
  type: AuthTokenType;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
}
