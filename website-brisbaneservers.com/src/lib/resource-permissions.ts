import type { AuthUser } from '../utils/auth';
import type { Resource } from './resources-api';
import { isAdminRole } from './workspace-roles';

export type ResourceActor = Pick<AuthUser, 'id' | 'role'> | { id?: string; role?: string };

export type ResourceAction =
  | 'view'
  | 'edit'
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'unarchive'
  | 'improve'
  | 'delete'
  | 'restore';

export type ResourceActionPermissions = Record<ResourceAction, boolean> & {
  editReason?: string;
  deleteReason?: string;
};

export function isResourceOwner(user: ResourceActor, resource: Resource): boolean {
  return Boolean(user.id && resource.ownerId === user.id);
}

export function getResourceActionPermissions(
  user: ResourceActor | null | undefined,
  resource: Resource,
): ResourceActionPermissions {
  if (!user) {
    return {
      view: false,
      edit: false,
      publish: false,
      unpublish: false,
      archive: false,
      unarchive: false,
      improve: false,
      delete: false,
      restore: false,
      editReason: 'Sign in required.',
      deleteReason: 'Sign in required.',
    };
  }

  const admin = isAdminRole(user.role);
  const owner = isResourceOwner(user, resource);
  const starter = resource.isStarterBlock === true;
  const published = resource.status === 'published';
  const archived = resource.status === 'archived';
  const draft = resource.status === 'draft';
  const removed = Boolean(resource.portalRemovedAt);
  const canMutate = admin || owner;

  if (removed) {
    return {
      view: true,
      edit: admin,
      publish: false,
      unpublish: admin && published,
      archive: false,
      unarchive: false,
      improve: false,
      delete: false,
      restore: admin,
      editReason: admin ? undefined : 'Only admins can edit removed resources.',
      deleteReason: 'Use Restore to workspace or Unpublish on the live site.',
    };
  }

  if (starter) {
    return {
      view: true,
      edit: admin,
      publish: false,
      unpublish: false,
      archive: admin && !archived,
      unarchive: admin && archived,
      improve: false,
      delete: admin,
      restore: false,
      editReason: admin
        ? undefined
        : 'Starter blocks are read-only. Use “Create from starter block” on the dashboard.',
      deleteReason: admin ? undefined : 'Starter blocks cannot be deleted.',
    };
  }

  if (!canMutate && !admin) {
    return {
      view: false,
      edit: false,
      publish: false,
      unpublish: false,
      archive: false,
      unarchive: false,
      improve: false,
      delete: false,
      restore: false,
      editReason: 'You can only edit resources you own.',
      deleteReason: 'You can only delete resources you own.',
    };
  }

  return {
    view: true,
    edit: canMutate,
    publish: canMutate && draft,
    unpublish: canMutate && published,
    archive: canMutate && !archived,
    unarchive: canMutate && archived,
    /** Improve rewrites content — drafts/archived only for owners; admins may improve published. */
    improve: canMutate && (draft || archived || admin),
    delete: admin || (owner && !published),
    restore: false,
    editReason: canMutate ? undefined : 'You can only edit resources you own.',
    deleteReason:
      published && owner && !admin
        ? 'This resource is live on the website. Unpublish it first, then you can delete your copy.'
        : canMutate
          ? undefined
          : 'You can only delete resources you own.',
  };
}
