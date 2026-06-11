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

    // Starter-block protection: only super-admin or admin can edit
    if (existing.isStarterBlock === true) {
      const canEdit = authResult.user.role === 'super-admin' || authResult.user.role === 'admin';
      if (!canEdit) {
        return new Response(
          JSON.stringify({
            error:
              'Starter blocks cannot be edited. Use "Create from Starter Block" to make your own copy.',
            code: 'STARTER_BLOCK_READ_ONLY',
            success: false
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    const isSuperAdmin = authResult.user.role === 'super-admin';
    resources[idx] = {
      ...existing,
      ...updates,
      id: existing.id,
      isStarterBlock: existing.isStarterBlock,
      version: existing.version + 1,
      industry: updates.industry ?? existing.industry,
      topic: updates.topic ?? existing.topic,
      ownerId: isSuperAdmin && updates.ownerId !== undefined ? updates.ownerId : existing.ownerId
    };

    if (updates.content) {
      const { voiceMatcher } = await getVoiceFramework();
      const voiceValidation = voiceMatcher.validateVoice(updates.content);
      resources[idx].metadata = {
        ...resources[idx].metadata,
        voiceScore: voiceValidation.score ?? 0,
        wordCount: String(updates.content).split(/\s+/).length
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

    if (resource.isStarterBlock === true) {
      const canDelete = authResult.user.role === 'super-admin' || authResult.user.role === 'admin';
      if (!canDelete) {
        return new Response(
          JSON.stringify({
            error: 'Starter blocks cannot be deleted',
            code: 'STARTER_BLOCK_PROTECTED',
            success: false
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      const canDeleteAny =
        authResult.user.role === 'super-admin' || authResult.user.role === 'admin';
      if (!canDeleteAny && resource.ownerId !== authResult.user.id) {
        return new Response(
          JSON.stringify({
            error: 'You can only delete your own resources',
            code: 'FORBIDDEN',
            success: false
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
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
