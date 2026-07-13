import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import {
  loadResources,
  saveResources,
} from '../../../lib/resources-api';
import {
  updateContributionStatus
} from '../../../lib/contributions';
import { awardTokensOnAccept } from '../../../lib/contribution-tokens';
import { schedulePublicSurfaceUpdate } from '../../../lib/deploy-rebuild';

/**
 * Approve a contribution, publish its resource, and award tokens (idempotent).
 * POST /api/community/approve
 * Body: { contributionId: string, tokenDelta?: number }
 * tokenDelta is an optional extra moderation adjustment after the standard award.
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
      undefined
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
      const before = { ...res };
      resources[resourceIdx] = {
        ...res,
        status: 'published',
        visibility: 'public',
        wasEverPublished: true,
        binnedAt: undefined,
      };
      await saveResources(resources);
      schedulePublicSurfaceUpdate(before, resources[resourceIdx], `community-approve-${updated.resourceId}`);
    }

    const award = await awardTokensOnAccept(updated, {
      tokenDelta: typeof tokenDelta === 'number' ? tokenDelta : undefined,
    });

    const contribution = await updateContributionStatus(
      contributionId,
      'accepted',
      undefined,
      award.tokensAwarded
    );

    return new Response(
      JSON.stringify({
        contribution: contribution ?? { ...updated, tokensAwarded: award.tokensAwarded },
        tokensAwarded: award.tokensAwarded,
        tokensGrantedNow: award.awarded + award.adjustment,
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
