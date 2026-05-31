import type { AuthUser } from '../utils/auth';
import type { Resource } from './resources-api';

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

export function filterResourcesForUser(user: AuthUser, resources: Resource[]): Resource[] {
  if (user.role === 'super-admin' || user.role === 'admin') {
    return resources;
  }
  return resources.filter((resource) => canAccessResource(user, resource));
}
