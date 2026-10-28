import type { APIRoute } from 'astro';

/** Static build: API is served by standalone-api at runtime, not prerendered. */
export function getStaticPaths() {
  return [];
}

import { requireEditor } from '../../../../utils/auth';
import { loadResources, saveResources } from '../../../../lib/resources-api';
import { canAccessResource } from '../../../../lib/resource-access';
import { getResourceActionPermissions } from '../../../../lib/resource-permissions';
import { resolveResourceInfographic } from '../../../../lib/resource-infographic';
import {
  MAX_RESOURCE_DIAGRAMS,
  appendDiagramMarker,
  infographicsMetadata,
  listResourceInfographics,
  mergeResourceInfographics,
} from '../../../../lib/resource-infographics';

/**
 * POST /api/resources/:id/diagrams
 * Body: { action: 'generate' | 'regenerate', diagramId?: string }
 */
export const POST: APIRoute = async ({ params, request }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, success: false }), {
      status: authResult.code === 'FORBIDDEN' ? 403 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Resource ID is required', success: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    diagramId?: string;
    place?: 'end' | 'none';
  };
  const action = body.action === 'regenerate' ? 'regenerate' : 'generate';
  const place = body.place === 'none' ? 'none' : 'end';

  const resources = await loadResources();
  const index = resources.findIndex((resource) => resource.id === id);
  if (index < 0) {
    return new Response(JSON.stringify({ error: 'Resource not found', success: false }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = resources[index];
  if (!canAccessResource(authResult.user, existing)) {
    return new Response(JSON.stringify({ error: 'Resource not found', success: false }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const perms = getResourceActionPermissions(authResult.user, existing);
  if (!perms.edit) {
    return new Response(
      JSON.stringify({ error: perms.editReason || 'You cannot edit this resource', success: false }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const current = listResourceInfographics(existing);
  if (action === 'generate' && current.length >= MAX_RESOURCE_DIAGRAMS) {
    return new Response(
      JSON.stringify({
        error: `This article already has ${MAX_RESOURCE_DIAGRAMS} diagrams. Regenerate one from the editor instead.`,
        code: 'DIAGRAM_LIMIT',
        success: false,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const replaceId = action === 'regenerate' ? body.diagramId || current.at(-1)?.id : undefined;
  const resolved = await resolveResourceInfographic({
    industry: existing.industry,
    topic: existing.topic,
    title: existing.title,
    contentExcerpt: existing.content,
    userId: authResult.user.id,
    userRole: authResult.user.role,
  });

  const spec = {
    ...resolved.spec,
    id: replaceId || `${resolved.spec.id}-${current.length + 1}`.slice(0, 40),
  };
  const specs = mergeResourceInfographics(current, spec, replaceId);
  const content =
    place === 'none' || action === 'regenerate'
      ? existing.content || ''
      : appendDiagramMarker(existing.content || '', spec.id);

  resources[index] = {
    ...existing,
    content,
    version: existing.version + 1,
    metadata: {
      ...existing.metadata,
      ...infographicsMetadata(specs),
    },
  };
  await saveResources(resources);

  return new Response(
    JSON.stringify({
      success: true,
      action,
      diagram: spec,
      source: resolved.source,
      resource: resources[index],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
