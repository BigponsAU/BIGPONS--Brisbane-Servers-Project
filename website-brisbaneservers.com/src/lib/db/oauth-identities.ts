/**
 * OAuth provider links (Google, etc.) — Postgres only.
 */
export type { OAuthProvider, StoredOAuthIdentity } from './oauth-identity-types';
export {
  findOAuthIdentityPg as findOAuthIdentity,
  saveOAuthIdentityPg as saveOAuthIdentity,
  listOAuthIdentitiesForUserPg as listOAuthIdentitiesForUser,
} from './oauth-identities-pg';
