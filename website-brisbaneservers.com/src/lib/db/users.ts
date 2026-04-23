import type { AuthRole } from '../../utils/auth';
import {
  createUserInDb,
  deleteUserInDb,
  findUserByEmailInDb,
  findUserByIdInDb,
  listUsersFromDb,
  updateUserPasswordInDb,
  updateUserVerificationInDb
} from './auth-db';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: AuthRole;
  createdAt: string;
  emailVerifiedAt?: string | null;
  updatedAt?: string;
}

export async function loadUsers(): Promise<StoredUser[]> {
  return listUsersFromDb();
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  return findUserByEmailInDb(email);
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  return findUserByIdInDb(id);
}

export async function createUser(
  email: string,
  passwordHash: string,
  role: AuthRole = 'client'
): Promise<StoredUser> {
  const normalized = email.trim().toLowerCase();
  const existing = await findUserByEmailInDb(normalized);
  if (existing) {
    throw new Error('EMAIL_IN_USE');
  }
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const user: StoredUser = {
    id,
    email: normalized,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
    emailVerifiedAt: null,
    updatedAt: new Date().toISOString()
  };
  await createUserInDb(user);
  return user;
}

export function isUserEmailVerified(user: StoredUser): boolean {
  // Legacy users created before verification support are treated as verified.
  if (typeof user.emailVerifiedAt === 'undefined') {
    return true;
  }
  return Boolean(user.emailVerifiedAt);
}

export async function markUserEmailVerified(userId: string): Promise<StoredUser | null> {
  const user = await findUserByIdInDb(userId);
  if (!user) return null;
  await updateUserVerificationInDb(userId, new Date().toISOString());
  user.emailVerifiedAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();
  return user;
}

export async function updateUserPasswordHash(userId: string, passwordHash: string): Promise<StoredUser | null> {
  const user = await findUserByIdInDb(userId);
  if (!user) return null;
  await updateUserPasswordInDb(userId, passwordHash);
  user.passwordHash = passwordHash;
  user.updatedAt = new Date().toISOString();
  return user;
}

export async function deleteUserById(userId: string): Promise<void> {
  await deleteUserInDb(userId);
}
