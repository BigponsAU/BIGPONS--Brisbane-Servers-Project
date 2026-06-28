/**
 * Resolve marketing-site paths for hybrid search results (static index + semantic API).
 */
import { getIndexableResourcePath, isIndexableResource } from '../content-registry';
import type { Resource } from '../resource-types';

const CASE_STUDY_RESOURCE_PREFIX = 'case-study-';

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/** Path for search links — null when the resource has no public landing page. */
export function getPublicSearchResultPath(resource: Resource): string | null {
  if (resource.id.startsWith(CASE_STUDY_RESOURCE_PREFIX)) {
    return `/case-studies/${resource.id.slice(CASE_STUDY_RESOURCE_PREFIX.length)}`;
  }

  if (resource.metadata?.growthKind === 'case_study') {
    const slug = slugifyTitle(resource.title);
    if (slug) {
      return `/case-studies/${slug}`;
    }
  }

  if (!isIndexableResource(resource)) {
    return null;
  }

  return getIndexableResourcePath(resource);
}

/** Search-index / API href form (client strips .html). */
export function getPublicSearchResultUrl(resource: Resource): string | null {
  const path = getPublicSearchResultPath(resource);
  if (!path) return null;
  const trimmed = path.replace(/\/$/, '');
  return `${trimmed}/index.html`;
}
