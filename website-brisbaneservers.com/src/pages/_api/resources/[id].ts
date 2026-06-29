import type { APIRoute } from 'astro';

/** Static build: API is served by standalone-api at runtime, not prerendered. */
export function getStaticPaths() {
  return [];
}
import { requireAuth, requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import {
  loadResources,
  saveResources,
  type Resource
} from '../../../lib/resources-api';
import { canAccessResource } from '../../../lib/resource-access';
import { getResourceActionPermissions } from '../../../lib/resource-permissions';
import {
  schedulePublicSurfaceUpdate,
  shouldRebuildForResourceChange,
} from '../../../lib/deploy-rebuild';

/**
 * Get a specific resource
 * GET /api/resources/:id
 */
export const GET: APIRoute = async ({ params, request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'Resource ID is required',
          code: 'MISSING_ID',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const resources = await loadResources();
    const resource = resources.find((r) => r.id === id);

    if (!resource) {
      return new Response(
        JSON.stringify({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!canAccessResource(authResult.user, resource)) {
      return new Response(
        JSON.stringify({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        resource,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Update a resource
 * PUT /api/resources/:id
 * Starter blocks are read-only unless user is super-admin or admin.
 */
export const PUT: APIRoute = async ({ params, request }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'Resource ID is required',
          code: 'MISSING_ID',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const updates = await request.json();
    const resources = await loadResources();
    const idx = resources.findIndex((r) => r.id === id);

    if (idx === -1) {
      return new Response(
        JSON.stringify({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const existing = resources[idx];

    if (updates.restoreToWorkspace === true) {
      const isAdmin = authResult.user.role === 'admin' || authResult.user.role === 'super-admin';
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Admin only', code: 'FORBIDDEN', success: false }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (!existing.portalRemovedAt) {
        return new Response(
          JSON.stringify({ error: 'Resource is not removed from workspace', code: 'NOT_REMOVED', success: false }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
      const restored = {
        ...existing,
        portalRemovedAt: undefined,
        version: existing.version + 1,
      };
      resources[idx] = restored;
      await saveResources(resources);
      return new Response(JSON.stringify({ resource: restored, success: true, restored: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!canAccessResource(authResult.user, existing)) {
      return new Response(
        JSON.stringify({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const editPermissions = getResourceActionPermissions(authResult.user, existing);
    if (!editPermissions.edit) {
      return new Response(
        JSON.stringify({
          error: editPermissions.editReason || 'You cannot edit this resource',
          code: existing.isStarterBlock ? 'STARTER_BLOCK_READ_ONLY' : 'FORBIDDEN',
          success: false
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const isSuperAdmin = authResult.user.role === 'super-admin';
    const { restoreToWorkspace: _restore, ...contentUpdates } = updates as Record<string, unknown>;
    const nextStatus = (contentUpdates.status as Resource['status']) ?? existing.status;
    resources[idx] = {
      ...existing,
      ...contentUpdates,
      id: existing.id,
      isStarterBlock: existing.isStarterBlock,
      portalRemovedAt: existing.portalRemovedAt,
      version: existing.version + 1,
      industry: (contentUpdates.industry as string) ?? existing.industry,
      topic: (contentUpdates.topic as string) ?? existing.topic,
      ownerId:
        isSuperAdmin && typeof contentUpdates.ownerId === 'string'
          ? contentUpdates.ownerId
          : existing.ownerId,
      wasEverPublished: existing.wasEverPublished === true || nextStatus === 'published',
    };

    if (contentUpdates.content) {
      const { voiceMatcher } = await getVoiceFramework();
      const voiceValidation = voiceMatcher.validateVoice(contentUpdates.content as string);
      resources[idx].metadata = {
        ...resources[idx].metadata,
        voiceScore: voiceValidation.score ?? 0,
        wordCount: String(contentUpdates.content).split(/\s+/).length
      };
    }

    const updated = resources[idx];
    await saveResources(resources);

    if (shouldRebuildForResourceChange(existing, updated)) {
      schedulePublicSurfaceUpdate(existing, updated, `resource-${updated.status}-${updated.id}`);
    }

    return new Response(
      JSON.stringify({
        resource: updated,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Delete a resource
 * DELETE /api/resources/:id
 * Starter blocks cannot be deleted unless super-admin or admin. Others can only delete own resources.
 */
export const DELETE: APIRoute = async ({ params, request }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'Resource ID is required',
          code: 'MISSING_ID',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const resources = await loadResources();
    const resource = resources.find((r) => r.id === id);

    if (!resource) {
      return new Response(
        JSON.stringify({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!canAccessResource(authResult.user, resource)) {
      return new Response(
        JSON.stringify({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const deletePermissions = getResourceActionPermissions(authResult.user, resource);
    if (!deletePermissions.delete) {
      return new Response(
        JSON.stringify({
          error: deletePermissions.deleteReason || 'You cannot delete this resource',
          code: resource.status === 'published' ? 'PUBLISHED_DELETE_BLOCKED' : 'FORBIDDEN',
          success: false
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    /** Published: soft-delete from workspace — public search index + static URLs stay live. */
    if (resource.status === 'published') {
      const idx = resources.findIndex((r) => r.id === id);
      resources[idx] = {
        ...resource,
        wasEverPublished: true,
        portalRemovedAt: new Date().toISOString(),
      };
      await saveResources(resources);

      return new Response(
        JSON.stringify({
          success: true,
          softDeleted: true,
          message:
            'Removed from workspace. The public page and search index are unchanged.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const filtered = resources.filter((r) => r.id !== id);
    await saveResources(filtered);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Resource deleted'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
