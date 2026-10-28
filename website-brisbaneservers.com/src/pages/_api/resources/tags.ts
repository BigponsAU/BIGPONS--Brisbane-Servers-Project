import type { APIRoute } from 'astro';
import { requireAuth, requireAdmin } from '../../../utils/auth';
import { loadResources, saveResources } from '../../../lib/resources-api';
import { normalizeIndustrySlug } from '../../../lib/industry-slug';
import {
  buildResourceTagCatalog,
  buildTagDraftResource,
  humanizeTagLabel,
  isValidTagSlug,
  nextTagProposalForWrite,
  tagDraftResourceId,
} from '../../../lib/resource-tags';
import { isAdminRole } from '../../../lib/workspace-roles';

/**
 * GET /api/resources/tags — canonical + approved + this user's draft tags.
 * POST /api/resources/tags — propose a draft tag (saved for this user until approved).
 * PUT /api/resources/tags — admin approve/reject a pending industry tag.
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resources = await loadResources();
  const isAdmin = isAdminRole(authResult.user.role);
  const catalog = buildResourceTagCatalog({
    resources,
    userId: authResult.user.id,
    isAdmin,
  });

  return new Response(
    JSON.stringify({
      success: true,
      tags: catalog.tags.filter((tag) => tag.status !== 'pending' || isAdmin || tag.proposedBy === authResult.user.id),
      pending: isAdmin
        ? catalog.tags.filter((tag) => tag.status === 'pending' || tag.status === 'draft')
        : catalog.pending.filter((tag) => tag.proposedBy === authResult.user.id),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};

export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => ({}));
  const requestedLabel = String((body as { label?: string }).label || '').trim();
  const slug = normalizeIndustrySlug(requestedLabel);
  if (!isValidTagSlug(slug)) {
    return new Response(
      JSON.stringify({
        error: 'Use a short industry name (letters, numbers, hyphens).',
        code: 'INVALID_TAG',
        success: false,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const resources = await loadResources();
  const isAdmin = isAdminRole(authResult.user.role);
  const proposal = nextTagProposalForWrite({
    industry: slug,
    resources,
    userId: authResult.user.id,
    isAdmin,
  });
  const status = isAdmin ? 'approved' : proposal?.status === 'approved' ? 'approved' : 'draft';
  const label = proposal?.label || humanizeTagLabel(slug) || requestedLabel;
  const stubId = tagDraftResourceId(authResult.user.id, slug);
  const existingIndex = resources.findIndex((resource) => resource.id === stubId);
  if (existingIndex < 0 && status !== 'approved') {
    resources.push(
      buildTagDraftResource({
        slug,
        label,
        userId: authResult.user.id,
        userEmail: authResult.user.email,
        status: 'draft',
      }),
    );
    await saveResources(resources);
  } else if (existingIndex >= 0 && isAdmin) {
    const current = resources[existingIndex];
    resources[existingIndex] = {
      ...current,
      metadata: {
        ...current.metadata,
        tagProposal: { slug, label, status: 'approved', proposedBy: authResult.user.id },
      },
    };
    await saveResources(resources);
  }

  return new Response(
    JSON.stringify({
      success: true,
      tag: {
        slug,
        label,
        status,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};

export const PUT: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, success: false }), {
      status: authResult.code === 'FORBIDDEN' ? 403 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    action?: 'approve' | 'reject';
  };
  const slug = normalizeIndustrySlug(body.slug || '');
  const action = body.action;
  if (!slug || (action !== 'approve' && action !== 'reject')) {
    return new Response(
      JSON.stringify({ error: 'slug and action (approve|reject) are required', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const resources = await loadResources();
  let changed = 0;
  for (const resource of resources) {
    if (normalizeIndustrySlug(resource.industry) !== slug) continue;
    const current = resource.metadata?.tagProposal;
    resource.metadata = {
      ...resource.metadata,
      tagProposal: {
        slug,
        label: current?.label || humanizeTagLabel(slug),
        status: action === 'approve' ? 'approved' : 'rejected',
        proposedBy: current?.proposedBy || resource.ownerId,
      },
    };
    changed += 1;
  }
  if (changed > 0) {
    await saveResources(resources);
  }

  return new Response(
    JSON.stringify({ success: true, slug, action, updated: changed }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
