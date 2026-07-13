import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { updateContributionStatus } from '../../../lib/contributions';
import { revokeTokensOnReject } from '../../../lib/contribution-tokens';
import { loadResources, saveResources } from '../../../lib/resources-api';
import { schedulePublicSurfaceUpdate } from '../../../lib/deploy-rebuild';

/**
 * Reject a contribution, archive its draft resource, and claw back any tokens.
 * POST /api/community/reject
 * Body: { contributionId: string, tokenDelta?: number }
 * Without tokenDelta, any ledger net for this contribution is clawed back.
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
      'rejected',
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
      // Only archive unpublished drafts — never yank something already live.
      if (res.status !== 'published') {
        const before = { ...res };
        resources[resourceIdx] = {
          ...res,
          status: 'archived',
          visibility: 'private',
        };
        await saveResources(resources);
        schedulePublicSurfaceUpdate(before, resources[resourceIdx], `community-reject-${updated.resourceId}`);
      }
    }

    const revoke = await revokeTokensOnReject(updated, {
      tokenDelta: typeof tokenDelta === 'number' ? tokenDelta : undefined,
    });

    const contribution = await updateContributionStatus(
      contributionId,
      'rejected',
      undefined,
      revoke.tokensAwarded
    );

    return new Response(
      JSON.stringify({
        contribution: contribution ?? { ...updated, tokensAwarded: revoke.tokensAwarded },
        tokensClawedBack: revoke.clawedBack,
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
