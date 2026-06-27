import type { APIRoute } from 'astro';
import { VoiceMatcher } from '@voice-framework';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import { checkRateLimit, getClientKey } from '../../../lib/rate-limit';
import { validateResourceSourceText } from '../../../lib/resource-submission-guard';
import { resolveResourceVoiceProfile } from '../../../lib/resource-voice-profile';
import { loadResources } from '../../../lib/resources-api';
import { rewriteDocumentPreservingStructure } from '../../../lib/documents/voice-document-rewrite';
import { DOCUMENT_TOKEN_COSTS } from '../../../data/document-token-costs';
import { spendDocumentTokens } from '../../../lib/documents/document-token-guard';

const MAX_REQ_PER_MIN = 15;

/**
 * Voice-profile rewrite — preserve document structure, rewrite prose only.
 * POST /api/documents/rewrite
 * Body: { content, title?, profileId? }
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      {
        status: authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const rl = checkRateLimit(`doc-rewrite:${getClientKey(request)}`, MAX_REQ_PER_MIN, 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT', success: false }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content : '';
    const title = typeof body.title === 'string' ? body.title.trim() : undefined;
    const profileId = typeof body.profileId === 'string' ? body.profileId.trim() : undefined;

    const guard = validateResourceSourceText(content);
    if (!guard.ok) {
      return new Response(
        JSON.stringify({ error: guard.message, code: guard.code, success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resources = await loadResources();
    const { profileManager, profileBuilder } = await getVoiceFramework();
    const resolved = await resolveResourceVoiceProfile({
      requestedProfileId: profileId,
      profileManager,
      profileBuilder,
      resources,
    });
    const voiceMatcher = new VoiceMatcher(resolved.profile);

    const tokenSpend = await spendDocumentTokens({
      userId: authResult.user.id,
      role: authResult.user.role,
      cost: DOCUMENT_TOKEN_COSTS.rewrite,
      reason: 'document_rewrite',
    });
    if (!tokenSpend.ok) {
      return new Response(
        JSON.stringify({
          error: tokenSpend.error,
          code: tokenSpend.code,
          success: false,
          tokens: { required: tokenSpend.cost, balance: tokenSpend.balance },
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rewritten = await rewriteDocumentPreservingStructure({
      content,
      title,
      profile: resolved.profile,
      voiceMatcher,
      userId: authResult.user.id,
      userRole: authResult.user.role,
    });

    return new Response(
      JSON.stringify({
        success: true,
        rewritten: {
          content: rewritten.content,
          inference: { mode: rewritten.inferenceMode, modelId: rewritten.modelId },
          voiceScore: rewritten.voiceScore,
          voiceValid: rewritten.voiceValid,
        },
        voiceProfile: {
          resolution: resolved.resolution,
          profileId: resolved.voiceProfileId ?? null,
        },
        tokens: {
          spent: tokenSpend.waived ? 0 : tokenSpend.cost,
          balance: tokenSpend.balance,
          waived: tokenSpend.waived,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
