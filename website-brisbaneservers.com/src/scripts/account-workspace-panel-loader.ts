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

function invokeAfterReplace(
  stub: (...args: unknown[]) => void,
  name: string,
  args: unknown[],
): void {
  const fn = (window as unknown as Record<string, unknown>)[name];
  // Compare against the captured stub — not window[name], which is already the real fn after load.
  if (typeof fn === 'function' && fn !== stub) {
    (fn as (...a: unknown[]) => unknown)(...args);
  }
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
    const stub = (...args: unknown[]) => {
      void ensureProfilesPanel(profilesDeps).then((api) => {
        if (name === 'loadProfiles') {
          void api.loadProfiles();
          return;
        }
        if (name === 'createBaseProfile') {
          void api.createBaseProfile();
          return;
        }
        invokeAfterReplace(stub, name, args);
      });
    };
    w[name] = stub;
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
    const stub = (...args: unknown[]) => {
      void ensureResourcesPanel(resourcesDeps).then((api) => {
        if (name === 'loadResources') {
          void api.loadResources(args[0] as { revealResourceId?: string } | undefined);
          return;
        }
        if (name === 'selectResource') {
          api.selectResource(String(args[0] ?? ''));
          return;
        }
        invokeAfterReplace(stub, name, args);
      });
    };
    w[name] = stub;
  }
}

export function getLoadedResourcesApi(): ResourcesApi | null {
  return resourcesApi;
}

export function getLoadedProfilesApi(): ProfilesApi | null {
  return profilesApi;
}
