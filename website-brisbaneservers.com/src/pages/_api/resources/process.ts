import type { APIRoute } from 'astro';
import { VoiceMatcher } from '@voice-framework';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import { loadResources, saveResources } from '../../../lib/resources-api';
import { buildResourceFromEditorProcess } from '../../../lib/resource-ingestion';
import {
  generateResourceCatalogDescription,
  resolveResourceVoiceProfile,
} from '../../../lib/resource-voice-profile';
import { validateResourceSourceText } from '../../../lib/resource-submission-guard';
import { enhanceIngestedContent } from '../../../lib/inference/resource-ingest-inference';
import { mergeInferenceMetadata } from '../../../lib/inference/inference-metadata';
import { runIndexPipeline } from '../../../lib/semantic/pipeline';

/**
 * Process content directly (without file upload)
 * POST /api/resources/process
 * Body: { content, industry, topic, title?, autoPublish?, profileId? }
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();

  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false,
      }),
      {
        status: authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();
    const { content, industry, topic, title, autoPublish, profileId, skipEnhance } = body;

    if (!content || !industry || !topic) {
      return new Response(
        JSON.stringify({
          error: 'Content, industry, and topic are required',
          code: 'MISSING_FIELDS',
          success: false,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const sourceGuard = validateResourceSourceText(String(content));
    if (!sourceGuard.ok) {
      return new Response(
        JSON.stringify({
          error: sourceGuard.message,
          code: sourceGuard.code,
          success: false,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const resourceTitle = title || `${topic} for ${industry}`;
    const shouldPublish = autoPublish === true;

    const resources = await loadResources();
    const { profileManager, profileBuilder, extrapolator } = await getVoiceFramework();
    const resolved = await resolveResourceVoiceProfile({
      requestedProfileId: profileId,
      profileManager,
      profileBuilder,
      resources,
    });

    const voiceMatcher = new VoiceMatcher(resolved.profile);
    const bodyText = String(content);
    let finalContent = bodyText;
    let inferenceMode = 'none';
    let modelId: string | null = null;
    let voiceScore = 0;
    let voiceValid = false;

    if (skipEnhance !== true) {
      const enhanced = await enhanceIngestedContent({
        content: bodyText,
        title: resourceTitle,
        industry,
        topic,
        userId: authResult.user.id,
        userRole: authResult.user.role,
        resolved,
        extrapolator,
        voiceMatcher,
      });
      finalContent = enhanced.content;
      inferenceMode = enhanced.inferenceMode;
      modelId = enhanced.modelId ?? null;
      voiceScore = enhanced.voiceScore;
      voiceValid = enhanced.voiceValid;
    } else {
      const validation = voiceMatcher.validateVoice(bodyText);
      voiceScore = validation.score ?? 0;
      voiceValid = validation.isValid ?? false;
    }

    const voiceValidation = voiceMatcher.validateVoice(finalContent);
    const description = generateResourceCatalogDescription({
      voiceProfile: resolved.profile,
      title: resourceTitle,
      industry,
      topicLabel: topic,
      bodyExcerpt: finalContent,
    });

    const user = authResult.user;
    const resource = buildResourceFromEditorProcess({
      industry,
      topic,
      title: resourceTitle,
      body: finalContent,
      description,
      generatedBy: user.email,
      ownerId: user.id,
      shouldPublish,
      metadata: mergeInferenceMetadata(undefined, {
        wordCount: finalContent.split(/\s+/).length,
        voiceScore: voiceScore || voiceValidation.score || 0,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution,
        ...(skipEnhance !== true
          ? {
              inferenceMode: inferenceMode as 'nvidia' | 'workers-ai' | 'template',
              modelId: modelId ?? undefined,
            }
          : {}),
      }) as import('../../../lib/resource-types').Resource['metadata'],
    });

    resources.push(resource);
    await saveResources(resources);

    const indexed = await runIndexPipeline(resource);
    const ri = resources.findIndex((r) => r.id === resource.id);
    if (ri >= 0) {
      resources[ri] = indexed;
      await saveResources(resources);
    }

    const duration = Date.now() - startTime;
    console.log(`[API] POST /api/resources/process - Success (${duration}ms)`);

    return new Response(
      JSON.stringify({
        resource: indexed,
        voiceProfile: {
          resolution: resolved.resolution,
          profileId: resolved.voiceProfileId ?? null,
        },
        inference: {
          mode: inferenceMode,
          modelId,
        },
        voiceValidation: {
          score: voiceValidation.score ?? voiceScore,
          isValid: voiceValidation.isValid ?? voiceValid,
          issues: voiceValidation.issues || [],
          strengths: voiceValidation.strengths || [],
        },
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`[API] POST /api/resources/process - Error after ${duration}ms:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
