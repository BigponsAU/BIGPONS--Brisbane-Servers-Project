/**
 * User store (JSON-backed). Migrate to SQLite/Postgres when needed.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { AuthRole } from '../../utils/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../');
const USERS_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'users.json');

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: AuthRole;
  createdAt: string;
}

async function ensureFile(): Promise<void> {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
  }
}

export async function loadUsers(): Promise<StoredUser[]> {
  await ensureFile();
  const data = await fs.readFile(USERS_FILE, 'utf-8');
  try {
    const arr = JSON.parse(data);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveUsers(users: StoredUser[]): Promise<void> {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const users = await loadUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const users = await loadUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function createUser(
  email: string,
  passwordHash: string,
  role: AuthRole = 'client'
): Promise<StoredUser> {
  const users = await loadUsers();
  const normalized = email.trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === normalized)) {
    throw new Error('EMAIL_IN_USE');
  }
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const user: StoredUser = {
    id,
    email: normalized,
    passwordHash,
    role,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  await saveUsers(users);
  return user;
}
