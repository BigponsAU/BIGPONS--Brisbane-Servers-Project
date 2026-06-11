/**
 * Public / prerender: load published resources via HTTP when the API is up,
 * else fall back to the same repository backing `GET /api/resources/public`.
 *
 * During Astro build, memoizes the full public list so Pages does not hammer
 * Neon/Hyperdrive on every static path (major egress saver).
 */
import { resolveInternalApiUrl } from './api-config';
import type { Resource } from './resource-types';
import { isPublicResource } from './resource-types';
import { loadResources, normalizeTopicSlug } from './resources-api';
import { readRuntimeEnv } from '../utils/runtime-env';

/** When "1", Astro build reads voice-framework/storage/resources.json — no API/Neon egress. */
function pagesBuildUsesGitCorpus(): boolean {
  return readRuntimeEnv('PAGES_BUILD_USE_GIT_CORPUS') === '1';
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

  const url = new URL(apiBase);
  try {
    const res = await fetch(url.href, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { resources?: Resource[] };
    return sortByGeneratedDesc(data.resources ?? []);
  } catch {
    return null;
  }
}

/** One HTTP fetch per Astro build when prerendering from the live API. */
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
      const all = await loadResources();
      buildTimePublicCache = filterLocal(all, {});
      return buildTimePublicCache;
    })();
  }
  return buildTimePublicCachePromise;
}

/**
 * Prefer remote API (unified dev / Node adapter); on failure use `loadResources()` + `isPublicResource`.
 */
export async function getPublishedResourcesForPage(
  filters: PublishedListFilters = {},
): Promise<Resource[]> {
  if (pagesBuildUsesGitCorpus()) {
    const all = await loadResources();
    return filterLocal(all, filters);
  }

  const apiBase = resolveInternalApiUrl('/resources/public');
  if (/^https?:\/\//i.test(apiBase)) {
    const all = await getBuildTimePublicCache();
    if (filters.industry || filters.topic) {
      return filterLocal(all, filters);
    }
    return all;
  }

  const all = await loadResources();
  return filterLocal(all, filters);
}

export async function getPublishedResourceById(id: string): Promise<Resource | null> {
  if (pagesBuildUsesGitCorpus()) {
    const all = await loadResources();
    const r = all.find((x) => x.id === id);
    return r && isPublicResource(r) ? r : null;
  }

  const apiBase = resolveInternalApiUrl('/resources/public');
  if (/^https?:\/\//i.test(apiBase)) {
    const all = await getBuildTimePublicCache();
    const r = all.find((x) => x.id === id);
    return r && isPublicResource(r) ? r : null;
  }

  const all = await loadResources();
  const r = all.find((x) => x.id === id);
  if (!r || !isPublicResource(r)) return null;
  return r;
}
