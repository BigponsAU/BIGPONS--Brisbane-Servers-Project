import type { APIRoute } from 'astro';
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
  type ContributionType
} from '../../../lib/contributions';
import { addLedgerEntry } from '../../../lib/token-ledger';
import { loadPipelineConfig } from '../../../lib/pipeline-config';
import { runIndexPipeline } from '../../../lib/semantic/pipeline';

/**
 * Community upload endpoint for client/admin/editor users.
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

    const { textGenerator, extrapolator, voiceMatcher } = await getVoiceFramework();

    const seedText = `${resourceTitle}. ${topic} insights for ${industry} businesses.`;
    const generatedContent = textGenerator.generateText(seedText, {
      length: 'long',
      includeExamples: true,
      includeStructure: true,
      style: 'descriptive'
    });

    const combined = `${content}\n\n${generatedContent}`;
    const communityContent = extrapolator.extrapolate(combined, {
      expansionLevel: 'moderate',
      addExamples: true,
      addDetails: true
    });

    const voiceValidation = voiceMatcher.validateVoice(communityContent);
    const voiceScore = voiceValidation.score ?? 0;

    const config = await loadPipelineConfig();

    const resources = await loadResources();

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
      status: voiceScore >= config.autoPublishThreshold ? 'published' : 'draft',
      isStarterBlock: false,
      visibility: voiceScore >= config.autoPublishThreshold ? 'public' : 'private',
      metadata: {
        wordCount: communityContent.split(/\s+/).length,
        semanticLevel: 'high',
        voiceScore
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

    const contributionType: ContributionType = 'new_upload';
    const contribution = await createContribution({
      userId: user.id,
      resourceId: resource.id,
      type: contributionType,
      status: voiceScore >= config.autoPublishThreshold ? 'accepted' : 'pending',
      payload: {
        industry,
        topic: topicSlug,
        title: resourceTitle,
        contentSnippet: content.substring(0, 200)
      },
      analysis: {
        voiceScore,
        notes: voiceScore >= 0.8 ? 'Auto-approved based on strong voice match' : 'Queued for review'
      },
      tokensAwarded: undefined
    });

    // Initial token scoring: scale by voice score and configurable multiplier
    const tokenDelta = Math.round(Math.max(0, voiceScore) * config.tokenMultiplier);
    if (tokenDelta > 0) {
      await addLedgerEntry({
        userId: user.id,
        delta: tokenDelta,
        reason: 'initial_contribution',
        resourceId: resource.id,
        contributionId: contribution.id
      });
    }

    const duration = Date.now() - startTime;
    if (import.meta.env.MODE === 'development') {
      console.log(
        `[API] POST /api/resources/community-upload - Success (${duration}ms, voiceScore=${voiceScore.toFixed(
          2
        )}, tokens=${tokenDelta})`
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
        tokensAwarded: tokenDelta,
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

