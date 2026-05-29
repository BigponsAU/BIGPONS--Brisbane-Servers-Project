import * as crypto from 'crypto';
import { hashPassword, type AuthRole } from '../utils/auth';
import {
  createUserInDb,
  findUserByEmailInDb,
  updateUserPasswordInDb,
  updateUserRoleInDb,
  updateUserVerificationInDb
} from './db/auth-db';
import { sendAdminCredentialsEmail } from './auth-flows';

export interface ProvisionSuperAdminOptions {
  email: string;
  /** When omitted, a secure random password is generated. */
  password?: string;
  role?: AuthRole;
  sendEmail?: boolean;
  request?: Request;
}

export interface ProvisionSuperAdminResult {
  email: string;
  role: AuthRole;
  created: boolean;
  upgraded: boolean;
  passwordGenerated: boolean;
  password: string;
  emailSent: boolean;
  emailError?: string;
}

function generatePassword(): string {
  const raw = crypto.randomBytes(18).toString('base64url');
  return `Bs-${raw}`;
}

export async function provisionSuperAdmin(
  options: ProvisionSuperAdminOptions
): Promise<ProvisionSuperAdminResult> {
  const email = options.email.trim().toLowerCase();
  const role = options.role ?? 'super-admin';
  const passwordGenerated = !options.password;
  const password = options.password ?? generatePassword();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);

  let created = false;
  let upgraded = false;

  const existing = await findUserByEmailInDb(email);
  if (existing) {
    await updateUserPasswordInDb(existing.id, passwordHash);
    if (existing.role !== role) {
      await updateUserRoleInDb(existing.id, role);
      upgraded = true;
    }
    if (!existing.emailVerifiedAt) {
      await updateUserVerificationInDb(existing.id, now);
      upgraded = true;
    }
  } else {
    await createUserInDb({
      id: `user-${crypto.randomUUID()}`,
      email,
      passwordHash,
      role,
      createdAt: now,
      emailVerifiedAt: now,
      updatedAt: now
    });
    created = true;
  }

  let emailSent = false;
  let emailError: string | undefined;
  if (options.sendEmail !== false) {
    try {
      await sendAdminCredentialsEmail(options.request, { email, password, role });
      emailSent = true;
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Failed to send credentials email';
    }
  }

  return {
    email,
    role,
    created,
    upgraded: upgraded || created,
    passwordGenerated,
    password,
    emailSent,
    emailError
  };
}
