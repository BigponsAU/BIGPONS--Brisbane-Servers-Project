/** Shared role ordering for workspace nav and capability checks (client + server). */
export const WORKSPACE_ROLE_RANK: Record<string, number> = {
  client: 1,
  viewer: 2,
  editor: 3,
  admin: 4,
  'super-admin': 5,
};

export type WorkspaceMinRole = 'client' | 'viewer' | 'editor' | 'admin';

export function hasWorkspaceCapability(
  user: { role?: string } | null | undefined,
  minRole: WorkspaceMinRole,
): boolean {
  const current = WORKSPACE_ROLE_RANK[user?.role || 'client'] ?? 0;
  return current >= WORKSPACE_ROLE_RANK[minRole];
}

export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'super-admin';
}
