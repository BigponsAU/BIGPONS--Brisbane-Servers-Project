/**
 * Public / prerender: load published resources via HTTP when the API is up,
 * else fall back to the same repository backing `GET /api/resources/public`.
 */
import { resolveInternalApiUrl } from './api-config';
import type { Resource } from './resource-types';
import { isPublicResource } from './resource-types';
import { loadResources, normalizeTopicSlug } from './resources-api';

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

/**
 * Prefer remote API (unified dev / Node adapter); on failure use `loadResources()` + `isPublicResource`.
 */
export async function getPublishedResourcesForPage(
  filters: PublishedListFilters = {},
): Promise<Resource[]> {
  const apiBase = resolveInternalApiUrl('/resources/public');
  if (!/^https?:\/\//i.test(apiBase)) {
    const all = await loadResources();
    return filterLocal(all, filters);
  }

  const url = new URL(apiBase);
  if (filters.industry) url.searchParams.set('industry', filters.industry);
  if (filters.topic) url.searchParams.set('topic', filters.topic);

  try {
    const res = await fetch(url.href, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = (await res.json()) as { resources?: Resource[] };
      return sortByGeneratedDesc(data.resources ?? []);
    }
  } catch {
    /* local fallback */
  }

  const all = await loadResources();
  return filterLocal(all, filters);
}

export async function getPublishedResourceById(id: string): Promise<Resource | null> {
  const apiBase = resolveInternalApiUrl('/resources/public');
  if (!/^https?:\/\//i.test(apiBase)) {
    const all = await loadResources();
    const r = all.find((x) => x.id === id);
    if (!r || !isPublicResource(r)) return null;
    return r;
  }

  const url = new URL(apiBase);
  url.searchParams.set('id', id);

  try {
    const res = await fetch(url.href, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = (await res.json()) as { resource?: Resource };
      const r = data.resource;
      if (r && isPublicResource(r)) return r;
      return null;
    }
  } catch {
    /* local fallback */
  }

  const all = await loadResources();
  const r = all.find((x) => x.id === id);
  if (!r || !isPublicResource(r)) return null;
  return r;
}
