import type { AuthRole } from '../utils/auth';

const ROLE_RANK: Record<AuthRole, number> = {
  client: 1,
  viewer: 2,
  editor: 3,
  admin: 4,
  'super-admin': 5,
};

export function roleRank(role: AuthRole | string | undefined): number {
  return ROLE_RANK[role as AuthRole] ?? 0;
}

/** Full creator workspace (resources, profiles, etc.). */
export function hasWorkspaceAccess(user: {
  role?: AuthRole | string;
  workspaceEnabled?: boolean | null;
}): boolean {
  const rank = roleRank(user.role);
  if (rank >= ROLE_RANK.editor) return true;
  return Boolean(user.workspaceEnabled);
}

/** Admin console sidebar (growth, moderation, users). */
export function hasAdminConsoleAccess(user: { role?: AuthRole | string }): boolean {
  return roleRank(user.role) >= ROLE_RANK.admin;
}
