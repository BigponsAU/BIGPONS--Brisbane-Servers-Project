import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import {
  loadResources,
  saveResources,
  isPublicResource
} from '../../../lib/resources-api';
import {
  updateContributionStatus
} from '../../../lib/contributions';
import { addLedgerEntry } from '../../../lib/token-ledger';

/**
 * Approve a contribution and optionally adjust tokens.
 * POST /api/community/approve
 * Body: { contributionId: string, tokenDelta?: number }
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);

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
    const body = await request.json();
    const { contributionId, tokenDelta } = body as {
      contributionId?: string;
      tokenDelta?: number;
    };

    if (!contributionId) {
      return new Response(
        JSON.stringify({
          error: 'Contribution ID is required',
          code: 'MISSING_ID',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const updated = await updateContributionStatus(
      contributionId,
      'accepted',
      undefined,
      tokenDelta
    );

    if (!updated) {
      return new Response(
        JSON.stringify({
          error: 'Contribution not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const resources = await loadResources();
    const resourceIdx = resources.findIndex((r) => r.id === updated.resourceId);
    if (resourceIdx !== -1) {
      const res = resources[resourceIdx];
      resources[resourceIdx] = {
        ...res,
        status: 'published',
        visibility: 'public'
      };
      await saveResources(resources);
    }

    if (typeof tokenDelta === 'number' && tokenDelta !== 0) {
      await addLedgerEntry({
        userId: updated.userId,
        delta: tokenDelta,
        reason: tokenDelta > 0 ? 'moderation_adjustment' : 'admin_revoke',
        resourceId: updated.resourceId,
        contributionId: updated.id
      });
    }

    return new Response(
      JSON.stringify({
        contribution: updated,
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

