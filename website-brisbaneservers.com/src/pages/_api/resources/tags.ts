import type { APIRoute } from 'astro';
import { requireAuth, requireAdmin } from '../../../utils/auth';
import { loadResources, saveResources } from '../../../lib/resources-api';
import { normalizeIndustrySlug } from '../../../lib/industry-slug';
import {
  applyIndustryTagModeration,
  buildResourceTagCatalog,
  isValidTagSlug,
  upsertIndustryTagProposal,
} from '../../../lib/resource-tags';
import { isAdminRole } from '../../../lib/workspace-roles';

/**
 * GET /api/resources/tags — canonical + approved + this user's industry applications.
 * POST /api/resources/tags — author applies (pending); admin creates (approved).
 * PUT /api/resources/tags — admin approve/reject an industry application.
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
  const applications = catalog.tags.filter((tag) => tag.status === 'pending' || tag.status === 'draft');

  return new Response(
    JSON.stringify({
      success: true,
      tags: catalog.tags.filter((tag) => tag.status !== 'pending' || isAdmin || tag.proposedBy === authResult.user.id),
      pending: isAdmin ? applications : applications.filter((tag) => tag.proposedBy === authResult.user.id),
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
  const result = upsertIndustryTagProposal({
    label: requestedLabel,
    resources,
    userId: authResult.user.id,
    userEmail: authResult.user.email,
    isAdmin,
  });
  if (result.changed) {
    await saveResources(result.resources);
  }

  return new Response(
    JSON.stringify({
      success: true,
      tag: result.tag,
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
  const result = applyIndustryTagModeration({
    slug,
    action,
    resources,
    adminUserId: authResult.user.id,
    adminEmail: authResult.user.email,
  });
  if (result.updated > 0) {
    await saveResources(result.resources);
  }

  return new Response(
    JSON.stringify({ success: true, slug, action, updated: result.updated }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
