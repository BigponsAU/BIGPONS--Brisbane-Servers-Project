import type { APIRoute } from 'astro';

/** Static build: API is served by standalone-api at runtime, not prerendered. */
export function getStaticPaths() {
  return [];
}
import { requireEditor } from '../../../../utils/auth';
import { getVoiceFramework } from '../../../../utils/voice-framework';
import { loadResources, saveResources } from '../../../../lib/resources-api';
import { buildRagContext } from '../../../../lib/semantic/rag';
import { runIndexPipeline } from '../../../../lib/semantic/pipeline';
import { isDevelopmentMode } from '../../../../utils/runtime-env';
import {
  generateResourceCatalogDescription,
  resolveResourceVoiceProfile,
} from '../../../../lib/resource-voice-profile';
import { improveResourceBody } from '../../../../lib/inference/resource-improve';
import { mergeInferenceMetadata } from '../../../../lib/inference/inference-metadata';

/**
 * Improve/regenerate resource content
 * POST /api/resources/:id/improve
 */
export const POST: APIRoute = async ({ params, request }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: 'error' in authResult && authResult.code === 'FORBIDDEN' ? 403 : 401,
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
    const resource = resources.find(r => r.id === id);

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

    const { profileManager, profileBuilder, extrapolator, voiceMatcher } = await getVoiceFramework();
    const resolved = await resolveResourceVoiceProfile({
      requestedProfileId: resource.metadata?.voiceProfileId,
      profileManager,
      profileBuilder,
      resources,
    });

    const rag = await buildRagContext(resource.content.slice(0, 1500), {
      topK: 6,
      resourceId: resource.id
    });

    if (isDevelopmentMode()) {
      console.log(
        `[API] RAG improve retrievalMs=${rag.retrievalMs} model=${rag.modelId} chunks=${rag.chunkIds.length}`
      );
    }

    const improved = await improveResourceBody({
      resource,
      ragContextText: rag.contextText,
      userId: authResult.user.id,
      userRole: authResult.user.role,
      resolved,
      extrapolator,
      voiceMatcher,
    });

    const voiceValidation = voiceMatcher.validateVoice(improved.content);
    const description = generateResourceCatalogDescription({
      voiceProfile: resolved.profile,
      title: resource.title,
      industry: resource.industry,
      topicLabel: resource.topic,
      bodyExcerpt: improved.content,
    });

    const index = resources.findIndex(r => r.id === id);
    resources[index] = {
      ...resources[index],
      content: improved.content,
      description,
      version: resources[index].version + 1,
      metadata: mergeInferenceMetadata(resources[index].metadata, {
        wordCount: improved.content.split(/\s+/).length,
        voiceScore: improved.voiceScore,
        voiceProfileId: resolved.voiceProfileId ?? resources[index].metadata?.voiceProfileId,
        voiceProfileResolution: resolved.resolution,
        inferenceMode: improved.inferenceMode,
        modelId: improved.modelId,
      }) as import('../../../../lib/resource-types').Resource['metadata'],
    };

    await saveResources(resources);

    const indexed = await runIndexPipeline(resources[index]);
    resources[index] = indexed;
    await saveResources(resources);

    return new Response(
      JSON.stringify({
        resource: resources[index],
        voiceProfile: {
          resolution: resolved.resolution,
          profileId: resolved.voiceProfileId ?? null,
        },
        rag: { retrievalMs: rag.retrievalMs, chunkIds: rag.chunkIds, modelId: rag.modelId },
        inference: {
          mode: improved.inferenceMode,
          modelId: improved.modelId ?? null,
        },
        voiceValidation: {
          score: voiceValidation.score ?? improved.voiceScore,
          isValid: voiceValidation.isValid ?? improved.voiceValid,
          issues: voiceValidation.issues || [],
          strengths: voiceValidation.strengths || []
        },
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
