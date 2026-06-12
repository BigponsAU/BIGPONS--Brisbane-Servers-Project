/**
 * Unified content planes — one Neon store, three read views.
 *
 * - portal:   auth + ownerId — drafts and published (dashboard)
 * - public:   isPublicResource — anonymous catalog (website lists)
 * - indexable: public + substantive — SEO detail URLs and sitemap
 *
 * Publish moves a resource from portal-only to public/indexable. Draft saves never
 * touch the main site.
 */
import type { AuthUser } from '../utils/auth';
import {
  getIndexableResourcePath,
  isIndexableResource,
} from './content-registry';
import { filterResourcesForUser } from './resource-access';
import type { Resource } from './resource-types';
import { isPublicResource } from './resource-types';
import { normalizeTopicSlug } from './resource-slug';

export type ContentPlane = 'portal' | 'public' | 'indexable';

export type ResolveContentOptions = {
  plane: ContentPlane;
  user?: AuthUser;
  filters?: {
    industry?: string;
    topic?: string;
    status?: Resource['status'];
  };
};

function applyQueryFilters(resources: Resource[], filters: ResolveContentOptions['filters']): Resource[] {
  if (!filters) return resources;

  let out = resources;
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
  if (filters.status) {
    out = out.filter((r) => r.status === filters.status);
  }
  return out;
}

function filterForPlane(resources: Resource[], plane: ContentPlane): Resource[] {
  switch (plane) {
    case 'portal':
      return resources;
    case 'public':
      return resources.filter(isPublicResource);
    case 'indexable':
      return resources.filter(isIndexableResource);
    default:
      return resources;
  }
}

/** Resolve resources for portal, public catalog, or SEO indexable set. */
export function resolveContent(all: Resource[], options: ResolveContentOptions): Resource[] {
  let resources = all;

  if (options.plane === 'portal' && options.user) {
    resources = filterResourcesForUser(options.user, resources);
  } else if (options.plane === 'portal') {
    throw new Error('resolveContent(portal) requires auth user');
  }

  resources = filterForPlane(resources, options.plane);
  return applyQueryFilters(resources, options.filters);
}

/** True when a publish-like change should refresh public SEO surfaces (not draft-only edits). */
export function shouldUpdatePublicSurfaces(before: Resource, after: Resource): boolean {
  const becamePublished = after.status === 'published' && before.status !== 'published';
  const becameUnpublished = before.status === 'published' && after.status !== 'published';

  if (becamePublished || becameUnpublished) {
    return true;
  }

  if (after.status !== 'published') {
    return false;
  }

  const publicFieldsChanged =
    before.title !== after.title ||
    before.description !== after.description ||
    before.content !== after.content ||
    before.industry !== after.industry ||
    before.topic !== after.topic ||
    before.visibility !== after.visibility;

  return publicFieldsChanged && (isPublicResource(before) || isPublicResource(after));
}

/** Paths on the marketing site that reflect a published resource change. */
export function getAffectedPublicPaths(before: Resource, after: Resource): string[] {
  const paths = new Set<string>(['/resources', '/sitemap.xml', '/search-index.json']);

  const addHubPaths = (resource: Resource) => {
    if (!resource.industry) return;
    paths.add(`/resources/${resource.industry}`);
    if (resource.topic) {
      paths.add(`/resources/${resource.industry}/${normalizeTopicSlug(resource.topic)}`);
    }
    if (isIndexableResource(resource)) {
      paths.add(getIndexableResourcePath(resource));
    }
  };

  addHubPaths(before);
  addHubPaths(after);

  return [...paths].sort();
}
