/**
 * Auth persistence — Postgres only (Neon via Hyperdrive on the edge worker).
 */

export type { AuthAuditEventRecord } from './auth-pg';
export { usePostgres } from './pg-pool';
export {
  listUsersFromDb,
  findUserByEmailInDb,
  findUserByIdInDb,
  createUserInDb,
  updateUserVerificationInDb,
  updateUserPasswordInDb,
  updateUserRoleInDb,
  updateUserWorkspaceEnabledInDb,
  deleteUserInDb,
  listSessionsFromDb,
  createSessionInDb,
  getSessionUserFromDb,
  deleteSessionInDb,
  deleteSessionsForUserInDb,
  listAuthTokensFromDb,
  saveAuthTokenInDb,
  replaceActiveAuthTokensInDb,
  consumeAuthTokenInDb,
  pruneAuthTokensInDb,
  recordAuthAuditEvent,
  listRecentAuthAuditEvents,
} from './auth-pg';
