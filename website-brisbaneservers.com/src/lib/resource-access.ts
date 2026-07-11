import type { AuthUser } from '../utils/auth';
import type { Resource } from './resources-api';
import { isBinnedResource, isVisibleInPortalWorkspace } from './resource-types';
import { isAdminRole } from './workspace-roles';

export type PortalResourceFilterOptions = {
  /** Admin: include soft-removed (`portalRemovedAt`) rows in the list */
  includeRemoved?: boolean;
  /** Admin: only soft-removed rows */
  removedOnly?: boolean;
  /** Include binned draft rows (`binnedAt`) in the list */
  includeBinned?: boolean;
  /** Only binned draft rows */
  binnedOnly?: boolean;
};

/** Non-admins: starter blocks + resources they own. Legacy unowned resources are admin-only. */
export function canAccessResource(user: AuthUser, resource: Resource): boolean {
  if (user.role === 'super-admin' || user.role === 'admin') {
    return true;
  }
  if (resource.isStarterBlock === true) {
    return true;
  }
  return resource.ownerId === user.id;
}

export function filterResourcesForUser(
  user: AuthUser,
  resources: Resource[],
  options: PortalResourceFilterOptions = {},
): Resource[] {
  const admin = isAdminRole(user.role);
  const includeRemoved = admin && options.includeRemoved === true;
  const removedOnly = admin && options.removedOnly === true;
  const includeBinned = options.includeBinned === true;
  const binnedOnly = options.binnedOnly === true;

  let visible = resources;
  if (binnedOnly) {
    visible = resources.filter(isBinnedResource);
  } else if (removedOnly) {
    visible = resources.filter((r) => Boolean(r.portalRemovedAt));
  } else if (!includeRemoved && !includeBinned) {
    visible = resources.filter(isVisibleInPortalWorkspace);
  } else if (!includeRemoved) {
    visible = resources.filter((r) => !r.portalRemovedAt);
  } else if (!includeBinned) {
    visible = resources.filter((r) => !r.binnedAt);
  }

  if (admin) {
    return visible;
  }
  return visible.filter((resource) => canAccessResource(user, resource));
}
