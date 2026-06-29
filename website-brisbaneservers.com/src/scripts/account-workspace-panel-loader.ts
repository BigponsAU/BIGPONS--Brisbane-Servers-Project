// @ts-nocheck
/**
 * Lazy-loads heavy panel modules (profiles, resources) as separate JS chunks.
 * Stubs on `window` are registered at boot so inline onclick handlers work before first visit.
 */
import type { ProfilesWorkspaceDeps } from './account-workspace-profiles';
import type { ResourcesWorkspaceDeps } from './account-workspace-resources';

type ProfilesApi = {
  loadProfiles: () => Promise<void>;
  createBaseProfile: () => Promise<void>;
};

type ResourcesApi = {
  loadResources: (options?: { revealResourceId?: string }) => Promise<void>;
  selectResource: (resourceId: string) => void;
};

let profilesApi: ProfilesApi | null = null;
let profilesLoadPromise: Promise<ProfilesApi> | null = null;

let resourcesApi: ResourcesApi | null = null;
let resourcesLoadPromise: Promise<ResourcesApi> | null = null;

export function ensureProfilesPanel(deps: ProfilesWorkspaceDeps): Promise<ProfilesApi> {
  if (profilesApi) return Promise.resolve(profilesApi);
  if (!profilesLoadPromise) {
    profilesLoadPromise = import('./account-workspace-profiles').then((mod) => {
      profilesApi = mod.registerProfilesWorkspace(deps);
      return profilesApi;
    });
  }
  return profilesLoadPromise;
}

export function ensureResourcesPanel(deps: ResourcesWorkspaceDeps): Promise<ResourcesApi> {
  if (resourcesApi) return Promise.resolve(resourcesApi);
  if (!resourcesLoadPromise) {
    resourcesLoadPromise = import('./account-workspace-resources').then((mod) => {
      resourcesApi = mod.registerResourcesWorkspace(deps);
      return resourcesApi;
    });
  }
  return resourcesLoadPromise;
}

/** Register global stubs that lazy-load the real panel implementation on first use. */
export function registerPanelLoaderStubs(
  profilesDeps: ProfilesWorkspaceDeps,
  resourcesDeps: ResourcesWorkspaceDeps,
): void {
  const w = window as unknown as Record<string, unknown>;

  const profileFns = [
    'loadProfiles',
    'createBaseProfile',
    'filterProfiles',
    'viewProfile',
    'archiveProfile',
    'unarchiveProfile',
    'setDefaultProfile',
    'analyzeProfileDuplicates',
    'deduplicateProfiles',
    'exportProfiles',
    'selectProfile',
    'useProfileForGenerate',
  ] as const;

  for (const name of profileFns) {
    w[name] = (...args: unknown[]) => {
      void ensureProfilesPanel(profilesDeps).then(() => {
        const fn = (window as unknown as Record<string, unknown>)[name];
        if (typeof fn === 'function' && fn !== w[name]) {
          (fn as (...a: unknown[]) => unknown)(...args);
        }
      });
    };
  }

  const resourceFns = [
    'loadResources',
    'selectResource',
    'viewResource',
    'editResource',
    'publishResource',
    'unpublishResource',
    'archiveResource',
    'unarchiveResource',
    'improveResource',
    'deleteResource',
    'closeViewModal',
    'closeEditModal',
    'clearFilters',
    'toggleResourceView',
    'toggleSection',
    'toggleTreeNode',
    'handleTreeNodeKeydown',
    'handleTreeResourceKeydown',
    'closeResourceDetail',
    'filterTree',
    'filterTreeByStatus',
    'filterByStatus',
    'focusResourceCreationSection',
    'updateBulkActions',
    'clearSelection',
    'bulkPublish',
    'bulkUnpublish',
    'bulkDelete',
    'previewResource',
    'cancelDetailEdit',
    'restoreResource',
    'closePreviewModal',
  ] as const;

  for (const name of resourceFns) {
    w[name] = (...args: unknown[]) => {
      void ensureResourcesPanel(resourcesDeps).then(() => {
        const fn = (window as unknown as Record<string, unknown>)[name];
        if (typeof fn === 'function' && fn !== w[name]) {
          (fn as (...a: unknown[]) => unknown)(...args);
        }
      });
    };
  }
}

export function getLoadedResourcesApi(): ResourcesApi | null {
  return resourcesApi;
}

export function getLoadedProfilesApi(): ProfilesApi | null {
  return profilesApi;
}
