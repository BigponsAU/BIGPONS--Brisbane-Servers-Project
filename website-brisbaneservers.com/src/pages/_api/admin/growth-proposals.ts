import type { APIRoute } from 'astro';
import { requireAdmin } from '~/utils/auth';
import {
  checkGrowthBudget,
  recordGrowthUsage,
  unitsPerMaterialize,
} from '~/lib/library-growth/growth-usage-budget';
import { loadLibraryGrowthConfig } from '~/lib/library-growth/config';
import { materializeGrowthProposal } from '~/lib/library-growth/materialize';
import {
  loadGrowthProposals,
  updateGrowthProposalStatus,
} from '~/lib/library-growth/proposals-store';
import { scheduleStaticSiteRebuild } from '~/lib/deploy-rebuild';

/**
 * Growth proposal queue — approve materializes into the resource library.
 * GET /api/admin/growth-proposals
 * POST /api/admin/growth-proposals — body: { proposalId, action: 'approve' | 'reject' }
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ success: false, error: authResult.error }), {
      status: authResult.code === 'FORBIDDEN' ? 403 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const proposals = await loadGrowthProposals();
  const status = new URL(request.url).searchParams.get('status') ?? 'pending';
  const filtered =
    status === 'all' ? proposals : proposals.filter((p) => p.status === status);

  return new Response(
    JSON.stringify({ success: true, proposals: filtered }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ success: false, error: authResult.error }), {
      status: authResult.code === 'FORBIDDEN' ? 403 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await request.json()) as { proposalId?: string; action?: string };
  const { proposalId, action } = body;

  if (!proposalId || !action) {
    return new Response(
      JSON.stringify({ success: false, error: 'proposalId and action are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const all = await loadGrowthProposals();
  const proposal = all.find((p) => p.id === proposalId);
  if (!proposal) {
    return new Response(
      JSON.stringify({ success: false, error: 'Proposal not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (action === 'reject') {
    const updated = await updateGrowthProposalStatus(proposalId, 'rejected', {
      reviewedBy: authResult.user.email,
    });
    return new Response(JSON.stringify({ success: true, proposal: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action !== 'approve') {
    return new Response(
      JSON.stringify({ success: false, error: 'action must be approve or reject' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const growthConfig = await loadLibraryGrowthConfig();
    const unitEach = unitsPerMaterialize(growthConfig);
    const budget = await checkGrowthBudget(growthConfig, unitEach);
    if (!budget.ok) {
      return new Response(JSON.stringify({ success: false, error: budget.reason }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { resource, voiceScore, published } = await materializeGrowthProposal(
      proposal,
      authResult.user.email
    );
    await recordGrowthUsage(unitEach, 'materialize', proposalId);
    const updated = await updateGrowthProposalStatus(proposalId, 'materialized', {
      reviewedBy: authResult.user.email,
      resourceId: resource.id,
      estimatedVoiceScore: voiceScore,
    });

    if (published) {
      scheduleStaticSiteRebuild('growth-proposal-published');
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposal: updated,
        resource,
        published,
        voiceScore,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Materialize failed';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
