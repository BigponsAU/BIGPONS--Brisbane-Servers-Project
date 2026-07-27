import type { APIRoute } from 'astro';
import { Extrapolator } from '@voice-framework/generators/extrapolator';
import { VoiceMatcher } from '@voice-framework/generators/voice-matcher';
import { requireAuth } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import {
  loadResources,
  saveResources,
  normalizeTopicSlug,
  type Resource
} from '../../../lib/resources-api';
import {
  createContribution,
  updateContributionStatus,
  type ContributionType
} from '../../../lib/contributions';
import { awardTokensOnAccept, computeContributionTokenAward } from '../../../lib/contribution-tokens';
import { loadPipelineConfig } from '../../../lib/pipeline-config';
import { runIndexPipeline } from '../../../lib/semantic/pipeline';
import { isDevelopmentMode } from '../../../utils/runtime-env';
import { resolveResourceVoiceProfile } from '../../../lib/resource-voice-profile';
import {
  containsDesignSystemJargon,
  sanitizeDesignSystemContamination,
  scoreTopicFidelity,
} from '../../../lib/inference/topic-fidelity';
import { improveResourceBody } from '../../../lib/inference/resource-improve';

/**
 * Community upload — preserve the contributor's text as the product purpose.
 * Never replace their perspective with Extrapolator / design-system expansions.
 * POST /api/resources/community-upload
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();

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
    const user = authResult.user;
    const body = await request.json();
    const { content, industry, topic, title } = body as {
      content?: string;
      industry?: string;
      topic?: string;
      title?: string;
    };

    if (!content || !industry || !topic) {
      return new Response(
        JSON.stringify({
          error: 'Content, industry, and topic are required',
          code: 'MISSING_FIELDS',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const topicSlug = normalizeTopicSlug(topic);
    const resourceTitle = title || `${topic} for ${industry}`;
    const userContent = String(content).trim();

    const resources = await loadResources();
    const { profileManager, profileBuilder } = await getVoiceFramework();
    const resolved = await resolveResourceVoiceProfile({
      profileManager,
      profileBuilder,
      resources,
    });
    const extrapolator = new Extrapolator(resolved.profile);
    const voiceMatcher = new VoiceMatcher(resolved.profile);

    // Start from the contributor's words; strip any accidental design-system contamination.
    let communityContent = containsDesignSystemJargon(userContent)
      ? sanitizeDesignSystemContamination(userContent) || userContent
      : userContent;

    // Optional light polish via Improve path (fidelity-gated; may keep original).
    try {
      const draftResource: Resource = {
        id: `community-draft-${Date.now()}`,
        industry,
        topic: topicSlug,
        title: resourceTitle,
        description: communityContent.slice(0, 200),
        content: communityContent,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email,
        ownerId: user.id,
        version: 1,
        status: 'draft',
        isStarterBlock: false,
        visibility: 'private',
      };
      const improved = await improveResourceBody({
        resource: draftResource,
        ragContextText: '',
        userId: user.id,
        userRole: user.role,
        resolved,
        extrapolator,
        voiceMatcher,
        reason: 'inference_community_upload',
      });
      // Only accept polish when it stays faithful to the contributor paste.
      if (
        scoreTopicFidelity(userContent, improved.content) >= 0.55 &&
        !containsDesignSystemJargon(improved.content)
      ) {
        communityContent = improved.content;
      }
    } catch (err) {
      console.warn('[API] community-upload polish skipped; keeping user content', err);
    }

    const voiceValidation = voiceMatcher.validateVoice(communityContent);
    const voiceScore = voiceValidation.score ?? 0;
    const topicFidelity = scoreTopicFidelity(userContent, communityContent);

    const config = await loadPipelineConfig();

    // Auto-publish only when voice is strong AND we did not replace the user's contribution
    // with framework gibberish (high fidelity to their paste) AND no design jargon.
    const autoPublishEligible =
      voiceScore >= config.autoPublishThreshold &&
      topicFidelity >= 0.85 &&
      !containsDesignSystemJargon(communityContent);

    const resource: Resource = {
      id: `${industry}-${topicSlug}-community-${Date.now()}`,
      industry,
      topic: topicSlug,
      title: resourceTitle,
      description: communityContent.substring(0, 200) + '...',
      content: communityContent,
      generatedAt: new Date().toISOString(),
      generatedBy: user.email,
      ownerId: user.id,
      version: 1,
      status: autoPublishEligible ? 'published' : 'draft',
      isStarterBlock: false,
      visibility: autoPublishEligible ? 'public' : 'private',
      metadata: {
        wordCount: communityContent.split(/\s+/).length,
        semanticLevel: 'high',
        voiceScore,
        topicFidelity,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution,
        contributionSource: 'community-upload',
      }
    };

    resources.push(resource);
    await saveResources(resources);

    const indexed = await runIndexPipeline(resource);
    const ri = resources.findIndex((r) => r.id === resource.id);
    if (ri >= 0) {
      resources[ri] = indexed;
      await saveResources(resources);
    }

    const autoAccepted = autoPublishEligible;
    const contributionType: ContributionType = 'new_upload';
    let contribution = await createContribution({
      userId: user.id,
      resourceId: resource.id,
      type: contributionType,
      status: autoAccepted ? 'accepted' : 'pending',
      payload: {
        industry,
        topic: topicSlug,
        title: resourceTitle,
        contentSnippet: userContent.substring(0, 200)
      },
      analysis: {
        voiceScore,
        topicFidelity,
        notes: autoAccepted
          ? 'Auto-approved: strong voice match and contributor text preserved'
          : 'Queued for review — contributor text preserved; tokens awarded when accepted'
      },
      tokensAwarded: undefined
    });

    let tokensAwarded = 0;
    if (autoAccepted) {
      const award = await awardTokensOnAccept(contribution, {
        tokenMultiplier: config.tokenMultiplier,
      });
      tokensAwarded = award.tokensAwarded;
      contribution = {
        ...contribution,
        tokensAwarded,
      };
      await updateContributionStatus(contribution.id, 'accepted', undefined, tokensAwarded);
    }

    const pendingPreview = computeContributionTokenAward(voiceScore, config.tokenMultiplier);

    const duration = Date.now() - startTime;
    if (isDevelopmentMode()) {
      console.log(
        `[API] POST /api/resources/community-upload - Success (${duration}ms, voiceScore=${voiceScore.toFixed(
          2
        )}, fidelity=${topicFidelity.toFixed(2)}, tokens=${tokensAwarded}, pendingPreview=${pendingPreview})`
      );
    }

    return new Response(
      JSON.stringify({
        resource: indexed,
        contribution,
        voiceValidation: {
          score: voiceScore,
          isValid: voiceValidation.isValid ?? false,
          issues: voiceValidation.issues ?? [],
          strengths: voiceValidation.strengths ?? []
        },
        topicFidelity,
        tokensAwarded,
        tokensPendingApproval: autoAccepted ? 0 : pendingPreview,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[API] POST /api/resources/community-upload - Error after ${duration}ms:`,
      error
    );

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
