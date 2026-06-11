/**
 * Public / prerender: load published resources via HTTP when the API is up,
 * else fall back to the same repository backing `GET /api/resources/public`.
 *
 * During Astro build, memoizes the full public list so Pages does not hammer
 * Neon/Hyperdrive on every static path (major egress saver).
 *
 * Cloudflare Pages SSR must not import pg/repositories — uses API fetch only.
 */
import { getInternalApiBaseUrl, resolveInternalApiUrl } from './api-config';
import type { Resource } from './resource-types';
import { isPublicResource } from './resource-types';
import { normalizeTopicSlug } from './resource-slug';
import { readRuntimeEnv } from '../utils/runtime-env';

/** When "1", Astro build reads voice-framework/storage/resources.json — no API/Neon egress. */
function pagesBuildUsesGitCorpus(): boolean {
  return readRuntimeEnv('PAGES_BUILD_USE_GIT_CORPUS') === '1';
}

/** Live catalog from API at request time (publish = instant SEO). Overrides git corpus on SSR. */
function useLivePublicCatalog(): boolean {
  return readRuntimeEnv('PUBLIC_RESOURCES_LIVE') === '1';
}

function useGitCorpusForCatalog(): boolean {
  if (!pagesBuildUsesGitCorpus()) return false;
  const runtimeSsr = import.meta.env.SSR && import.meta.env.PRERENDER !== true;
  if (useLivePublicCatalog() && runtimeSsr) return false;
  return true;
}

function isPrerenderBuildPhase(): boolean {
  return import.meta.env.PRERENDER === true;
}

function usesRemotePublicApi(): boolean {
  return /^https?:\/\//i.test(resolveInternalApiUrl('/resources/public'));
}

async function loadResourcesLocal(): Promise<Resource[]> {
  if (import.meta.env.PROD && usesRemotePublicApi() && !useGitCorpusForCatalog()) {
    return [];
  }
  const { loadResources } = await import('./resources-api');
  return loadResources();
}

function sortByGeneratedDesc(resources: Resource[]): Resource[] {
  return [...resources].sort(
    (a, b) => new Date(b.generatedAt || 0).getTime() - new Date(a.generatedAt || 0).getTime(),
  );
}

function filterLocal(resources: Resource[], filters: { industry?: string; topic?: string }): Resource[] {
  let out = resources.filter(isPublicResource);
  if (filters.industry) {
    out = out.filter((r) => r.industry === filters.industry);
  }
  if (filters.topic) {
    const want = normalizeTopicSlug(filters.topic);
    out = out.filter((r) => {
      const rs = normalizeTopicSlug(r.topic);
      return r.topic === filters.topic || rs === want || r.topic === want;
    });
  }
  return sortByGeneratedDesc(out);
}

export type PublishedListFilters = {
  industry?: string;
  topic?: string;
};

let buildTimePublicCache: Resource[] | null = null;
let buildTimePublicCachePromise: Promise<Resource[]> | null = null;

async function fetchAllPublicFromApi(): Promise<Resource[] | null> {
  const apiBase = resolveInternalApiUrl('/resources/public');
  if (!/^https?:\/\//i.test(apiBase)) {
    return null;
  }

  try {
    const res = await fetch(apiBase, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { resources?: Resource[] };
    return sortByGeneratedDesc(data.resources ?? []);
  } catch {
    return null;
  }
}

async function getBuildTimePublicCache(): Promise<Resource[]> {
  if (buildTimePublicCache) {
    return buildTimePublicCache;
  }
  if (!buildTimePublicCachePromise) {
    buildTimePublicCachePromise = (async () => {
      const remote = await fetchAllPublicFromApi();
      if (remote) {
        buildTimePublicCache = remote;
        return remote;
      }
      const all = await loadResourcesLocal();
      buildTimePublicCache = filterLocal(all, {});
      return buildTimePublicCache;
    })();
  }
  return buildTimePublicCachePromise;
}

export async function getPublishedResourcesForPage(
  filters: PublishedListFilters = {},
): Promise<Resource[]> {
  if (useGitCorpusForCatalog()) {
    const all = await loadResourcesLocal();
    return filterLocal(all, filters);
  }

  if (usesRemotePublicApi()) {
    if (isPrerenderBuildPhase()) {
      const all = await getBuildTimePublicCache();
      return filterLocal(all, filters);
    }

    const remote = await fetchAllPublicFromApi();
    if (remote) {
      return filterLocal(remote, filters);
    }

    if (import.meta.env.PROD) {
      return [];
    }
  }

  const all = await loadResourcesLocal();
  return filterLocal(all, filters);
}

export async function getPublishedResourceById(id: string): Promise<Resource | null> {
  if (useGitCorpusForCatalog()) {
    const all = await loadResourcesLocal();
    const r = all.find((x) => x.id === id);
    return r && isPublicResource(r) ? r : null;
  }

  if (usesRemotePublicApi()) {
    const all = isPrerenderBuildPhase()
      ? await getBuildTimePublicCache()
      : ((await fetchAllPublicFromApi()) ?? []);
    const r = all.find((x) => x.id === id);
    return r && isPublicResource(r) ? r : null;
  }

  const all = await loadResourcesLocal();
  const r = all.find((x) => x.id === id);
  if (!r || !isPublicResource(r)) return null;
  return r;
}
