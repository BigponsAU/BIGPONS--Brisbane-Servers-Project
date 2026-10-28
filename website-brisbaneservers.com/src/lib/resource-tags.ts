import { industries } from '../data/industries';
import { normalizeIndustrySlug } from './industry-slug';
import { isTagDraftResource, type Resource } from './resource-types';

export { isTagDraftResource };

export type ResourceTagStatus = 'canonical' | 'approved' | 'pending' | 'draft';

export type ResourceTag = {
  slug: string;
  label: string;
  status: ResourceTagStatus;
  proposedBy?: string;
};

export type TagProposal = {
  slug: string;
  label: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  proposedBy?: string;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function humanizeTagLabel(value: string): string {
  const canonical = industries.find(
    (item) => item.slug === value || item.id === value || item.name.toLowerCase() === value.toLowerCase(),
  );
  if (canonical) return canonical.name;
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isCanonicalIndustrySlug(slug: string): boolean {
  return industries.some((item) => item.slug === slug);
}

export function isValidTagSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 48 && SLUG_RE.test(slug);
}

export function tagProposalFromResource(resource: Resource): TagProposal | undefined {
  const raw = resource.metadata?.tagProposal;
  if (!raw || typeof raw !== 'object') return undefined;
  const slug = normalizeIndustrySlug(String(raw.slug || resource.industry));
  if (!slug) return undefined;
  return {
    slug,
    label: String(raw.label || humanizeTagLabel(slug)),
    status: (raw.status as TagProposal['status']) || 'draft',
    proposedBy: raw.proposedBy,
  };
}

export function isIndustryTagApproved(slug: string, resources: Resource[]): boolean {
  const normalized = normalizeIndustrySlug(slug);
  if (!normalized) return false;
  if (isCanonicalIndustrySlug(normalized)) return true;
  return resources.some((resource) => {
    if (normalizeIndustrySlug(resource.industry) !== normalized) return false;
    if (resource.status === 'published') return true;
    return resource.metadata?.tagProposal?.status === 'approved';
  });
}

export function buildResourceTagCatalog(params: {
  resources: Resource[];
  userId?: string;
  isAdmin?: boolean;
}): { tags: ResourceTag[]; pending: ResourceTag[] } {
  const bySlug = new Map<string, ResourceTag>();

  for (const industry of industries) {
    bySlug.set(industry.slug, {
      slug: industry.slug,
      label: industry.name,
      status: 'canonical',
    });
  }

  for (const resource of params.resources) {
    const slug = normalizeIndustrySlug(resource.industry);
    if (!slug || bySlug.get(slug)?.status === 'canonical') continue;
    const proposal = tagProposalFromResource(resource);
    const published = resource.status === 'published';
    const approved = proposal?.status === 'approved' || published;
    const ownerDraft = Boolean(params.userId && resource.ownerId === params.userId);
    const pending = proposal?.status === 'pending';

    const existing = bySlug.get(slug);
    if (approved) {
      bySlug.set(slug, {
        slug,
        label: proposal?.label || humanizeTagLabel(slug),
        status: 'approved',
        proposedBy: proposal?.proposedBy,
      });
      continue;
    }
    if (pending && (params.isAdmin || ownerDraft)) {
      if (!existing || existing.status === 'draft') {
        bySlug.set(slug, {
          slug,
          label: proposal?.label || humanizeTagLabel(slug),
          status: 'pending',
          proposedBy: proposal?.proposedBy || resource.ownerId,
        });
      }
      continue;
    }
    if (ownerDraft && !existing) {
      bySlug.set(slug, {
        slug,
        label: proposal?.label || humanizeTagLabel(slug),
        status: 'draft',
        proposedBy: resource.ownerId,
      });
    }
  }

  const tags = [...bySlug.values()].sort((a, b) => a.label.localeCompare(b.label));
  const pending = tags.filter((tag) => tag.status === 'pending');
  return { tags, pending };
}

export function tagDraftResourceId(userId: string, slug: string): string {
  return `tag-proposal-${userId}-${slug}`.slice(0, 80);
}

export function buildTagDraftResource(params: {
  slug: string;
  label: string;
  userId: string;
  userEmail?: string;
  status?: TagProposal['status'];
}): Resource {
  const slug = params.slug;
  return {
    id: tagDraftResourceId(params.userId, slug),
    industry: slug,
    topic: 'tag-proposal',
    title: `${params.label} (industry tag draft)`,
    description: `${params.label} is a personal industry tag. It stays in your drafts until an admin approves it for the public library.`,
    content: '',
    generatedAt: new Date().toISOString(),
    generatedBy: params.userEmail,
    ownerId: params.userId,
    version: 1,
    status: 'draft',
    visibility: 'private',
    metadata: {
      tagDraftOnly: true,
      tagProposal: {
        slug,
        label: params.label,
        status: params.status || 'draft',
        proposedBy: params.userId,
      },
    },
  };
}

export function prepareIndustryForResourceWrite(params: {
  industry: string;
  resources: Resource[];
  userId: string;
  isAdmin: boolean;
  existing?: Resource;
  publishing?: boolean;
}):
  | { ok: true; industry: string; tagProposal?: TagProposal }
  | { ok: false; error: string; code: string } {
  const slug = normalizeIndustrySlug(params.industry);
  if (!isValidTagSlug(slug)) {
    return {
      ok: false,
      code: 'INVALID_TAG',
      error: 'Use a short industry name (letters, numbers, hyphens).',
    };
  }
  let tagProposal = nextTagProposalForWrite({
    industry: slug,
    resources: params.resources,
    userId: params.userId,
    isAdmin: params.isAdmin,
    existing: params.existing,
  });
  if (params.publishing && tagProposal && tagProposal.status !== 'approved' && !isCanonicalIndustrySlug(slug)) {
    if (params.isAdmin) {
      tagProposal = { ...tagProposal, status: 'approved' };
    } else {
      tagProposal = { ...tagProposal, status: 'pending' };
      return {
        ok: false,
        code: 'TAG_PENDING',
        error: `"${tagProposal.label}" is not on the public industry list yet. Your draft is saved; an admin needs to approve the tag before publish.`,
      };
    }
  }
  return { ok: true, industry: slug, tagProposal };
}

export function nextTagProposalForWrite(params: {
  industry: string;
  resources: Resource[];
  userId: string;
  isAdmin: boolean;
  existing?: Resource;
}): TagProposal | undefined {
  const slug = normalizeIndustrySlug(params.industry);
  if (!slug) return undefined;
  if (isIndustryTagApproved(slug, params.resources)) {
    if (isCanonicalIndustrySlug(slug)) return undefined;
    return {
      slug,
      label: humanizeTagLabel(slug),
      status: 'approved',
      proposedBy: params.existing?.metadata?.tagProposal?.proposedBy || params.userId,
    };
  }
  const existingProposal = params.existing ? tagProposalFromResource(params.existing) : undefined;
  return {
    slug,
    label: existingProposal?.label || humanizeTagLabel(slug),
    status: params.isAdmin ? 'approved' : existingProposal?.status === 'pending' ? 'pending' : 'draft',
    proposedBy: existingProposal?.proposedBy || params.userId,
  };
}
