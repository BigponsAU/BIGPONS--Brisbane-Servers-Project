export type OAuthProvider = 'google';

export interface StoredOAuthIdentity {
  provider: OAuthProvider;
  subject: string;
  userId: string;
  email: string;
  createdAt: string;
}
